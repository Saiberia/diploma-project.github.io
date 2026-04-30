/**
 * 🧠 Nova Shop AI Engine
 * Центральный AI движок для всех интеллектуальных функций магазина
 *
 * Функции:
 * - Персонализированные рекомендации (коллаборативная и контентная фильтрация)
 * - Анализ поведения пользователей
 * - Динамическое ценообразование
 * - Прогнозирование спроса
 * - Анализ настроений (чат)
 * - Детекция фрода
 * - Умный поиск (BM25 + query expansion + раскладка)
 */

import bm25Index from './bm25Search.js';

class NovaAIEngine {
  constructor() {
    // Хранилище данных
    this.userBehavior = new Map();
    this.productStats = new Map();
    this.priceHistory = new Map();
    this.demandHistory = new Map();
    this.sessionData = new Map();
    this.orderHistory = new Map();   // userId → [{amount, ip, deviceId, ts}]
    this.ipOrderHistory = new Map(); // ip → [{userId, amount, ts}]
    this.flaggedTransactions = [];   // лог заблокированных

    // Логи AI-модулей для аналитики (circular buffer)
    this.searchLog = [];             // {query, intent, totalFound, processingMs, ts, userId}
    this.chatLog   = [];             // {message, intent, sentiment, confidence, ts, userId}
    this.recoLog   = [];             // {algorithm, alpha, count, ts, userId}
    this.LOG_LIMIT = 500;

    // Версии моделей (точность подтягивается online из evaluationService по запросу)
    this.models = {
      recommendation: { version: '2.1', algorithms: ['content-based', 'item-item-cf', 'hybrid'] },
      pricing:        { version: '2.0', factors: 7 },
      fraud:          { version: '3.0', heuristics: 6 },
      sentiment:      { version: '1.5', method: 'lexicon' },
      demand:         { version: '2.1', method: 'MA(7) + trend + holiday-aware seasonality' },
      search:         { version: '2.0', method: 'BM25 + query-expansion + intent' },
      chatbot:        { version: '1.2', method: 'TF-IDF intent classifier' }
    };

    // Кэш для быстрого доступа
    this.cache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5 минут

    this._seedDemandHistory();
  }

  // Генерируем 30 дней синтетических продаж чтобы алгоритм имел данные с первого запуска
  _seedDemandHistory() {
    const products = ['steam-100', 'steam-50', 'steam-20', 'valorant-bp', 'xbox-pass'];
    const baseDemands = { 'steam-100': 8, 'steam-50': 14, 'steam-20': 22, 'valorant-bp': 11, 'xbox-pass': 7 };
    const now = Date.now();

    for (const productId of products) {
      const base = baseDemands[productId] || 10;
      const history = [];
      for (let d = 29; d >= 0; d--) {
        const date = new Date(now - d * 86400000);
        const dayOfWeek = date.getDay();
        const weekendBoost = (dayOfWeek === 0 || dayOfWeek === 6) ? 1.25 : 1.0;
        // лёгкий восходящий тренд ~2% в неделю
        const trendBoost = 1 + ((29 - d) / 29) * 0.08;
        const noise = 0.8 + Math.random() * 0.4;
        history.push({
          date: date.toISOString().split('T')[0],
          quantity: Math.max(1, Math.round(base * weekendBoost * trendBoost * noise))
        });
      }
      this.demandHistory.set(productId, history);
    }
  }

  // ==========================================
  // 📊 АНАЛИЗ ПОВЕДЕНИЯ ПОЛЬЗОВАТЕЛЕЙ
  // ==========================================
  
  /**
   * Отслеживание действий пользователя
   */
  trackUserAction(userId, action, data) {
    const userHistory = this.userBehavior.get(userId) || {
      views: [],
      clicks: [],
      purchases: [],
      searches: [],
      cartActions: [],
      sessionDuration: 0,
      lastActive: null,
      preferences: {}
    };
    
    const timestamp = new Date();
    
    switch (action) {
      case 'view':
        userHistory.views.push({ ...data, timestamp });
        break;
      case 'click':
        userHistory.clicks.push({ ...data, timestamp });
        break;
      case 'purchase':
        userHistory.purchases.push({ ...data, timestamp });
        this.updateProductStats(data.productId, 'purchase');
        break;
      case 'search':
        userHistory.searches.push({ query: data.query, timestamp });
        break;
      case 'cart_add':
        userHistory.cartActions.push({ type: 'add', ...data, timestamp });
        break;
      case 'cart_remove':
        userHistory.cartActions.push({ type: 'remove', ...data, timestamp });
        break;
    }
    
    userHistory.lastActive = timestamp;
    this.userBehavior.set(userId, userHistory);
    
    // Обновляем предпочтения в реальном времени
    this.updateUserPreferences(userId);
    
    return { success: true, tracked: action };
  }
  
  /**
   * Обновление профиля предпочтений пользователя
   */
  updateUserPreferences(userId) {
    const history = this.userBehavior.get(userId);
    if (!history) return;
    
    const preferences = {
      favoriteCategories: {},
      priceRange: { min: Infinity, max: 0, avg: 0 },
      preferredGames: {},
      purchaseFrequency: 0,
      avgOrderValue: 0,
      loyaltyScore: 0
    };
    
    // Анализ просмотров и покупок
    [...history.views, ...history.purchases].forEach(item => {
      if (item.category) {
        preferences.favoriteCategories[item.category] = 
          (preferences.favoriteCategories[item.category] || 0) + 1;
      }
      if (item.game) {
        preferences.preferredGames[item.game] = 
          (preferences.preferredGames[item.game] || 0) + 1;
      }
      if (item.price) {
        preferences.priceRange.min = Math.min(preferences.priceRange.min, item.price);
        preferences.priceRange.max = Math.max(preferences.priceRange.max, item.price);
      }
    });
    
    // Расчёт средней стоимости заказа
    if (history.purchases.length > 0) {
      const totalSpent = history.purchases.reduce((sum, p) => sum + (p.price || 0), 0);
      preferences.avgOrderValue = totalSpent / history.purchases.length;
      preferences.purchaseFrequency = history.purchases.length;
    }
    
    // Расчёт лояльности (0-100)
    preferences.loyaltyScore = Math.min(100, 
      history.purchases.length * 10 + 
      history.views.length * 0.5 + 
      (history.lastActive ? 10 : 0)
    );
    
    history.preferences = preferences;
    this.userBehavior.set(userId, history);
  }

  /**
   * Поиск пользователей с похожим профилем (Jaccard по категориям покупок).
   * Используется в админке для секции «Похожие пользователи».
   */
  findSimilarUsers(userId, minSimilarity = 0.3, limit = 10) {
    const userHistory = this.userBehavior.get(userId);
    if (!userHistory) return [];

    const userCategories = new Set(userHistory.purchases.map(p => p.category).filter(Boolean));
    if (userCategories.size === 0) return [];

    const similarities = [];
    this.userBehavior.forEach((otherHistory, otherUserId) => {
      if (otherUserId === userId) return;
      const otherCategories = new Set(otherHistory.purchases.map(p => p.category).filter(Boolean));
      if (otherCategories.size === 0) return;

      const intersection = [...userCategories].filter(c => otherCategories.has(c)).length;
      const union = new Set([...userCategories, ...otherCategories]).size;
      const sim = union > 0 ? intersection / union : 0;
      if (sim >= minSimilarity) similarities.push([otherUserId, sim]);
    });

    return similarities.sort((a, b) => b[1] - a[1]).slice(0, limit);
  }

  // ==========================================
  // 💰 ДИНАМИЧЕСКОЕ ЦЕНООБРАЗОВАНИЕ
  // ==========================================
  //
  // Алгоритм: умножаем базовую цену на 7 независимых множителей.
  // Каждый множитель — кусочно-линейная функция от наблюдаемой переменной
  // (спрос, остаток, сезон, tier пользователя, время суток, день недели,
  // конкуренция). Итог clamp'ится в окно [0.7×base; 1.3×base], чтобы
  // никакая комбинация факторов не «улетала» за ±30% — это требование
  // здорового pricing'а в e-commerce (закон о справедливой цене + UX).
  //
  // Логика факторов прозрачно описана в _pricingBreakdown(): UI читает
  // оттуда не только число, но и текстовое объяснение, чтобы было
  // видно, почему цена изменилась.

  /**
   * Расчёт динамической цены — возвращает не только число,
   * но и пошаговый разбор: как каждый множитель повлиял на итог.
   */
  calculateDynamicPrice(productId, basePrice, context = {}) {
    const now = context.now ? new Date(context.now) : new Date();
    const {
      demand = 50,
      inventory = 100,
      userTier = 'standard',
      competition = 1.0,
      timeOfDay = now.getHours(),
      dayOfWeek = now.getDay()
    } = context;

    const breakdown = this._pricingBreakdown({
      basePrice, demand, inventory, userTier, competition, timeOfDay, dayOfWeek, date: now
    });

    // Композиция множителей (последовательное умножение)
    let running = basePrice;
    for (const step of breakdown) {
      const before = running;
      running = running * step.multiplier;
      step.priceBefore = Math.round(before);
      step.priceAfter  = Math.round(running);
      step.delta       = Math.round(running - before);
    }

    // ±30% capping
    const minPrice = basePrice * 0.7;
    const maxPrice = basePrice * 1.3;
    const cappedRaw = Math.max(minPrice, Math.min(maxPrice, running));
    const wasCapped = Math.abs(cappedRaw - running) > 0.5;
    const dynamicPrice = Math.round(cappedRaw);

    const factors = Object.fromEntries(
      breakdown.map(s => [s.key, Math.round(s.multiplier * 100)])
    );

    this.savePriceHistory(productId, basePrice, dynamicPrice, factors);

    return {
      productId,
      basePrice,
      dynamicPrice,
      discount: basePrice > dynamicPrice
        ? Math.round((1 - dynamicPrice / basePrice) * 100)
        : 0,
      surcharge: dynamicPrice > basePrice
        ? Math.round((dynamicPrice / basePrice - 1) * 100)
        : 0,
      factors,
      breakdown,            // пошаговое объяснение для UI
      capping: {
        applied: wasCapped,
        floor:   Math.round(minPrice),
        ceiling: Math.round(maxPrice),
        rawPrice: Math.round(running)
      },
      context: { demand, inventory, userTier, competition, timeOfDay, dayOfWeek },
      validUntil: new Date(Date.now() + 30 * 60 * 1000),
      reason: this._pricingReason(breakdown, basePrice, dynamicPrice)
    };
  }

  /**
   * Возвращает массив шагов с понятным описанием — это и есть
   * «как работает под капотом», только машино-читаемое.
   */
  _pricingBreakdown({ basePrice, demand, inventory, userTier, competition, timeOfDay, dayOfWeek, date }) {
    return [
      this._stepDemand(demand),
      this._stepInventory(inventory),
      this._stepSeasonal(date),
      this._stepUserTier(userTier),
      this._stepTimeOfDay(timeOfDay),
      this._stepWeekend(dayOfWeek),
      this._stepCompetition(competition)
    ];
  }

  _stepDemand(demand) {
    let multiplier, label;
    if (demand > 80)      { multiplier = 1.15; label = 'ажиотаж — наценка +15%'; }
    else if (demand > 60) { multiplier = 1.08; label = 'высокий спрос — +8%'; }
    else if (demand > 40) { multiplier = 1.00; label = 'нормальный спрос — без изменений'; }
    else if (demand > 20) { multiplier = 0.95; label = 'низкий спрос — скидка 5%'; }
    else                  { multiplier = 0.90; label = 'почти нет интереса — скидка 10%'; }
    return {
      key: 'demand',
      title: 'Спрос',
      icon: '📈',
      input: `${demand}/100`,
      multiplier,
      label,
      formula: 'demand>80→×1.15 · 60→×1.08 · 40→×1.00 · 20→×0.95 · ≤20→×0.90'
    };
  }

  _stepInventory(inventory) {
    let multiplier, label;
    if (inventory > 500)     { multiplier = 0.92; label = 'много на складе — стимулируем продажу −8%'; }
    else if (inventory > 100){ multiplier = 0.97; label = 'избыточный запас — −3%'; }
    else if (inventory > 20) { multiplier = 1.00; label = 'нормальный запас — без изменений'; }
    else if (inventory > 5)  { multiplier = 1.08; label = 'мало на складе — премия дефицита +8%'; }
    else                     { multiplier = 1.15; label = 'почти нет товара — наценка дефицита +15%'; }
    return {
      key: 'inventory',
      title: 'Остаток на складе',
      icon: '📦',
      input: `${inventory} шт.`,
      multiplier,
      label,
      formula: 'stock>500→×0.92 · 100→×0.97 · 20→×1.00 · 5→×1.08 · ≤5→×1.15'
    };
  }

  _stepSeasonal(date) {
    const info = this._holidayInfo(date);
    return {
      key: 'seasonal',
      title: 'Сезон/праздник',
      icon: info.icon || '🗓',
      input: info.name,
      multiplier: info.priceMultiplier,
      label: info.priceLabel,
      formula: 'NY +20% · BlackFri +18% · 23.02/8.03 +8% · лето +5% · обычный день ×1.00'
    };
  }

  _stepUserTier(tier) {
    const map = {
      vip:      { m: 0.85, l: 'VIP клиент — −15%' },
      platinum: { m: 0.88, l: 'Platinum — −12%' },
      gold:     { m: 0.92, l: 'Gold — −8%' },
      silver:   { m: 0.95, l: 'Silver — −5%' },
      standard: { m: 1.00, l: 'Стандартный аккаунт — без скидки' }
    };
    const r = map[tier] || map.standard;
    return {
      key: 'userTier',
      title: 'Лояльность клиента',
      icon: '👤',
      input: tier,
      multiplier: r.m,
      label: r.l,
      formula: 'vip×0.85 · platinum×0.88 · gold×0.92 · silver×0.95 · standard×1.00'
    };
  }

  _stepTimeOfDay(hour) {
    let multiplier, label;
    if (hour >= 18 && hour <= 23) { multiplier = 1.03; label = 'вечерний пик активности — +3%'; }
    else if (hour >= 0 && hour < 6){ multiplier = 0.95; label = 'ночной тариф — −5%'; }
    else                          { multiplier = 1.00; label = 'обычное время — без изменений'; }
    return {
      key: 'timeOfDay',
      title: 'Время суток',
      icon: '🕒',
      input: `${String(hour).padStart(2, '0')}:00`,
      multiplier,
      label,
      formula: '18-23→×1.03 · 0-6→×0.95 · иначе ×1.00'
    };
  }

  _stepWeekend(day) {
    const isWeekend = day === 5 || day === 6 || day === 0;
    const dayName = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'][day];
    return {
      key: 'weekend',
      title: 'День недели',
      icon: '📅',
      input: dayName,
      multiplier: isWeekend ? 1.05 : 1.00,
      label: isWeekend ? 'выходной/пятница — +5% (геймеры активнее)' : 'будни — без изменений',
      formula: 'Пт/Сб/Вс→×1.05 · иначе ×1.00'
    };
  }

  _stepCompetition(competition) {
    return {
      key: 'competition',
      title: 'Конкуренты',
      icon: '⚖️',
      input: `×${competition.toFixed(2)}`,
      multiplier: competition,
      label: competition < 1
        ? `у конкурентов дешевле — подстраиваемся ×${competition.toFixed(2)}`
        : competition > 1
          ? `у конкурентов дороже — можно поднять ×${competition.toFixed(2)}`
          : 'паритет — без изменений',
      formula: 'price × competitionRatio (1.0 = паритет)'
    };
  }

  _pricingReason(breakdown, basePrice, dynamicPrice) {
    const significant = breakdown
      .map(s => ({ ...s, abs: Math.abs(s.multiplier - 1) }))
      .filter(s => s.abs > 0.01)
      .sort((a, b) => b.abs - a.abs);

    if (dynamicPrice < basePrice) {
      const top = significant.find(s => s.multiplier < 1);
      return top ? `Цена снижена: ${top.label}` : 'Персональная скидка';
    }
    if (dynamicPrice > basePrice) {
      const top = significant.find(s => s.multiplier > 1);
      return top ? `Цена повышена: ${top.label}` : 'Актуальная цена';
    }
    return 'Множители скомпенсировались — стандартная цена';
  }

  /**
   * Контекст реального товара: реальный остаток + расчётный demand
   * из последних 7 дней истории продаж.
   * Используется в UI «Калькулятор», чтобы показать, что цифры — не из воздуха.
   */
  getPricingContext(productId, productsCatalog = []) {
    const product = productsCatalog.find(p => String(p.id) === String(productId));
    const inventory = product?.stock ?? 100;

    const history = this.demandHistory.get(String(productId)) || this.demandHistory.get(productId) || [];
    const last7 = history.slice(-7);
    const avg7 = last7.length
      ? last7.reduce((s, d) => s + (d.quantity || 0), 0) / last7.length
      : null;

    let demandScore = 50;
    let demandSource = 'default (нет истории продаж)';
    if (avg7 != null) {
      // Маппим 0-30 продаж/день в 0-100 уровень спроса
      demandScore = Math.max(0, Math.min(100, Math.round((avg7 / 30) * 100)));
      demandSource = `avg7 = ${avg7.toFixed(1)} продаж/день → demand ${demandScore}/100`;
    }

    return {
      productId,
      productName: product?.name || null,
      basePrice: product?.price ?? null,
      inventory,
      inventorySource: product
        ? `products.stock = ${inventory}`
        : 'товар не найден в каталоге, fallback 100',
      demand: demandScore,
      demandSource,
      historyDays: history.length,
      last7Days: last7,
      now: new Date().toISOString(),
      hour: new Date().getHours(),
      dayOfWeek: new Date().getDay()
    };
  }

  savePriceHistory(productId, basePrice, dynamicPrice, factors) {
    const history = this.priceHistory.get(productId) || [];
    history.push({
      timestamp: new Date(),
      basePrice,
      dynamicPrice,
      factors
    });
    if (history.length > 100) history.shift();
    this.priceHistory.set(productId, history);
  }

  // ==========================================
  // 🗓 КАЛЕНДАРЬ ПРАЗДНИКОВ И СЕЗОННОСТЬ
  // ==========================================
  //
  // Используется и в pricing (через _stepSeasonal), и в demand-forecast.
  // Возвращает для произвольной даты: имя праздника/сезона, множитель цены
  // и множитель спроса. Это даёт прозрачную связь «дата → решение».

  _holidayInfo(date) {
    const d = (date instanceof Date) ? date : new Date(date);
    const m = d.getMonth() + 1;        // 1-12
    const day = d.getDate();           // 1-31

    const event = this._matchEvent(m, day, d);
    if (event) {
      return { ...event, kind: 'event', isHoliday: true };
    }

    // Fallback — месячная сезонность (общий тренд, не конкретный праздник)
    const ms = this._monthSeason(m);
    return { ...ms, kind: 'season', isHoliday: false };
  }

  _matchEvent(m, day, d) {
    if (m === 1 && day <= 8) {
      return { name: 'Новогодние каникулы', icon: '🎄',
        priceMultiplier: 1.20, priceLabel: 'НГ-каникулы — +20% (пик гейминга)',
        demandMultiplier: 1.55 };
    }
    if (m === 12 && day >= 25) {
      return { name: 'Канун Нового года', icon: '🎁',
        priceMultiplier: 1.18, priceLabel: 'Канун НГ — +18%',
        demandMultiplier: 1.45 };
    }
    if (m === 12 && day >= 18) {
      return { name: 'Steam Winter Sale', icon: '❄️',
        priceMultiplier: 1.10, priceLabel: 'Зимняя распродажа — +10%',
        demandMultiplier: 1.35 };
    }
    if (m === 11 && this._isBlackFriday(d)) {
      return { name: 'Чёрная пятница', icon: '🛍️',
        priceMultiplier: 1.18, priceLabel: 'Black Friday — +18%',
        demandMultiplier: 1.50 };
    }
    if (m === 11 && day >= 20) {
      return { name: 'Pre-BlackFriday', icon: '🛒',
        priceMultiplier: 1.08, priceLabel: 'Перед Чёрной пятницей — +8%',
        demandMultiplier: 1.20 };
    }
    if (m === 2 && day === 14) {
      return { name: 'День святого Валентина', icon: '💝',
        priceMultiplier: 1.05, priceLabel: 'Валентинов день — +5%',
        demandMultiplier: 1.10 };
    }
    if (m === 2 && (day === 22 || day === 23 || day === 24)) {
      return { name: 'День защитника Отечества', icon: '🎖',
        priceMultiplier: 1.08, priceLabel: '23 февраля — +8%',
        demandMultiplier: 1.20 };
    }
    if (m === 3 && (day === 7 || day === 8 || day === 9)) {
      return { name: 'Международный женский день', icon: '🌷',
        priceMultiplier: 1.08, priceLabel: '8 марта — +8%',
        demandMultiplier: 1.18 };
    }
    if (m === 5 && day >= 1 && day <= 3) {
      return { name: 'Майские праздники', icon: '🌿',
        priceMultiplier: 1.05, priceLabel: 'Майские — +5%',
        demandMultiplier: 1.15 };
    }
    if (m === 5 && (day === 8 || day === 9 || day === 10)) {
      return { name: 'День Победы', icon: '🎗',
        priceMultiplier: 1.05, priceLabel: '9 мая — +5%',
        demandMultiplier: 1.12 };
    }
    if (m === 6 && (day === 11 || day === 12 || day === 13)) {
      return { name: 'День России', icon: '🇷🇺',
        priceMultiplier: 1.05, priceLabel: '12 июня — +5%',
        demandMultiplier: 1.10 };
    }
    if ((m === 6 && day >= 22) || (m === 7 && day <= 5)) {
      return { name: 'Steam Summer Sale', icon: '☀️',
        priceMultiplier: 1.10, priceLabel: 'Летняя распродажа — +10%',
        demandMultiplier: 1.30 };
    }
    return null;
  }

  _monthSeason(m) {
    if (m === 12) return { name: 'Декабрь',     icon: '🗓', priceMultiplier: 1.08, priceLabel: 'предновогодний месяц — +8%', demandMultiplier: 1.20 };
    if (m === 11) return { name: 'Ноябрь',      icon: '🗓', priceMultiplier: 1.05, priceLabel: 'ноябрь — +5%',                demandMultiplier: 1.10 };
    if (m === 1)  return { name: 'Январь',      icon: '🗓', priceMultiplier: 1.02, priceLabel: 'после праздников — +2%',      demandMultiplier: 1.05 };
    if (m >= 6 && m <= 8) return { name: 'Лето', icon: '☀️', priceMultiplier: 1.05, priceLabel: 'летний сезон — +5%',         demandMultiplier: 1.08 };
    if (m === 9 || m === 10) return { name: 'Осень', icon: '🍂', priceMultiplier: 1.00, priceLabel: 'осень — без изменений',  demandMultiplier: 0.95 };
    return { name: 'Обычный месяц', icon: '🗓', priceMultiplier: 1.00, priceLabel: 'обычный день — без изменений', demandMultiplier: 1.00 };
  }

  /** Чёрная пятница = 4-я пятница ноября в РФ-практике (после Thanksgiving) */
  _isBlackFriday(date) {
    if (date.getMonth() !== 10) return false; // только ноябрь
    if (date.getDay() !== 5) return false;    // только пятница
    const d = date.getDate();
    return d >= 22 && d <= 28;                // 4-я пятница: 22-28 ноября
  }

  /**
   * Календарь конкретных событий-праздников на N дней вперёд — для UI прогноза.
   * Месячные fallback'и (Лето, Декабрь и т.д.) сюда не попадают —
   * они применяются автоматически как фоновый коэффициент.
   */
  getHolidayCalendar(days = 14, startDate = new Date()) {
    const result = [];
    const start = new Date(startDate);
    for (let i = 0; i < days; i++) {
      const d = new Date(start.getTime() + i * 86400000);
      const info = this._holidayInfo(d);
      if (info.isHoliday) {
        result.push({
          date: d.toISOString().split('T')[0],
          name: info.name,
          icon: info.icon,
          priceMultiplier: info.priceMultiplier,
          demandMultiplier: info.demandMultiplier
        });
      }
    }
    return result;
  }


  // ==========================================
  // 📈 ПРОГНОЗИРОВАНИЕ СПРОСА
  // ==========================================

  /**
   * Записывает факт продажи — источник правды для прогноза
   */
  recordSale(productId, quantity = 1, date = new Date()) {
    const history = this.demandHistory.get(productId) || [];
    const dateStr = (date instanceof Date ? date : new Date(date)).toISOString().split('T')[0];
    const existing = history.find(e => e.date === dateStr);
    if (existing) {
      existing.quantity += quantity;
    } else {
      history.push({ date: dateStr, quantity });
      // держим не больше 90 дней, старое неважно
      if (history.length > 90) history.splice(0, history.length - 90);
    }
    this.demandHistory.set(productId, history);
  }

  /**
   * Прогноз спроса:
   *   forecast[d] = avg7 × trend × weekday[d] × holiday[d]
   *
   * Где:
   *   • avg7        — 7-дневное скользящее среднее продаж (база)
   *   • trend       — отношение последних 7 vs предыдущих 7 дней (учёт восходящей/падающей динамики)
   *   • weekday[d]  — мультипликатор по дню недели:
   *                    Пт×1.10, Сб×1.25, Вс×1.20, остальные ×1.00
   *                    (геймеры активнее в выходные, но Пт это уже «пред-уикенд»)
   *   • holiday[d]  — мультипликатор по календарю праздников
   *                    (НГ ×1.55, BlackFri ×1.50, 23.02/8.03 ×1.20, и т.п.)
   *
   * Каждая точка прогноза возвращает:
   *   - predictedDemand  — итоговое число (1 = минимум)
   *   - confidence       — 0..1 (падает с расстоянием прогноза и нехваткой данных)
   *   - lower/upperBound — доверительный интервал
   *   - factors          — объяснение, почему именно столько
   */
  forecastDemand(productId, historicalData = [], days = 7) {
    const productHistory = this.demandHistory.get(productId) || [];
    const merged = [...productHistory];
    for (const ext of historicalData) {
      const dateStr = ext.date || new Date().toISOString().split('T')[0];
      const idx = merged.findIndex(e => e.date === dateStr);
      if (idx >= 0) merged[idx].quantity += (ext.quantity || 0);
      else merged.push({ date: dateStr, quantity: ext.quantity || 0 });
    }
    merged.sort((a, b) => a.date.localeCompare(b.date));

    const window7 = merged.slice(-7);
    const avg7 = window7.length > 0
      ? window7.reduce((s, d) => s + (d.quantity || 0), 0) / window7.length
      : 10;

    const trendMultiplier = this._calcTrend(merged);

    const forecast = [];
    const now = new Date();
    const dataFactor = Math.min(1, merged.length / 14);

    for (let i = 0; i < days; i++) {
      const forecastDate = new Date(now.getTime() + i * 86400000);
      const dayOfWeek = forecastDate.getDay();
      const weekdayMul = this._weekdayDemandMultiplier(dayOfWeek);
      const holiday    = this._holidayInfo(forecastDate);

      const baseForDay = avg7 * trendMultiplier * weekdayMul * holiday.demandMultiplier;
      const predicted  = Math.max(1, Math.round(baseForDay));

      const confidence = parseFloat(Math.max(0.5, (0.95 - i * 0.04) * dataFactor).toFixed(2));

      forecast.push({
        date: forecastDate.toISOString().split('T')[0],
        dayName: ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'][dayOfWeek],
        predictedDemand: predicted,
        confidence,
        lowerBound: Math.round(predicted * (2 - confidence)),
        upperBound: Math.round(predicted * (1 + (1 - confidence) + 0.15)),
        factors: {
          base: parseFloat(avg7.toFixed(1)),
          trend: parseFloat(trendMultiplier.toFixed(2)),
          weekday: parseFloat(weekdayMul.toFixed(2)),
          holiday: parseFloat(holiday.demandMultiplier.toFixed(2))
        },
        holiday: holiday.isHoliday
          ? { name: holiday.name, icon: holiday.icon, multiplier: holiday.demandMultiplier }
          : null,
        season: !holiday.isHoliday && holiday.demandMultiplier !== 1.0
          ? { name: holiday.name, icon: holiday.icon, multiplier: holiday.demandMultiplier }
          : null,
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6
      });
    }

    const peakDay = forecast.reduce((max, f) => f.predictedDemand > max.predictedDemand ? f : max, forecast[0]);
    const totalPredicted = forecast.reduce((sum, f) => sum + f.predictedDemand, 0);
    const avgDaily = forecast.length ? totalPredicted / forecast.length : 0;

    return {
      productId,
      dataPoints: merged.length,
      historyTail: merged.slice(-14),    // последние 14 дней истории — для UI «откуда avg»
      forecast,
      method: 'MA(7) × trend × weekday × holiday',
      summary: {
        totalPredicted,
        avgDaily: Math.round(avgDaily),
        avg7DaySales: parseFloat(avg7.toFixed(1)),
        trend: trendMultiplier > 1.05 ? 'rising' : trendMultiplier < 0.95 ? 'falling' : 'stable',
        trendValue: parseFloat(trendMultiplier.toFixed(2)),
        peakDay,
        recommendation: this.getDemandRecommendation(avg7, trendMultiplier, forecast)
      },
      holidays: forecast.filter(f => f.holiday).map(f => ({
        date: f.date, dayName: f.dayName, ...f.holiday
      }))
    };
  }

  _weekdayDemandMultiplier(dow) {
    // 0=Вс, 1=Пн, ..., 6=Сб
    switch (dow) {
      case 5: return 1.10; // Пятница — пред-уикенд
      case 6: return 1.25; // Суббота — пик
      case 0: return 1.20; // Воскресенье
      default: return 1.00;
    }
  }

  _calcTrend(data) {
    if (data.length < 8) return 1.0;
    const recent = data.slice(-7).reduce((s, d) => s + (d.quantity || 0), 0) / 7;
    const older = data.slice(-14, -7).reduce((s, d) => s + (d.quantity || 0), 0) / 7;
    if (older === 0) return 1.0;
    return Math.min(2.0, Math.max(0.3, recent / older));
  }

  getDemandRecommendation(avg7, trend, forecast = []) {
    const peakHoliday = forecast.find(f => f.holiday && f.holiday.multiplier > 1.3);
    if (peakHoliday) {
      return `${peakHoliday.holiday.name} (${peakHoliday.date}) — пик ×${peakHoliday.holiday.multiplier.toFixed(2)}, увеличьте запас заранее`;
    }
    if (trend > 1.2) return 'Спрос растёт — рассмотрите увеличение запасов';
    if (trend < 0.8) return 'Спрос падает — рассмотрите скидки';
    if (avg7 > 50) return 'Стабильно высокий спрос';
    return 'Нормальный уровень спроса';
  }

  // ==========================================
  // 🔍 УМНЫЙ ПОИСК (NLP)
  // ==========================================
  
  /**
   * Умный поиск с пониманием намерений
   */
  smartSearch(query, products, options = {}) {
    const normalizedQuery = this.normalizeQuery(query);
    const intent          = this.detectSearchIntent(normalizedQuery);
    const expandedTerms   = this.expandSearchTerms(normalizedQuery);

    // Из расширенных фраз собираем токены для BM25.
    // expandedTerms содержит и фразы ('grand theft auto'), и слова — всё токенизируется
    // одним токенайзером.
    const queryTokens = new Set();
    for (const term of expandedTerms) {
      bm25Index.tokenize(term).forEach(t => queryTokens.add(t));
    }

    let results = bm25Index.search(
      [...queryTokens],
      products,
      { limit: 200, minScore: 0.01 }
    );

    // Поверх BM25 — небольшие бонусы по intent (cheap/popular/new).
    // Они не должны доминировать, поэтому коэффициенты подобраны как доли от BM25.
    if (results.length) {
      const maxBm = results[0].bm25Score || 1;
      results = results.map(p => {
        let bonus = 0;
        if (intent === 'cheap'   && p.price < 500)                     bonus += 0.20 * maxBm;
        if (intent === 'popular' && (p.badge === 'popular' || p.badge === 'hit')) bonus += 0.20 * maxBm;
        if (intent === 'new'     && p.badge === 'new')                 bonus += 0.25 * maxBm;
        const finalScore = p.bm25Score + bonus;
        return { ...p, searchScore: parseFloat(finalScore.toFixed(4)) };
      }).sort((a, b) => b.searchScore - a.searchScore);
    }

    return {
      query,
      normalizedQuery,
      intent,
      expandedTerms,
      results: results.slice(0, options.limit || 20),
      totalFound: results.length,
      algorithm: 'bm25',
      suggestions: this.getSearchSuggestions(normalizedQuery, products)
    };
  }
  
  normalizeQuery(query) {
    return query
      .toLowerCase()
      .replace(/ё/g, 'е')
      .replace(/[^\w\sа-яa-z0-9-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
  
  detectSearchIntent(query) {
    const intents = {
      buy: ['купить', 'заказать', 'хочу', 'надо', 'нужно'],
      cheap: ['дешево', 'недорого', 'скидка', 'акция', 'распродажа'],
      popular: ['популярные', 'лучшие', 'топ', 'хит'],
      new: ['новинки', 'новые', 'свежие']
    };
    
    for (const [intent, keywords] of Object.entries(intents)) {
      if (keywords.some(k => query.includes(k))) {
        return intent;
      }
    }
    return 'browse';
  }
  
  expandSearchTerms(query) {
    // Полный список алиасов, включая названия игр на русском
    const synonyms = {
      'стим': ['steam', 'пополнение'],
      'кс': ['cs2', 'cs', 'counter-strike'],
      'кс2': ['cs2'],
      'ксго': ['cs2', 'csgo'],
      'контра': ['cs2', 'counter-strike'],
      'форт': ['fortnite', 'v-bucks'],
      'фортнайт': ['fortnite', 'v-bucks'],
      'вбакс': ['v-bucks', 'fortnite'],
      'вибаксы': ['v-bucks'],
      'роблокс': ['roblox', 'robux'],
      'робаксы': ['robux'],
      'робуксы': ['robux'],
      'геншин': ['genshin', 'кристаллы'],
      'валорант': ['valorant'],
      'валик': ['valorant'],
      'дота': ['dota'],
      'дотка': ['dota'],
      'элден': ['elden', 'ring'],
      'элденринг': ['elden ring'],
      'балдур': ["baldur's gate", 'baldur', 'bg3'],
      'бг3': ["baldur's gate 3"],
      'ведьмак': ['witcher', 'wild hunt'],
      'ведьмака': ['witcher'],
      'киберпанк': ['cyberpunk', '2077'],
      'кибер': ['cyberpunk'],
      'гта': ['gta', 'grand theft auto'],
      'гта5': ['gta', 'premium'],
      'рдр': ['red dead', 'redemption'],
      'рдр2': ['red dead redemption 2'],
      'хогвартс': ['hogwarts', 'legacy'],
      'старфилд': ['starfield'],
      'апекс': ['apex'],
      'лол': ['league of legends', 'lol'],
      'лига': ['league of legends'],
      'мл': ['mobile legends'],
      'бравл': ['brawl stars'],
      'пабг': ['pubg'],
      'пубг': ['pubg'],
      'майнкрафт': ['minecraft'],
      'майн': ['minecraft'],
      'хонкай': ['honkai', 'star rail'],
      'хср': ['honkai star rail'],
      'геймпасс': ['game pass', 'xbox'],
      'гейм пасс': ['game pass', 'xbox'],
      'подписка': ['game pass', 'ea play'],
      'телеграм старс': ['telegram stars'],
      'тг старс': ['telegram stars'],
      'звёзды': ['telegram stars'],
      'звезды': ['telegram stars']
    };

    const expanded = new Set();
    // Полный запрос целиком
    expanded.add(query);
    // Слова
    const words = query.split(' ').filter(Boolean);
    words.forEach(w => expanded.add(w));

    // Алиасы: ищем ключи как подстроку в полном запросе ИЛИ в слове
    for (const [key, values] of Object.entries(synonyms)) {
      if (query.includes(key) || words.some(w => w === key || (key.length >= 4 && w.includes(key)))) {
        values.forEach(v => expanded.add(v));
      }
    }

    // Перевод раскладки (если юзер перепутал EN/RU)
    const swapped = this.swapKeyboardLayout(query);
    if (swapped && swapped !== query) {
      expanded.add(swapped);
      swapped.split(' ').forEach(w => { if (w) expanded.add(w); });
      for (const [key, values] of Object.entries(synonyms)) {
        if (swapped.includes(key)) values.forEach(v => expanded.add(v));
      }
    }

    return Array.from(expanded);
  }

  swapKeyboardLayout(str) {
    if (!str) return null;
    const EN_TO_RU = {
      q: 'й', w: 'ц', e: 'у', r: 'к', t: 'е', y: 'н', u: 'г', i: 'ш', o: 'щ', p: 'з',
      '[': 'х', ']': 'ъ', a: 'ф', s: 'ы', d: 'в', f: 'а', g: 'п', h: 'р', j: 'о',
      k: 'л', l: 'д', ';': 'ж', "'": 'э', z: 'я', x: 'ч', c: 'с', v: 'м', b: 'и',
      n: 'т', m: 'ь', ',': 'б', '.': 'ю'
    };
    const RU_TO_EN = Object.fromEntries(Object.entries(EN_TO_RU).map(([e, r]) => [r, e]));

    const hasRu = /[а-я]/i.test(str);
    const hasEn = /[a-z]/i.test(str);
    if (hasRu && hasEn) return null;

    if (hasEn) {
      const out = str.split('').map(c => EN_TO_RU[c] || c).join('');
      return /[а-я]/i.test(out) ? out : null;
    }
    if (hasRu) {
      const out = str.split('').map(c => RU_TO_EN[c] || c).join('');
      return /[a-z]/i.test(out) ? out : null;
    }
    return null;
  }
  
  getSearchSuggestions(query, products) {
    const suggestions = [];
    const categories = new Set(products.map(p => p.category));
    
    categories.forEach(cat => {
      if (cat && cat.includes(query.slice(0, 3))) {
        suggestions.push(`Товары в категории ${cat}`);
      }
    });
    
    return suggestions.slice(0, 3);
  }

  // ==========================================
  // 🛡️ ДЕТЕКЦИЯ ФРОДА
  // ==========================================
  
  /**
   * Записывает совершённый заказ в историю для будущих проверок
   */
  recordOrder(userId, amount, ipAddress = 'unknown', deviceId = 'unknown') {
    const ts = Date.now();
    const entry = { amount, ip: ipAddress, deviceId, ts };

    const userOrders = this.orderHistory.get(userId) || [];
    userOrders.push(entry);
    // храним последние 200 заказов на пользователя
    if (userOrders.length > 200) userOrders.splice(0, userOrders.length - 200);
    this.orderHistory.set(userId, userOrders);

    const ipOrders = this.ipOrderHistory.get(ipAddress) || [];
    ipOrders.push({ userId, amount, ts });
    if (ipOrders.length > 500) ipOrders.splice(0, ipOrders.length - 500);
    this.ipOrderHistory.set(ipAddress, ipOrders);
  }

  /**
   * Проверка транзакции на фрод — реальные эвристики
   */
  detectFraud(transaction) {
    const { userId, amount, ipAddress = 'unknown', deviceId = 'unknown' } = transaction;
    const now = Date.now();
    const triggers = [];
    let riskScore = 0;

    const userOrders = this.orderHistory.get(userId) || [];
    const ipOrders   = this.ipOrderHistory.get(ipAddress) || [];

    // 1. Velocity по userId: >3 заказа за последние 10 минут → тест карты
    const per10min = userOrders.filter(o => now - o.ts < 10 * 60 * 1000);
    if (per10min.length >= 3) {
      riskScore += 35;
      triggers.push(`velocity_user: ${per10min.length} orders in 10 min`);
    }

    // 2. Velocity по IP: >5 заказов за час с одного IP → скоординированная атака
    const ipPer1h = ipOrders.filter(o => now - o.ts < 60 * 60 * 1000);
    if (ipPer1h.length >= 5) {
      riskScore += 30;
      triggers.push(`velocity_ip: ${ipPer1h.length} orders in 1h from ${ipAddress}`);
    }

    // 3. Аномальная сумма: >5x от среднего пользователя (нужно ≥3 заказов в истории)
    if (userOrders.length >= 3) {
      const avgAmount = userOrders.reduce((s, o) => s + o.amount, 0) / userOrders.length;
      if (amount > avgAmount * 5) {
        riskScore += 25;
        triggers.push(`amount_anomaly: $${amount} vs avg $${avgAmount.toFixed(2)}`);
      }
    }

    // 4. Новый пользователь + крупная сумма (>$100 и нет истории)
    if (userOrders.length === 0 && amount > 100) {
      riskScore += 20;
      triggers.push(`new_user_large_amount: $${amount}`);
    }

    // 5. Ночное время 2:00–5:00 по UTC (статистически аномальное)
    const hour = new Date(now).getUTCHours();
    if (hour >= 2 && hour < 5) {
      riskScore += 15;
      triggers.push(`night_time: ${hour}:00 UTC`);
    }

    // 6. Паттерн тест-карты: ≥3 заказа <$10 за последние 30 минут
    const smallRecent = userOrders.filter(o => now - o.ts < 30 * 60 * 1000 && o.amount < 10);
    if (smallRecent.length >= 3) {
      riskScore += 30;
      triggers.push(`card_testing: ${smallRecent.length} micro-orders <$10 in 30 min`);
    }

    riskScore = Math.min(100, riskScore);
    const riskLevel = riskScore < 25 ? 'low' : riskScore < 55 ? 'medium' : 'high';
    const blocked = riskScore >= 55;

    const result = {
      transactionId: `txn_${now}_${Math.random().toString(36).slice(2, 7)}`,
      blocked,
      riskScore,
      riskLevel,
      triggers,
      requiresVerification: riskScore >= 35 && !blocked,
      recommendation: this._fraudRecommendation(riskScore),
      checkedAt: new Date(now).toISOString()
    };

    if (blocked) {
      this.flaggedTransactions.push({ ...result, userId, amount, ipAddress });
      // держим лог последних 1000
      if (this.flaggedTransactions.length > 1000) this.flaggedTransactions.shift();
    }

    return result;
  }

  getFlaggedTransactions(limit = 50) {
    return this.flaggedTransactions.slice(-limit).reverse();
  }

  _fraudRecommendation(score) {
    if (score >= 55) return 'Транзакция заблокирована — уведомите службу безопасности';
    if (score >= 35) return 'Требуется верификация по SMS/Email';
    if (score >= 15) return 'Мониторинг — транзакция помечена';
    return 'Транзакция безопасна';
  }

  // ==========================================
  // 💬 АНАЛИЗ НАСТРОЕНИЙ
  // ==========================================
  
  /**
   * Анализ настроения сообщения
   */
  analyzeSentiment(text) {
    const normalized = text.toLowerCase();
    
    const positiveWords = ['спасибо', 'отлично', 'супер', 'круто', 'класс', 'молодцы', 'хорошо', 'быстро', 'доволен'];
    const negativeWords = ['плохо', 'ужас', 'отвратительно', 'медленно', 'обман', 'мошенники', 'проблема', 'ошибка', 'не работает'];
    
    let positiveScore = 0;
    let negativeScore = 0;
    
    positiveWords.forEach(word => {
      if (normalized.includes(word)) positiveScore++;
    });
    
    negativeWords.forEach(word => {
      if (normalized.includes(word)) negativeScore++;
    });
    
    const total = positiveScore + negativeScore;
    
    if (total === 0) return { sentiment: 'neutral', score: 0.5 };
    
    const score = positiveScore / total;
    const sentiment = score > 0.6 ? 'positive' : score < 0.4 ? 'negative' : 'neutral';
    
    return {
      sentiment,
      score,
      positiveScore,
      negativeScore,
      suggestedResponse: this.getSuggestedResponse(sentiment)
    };
  }
  
  getSuggestedResponse(sentiment) {
    switch (sentiment) {
      case 'positive':
        return 'Благодарим за положительный отзыв! Рады что вам понравилось 😊';
      case 'negative':
        return 'Приносим извинения за неудобства. Наш специалист свяжется с вами для решения проблемы.';
      default:
        return 'Спасибо за обращение! Чем можем помочь?';
    }
  }

  // ==========================================
  // 📊 АНАЛИТИКА
  // ==========================================
  
  /**
   * Получение AI аналитики
   */
  getAnalytics() {
    return {
      totalUsers: this.userBehavior.size,
      activeUsers: Array.from(this.userBehavior.values())
        .filter(u => {
          const hourAgo = Date.now() - 60 * 60 * 1000;
          return u.lastActive && new Date(u.lastActive).getTime() > hourAgo;
        }).length,
      totalTrackedActions: Array.from(this.userBehavior.values())
        .reduce((sum, u) => sum + u.views.length + u.purchases.length, 0),
      models: this.models,
      cacheSize: this.cache.size,
      logs: {
        search: this.searchLog.length,
        chat:   this.chatLog.length,
        reco:   this.recoLog.length,
        flaggedTransactions: this.flaggedTransactions.length
      },
      timestamp: new Date()
    };
  }

  // ==========================================
  // 📝 ЛОГИ AI-МОДУЛЕЙ
  // ==========================================

  _pushLog(buffer, entry) {
    buffer.push({ ...entry, ts: Date.now() });
    if (buffer.length > this.LOG_LIMIT) buffer.shift();
  }

  logSearch({ query, intent, totalFound, processingMs, userId = 'anon' }) {
    this._pushLog(this.searchLog, { query, intent, totalFound, processingMs, userId });
  }

  logChat({ message, intent, sentiment, confidence, userId = 'anon' }) {
    this._pushLog(this.chatLog, { message, intent, sentiment, confidence, userId });
  }

  logReco({ algorithm, alpha, count, userId = 'anon' }) {
    this._pushLog(this.recoLog, { algorithm, alpha, count, userId });
  }

  /**
   * Агрегаты по поисковому логу для админки.
   */
  getSearchAnalytics() {
    const total = this.searchLog.length;
    if (!total) {
      return { total: 0, topQueries: [], zeroResultQueries: [], intents: {}, avgProcessingMs: 0, recent: [] };
    }

    const queryCount = new Map();
    const zeroResults = new Map();
    const intentCount = new Map();
    let totalMs = 0;

    for (const e of this.searchLog) {
      const q = (e.query || '').trim().toLowerCase();
      if (q) queryCount.set(q, (queryCount.get(q) || 0) + 1);
      if (q && (e.totalFound || 0) === 0) zeroResults.set(q, (zeroResults.get(q) || 0) + 1);
      if (e.intent) intentCount.set(e.intent, (intentCount.get(e.intent) || 0) + 1);
      totalMs += e.processingMs || 0;
    }

    const topQueries = [...queryCount.entries()]
      .sort((a, b) => b[1] - a[1]).slice(0, 15)
      .map(([query, count]) => ({ query, count }));
    const zeroResultQueries = [...zeroResults.entries()]
      .sort((a, b) => b[1] - a[1]).slice(0, 10)
      .map(([query, count]) => ({ query, count }));
    const intents = Object.fromEntries(intentCount);

    return {
      total,
      topQueries,
      zeroResultQueries,
      intents,
      avgProcessingMs: parseFloat((totalMs / total).toFixed(1)),
      recent: this.searchLog.slice(-20).reverse()
    };
  }

  /**
   * Агрегаты по логу чатбота.
   */
  getChatAnalytics() {
    const total = this.chatLog.length;
    if (!total) {
      return {
        total: 0,
        intents: {},
        sentiment: {},
        avgConfidence: 0,
        unknownCount: 0,
        unknownRate: 0,
        lowConfidenceCount: 0,
        lowConfidenceRate: 0,
        topUnresolved: [],
        recent: []
      };
    }

    const intentCount = new Map();
    const sentimentCount = new Map();
    const unresolvedCount = new Map(); // message → count
    let totalConf = 0;
    let confSamples = 0;
    let unknownCount = 0;
    let lowConfidenceCount = 0;
    const LOW_CONF = 0.25;

    for (const e of this.chatLog) {
      if (e.intent) intentCount.set(e.intent, (intentCount.get(e.intent) || 0) + 1);
      if (e.sentiment) sentimentCount.set(e.sentiment, (sentimentCount.get(e.sentiment) || 0) + 1);
      if (typeof e.confidence === 'number') {
        totalConf += e.confidence;
        confSamples++;
        if (e.confidence < LOW_CONF) lowConfidenceCount++;
      }
      const intent = String(e.intent || '').toLowerCase();
      if (!intent || intent === 'unknown' || intent.includes('unknown')) {
        unknownCount++;
        const msg = (e.message || '').trim().toLowerCase();
        if (msg && msg.length >= 3) {
          unresolvedCount.set(msg, (unresolvedCount.get(msg) || 0) + 1);
        }
      }
    }

    return {
      total,
      intents: Object.fromEntries(
        [...intentCount.entries()].sort((a, b) => b[1] - a[1])
      ),
      sentiment: Object.fromEntries(sentimentCount),
      avgConfidence: confSamples ? parseFloat((totalConf / confSamples).toFixed(3)) : 0,
      unknownCount,
      unknownRate: parseFloat((unknownCount / total).toFixed(3)),
      lowConfidenceCount,
      lowConfidenceRate: parseFloat((lowConfidenceCount / total).toFixed(3)),
      topUnresolved: [...unresolvedCount.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([message, count]) => ({ message, count })),
      recent: this.chatLog.slice(-20).reverse()
    };
  }

  /**
   * Список профилей пользователей с компактным резюме (для админки).
   */
  getUserProfiles(limit = 50) {
    const list = [];
    this.userBehavior.forEach((history, userId) => {
      const prefs = history.preferences || {};
      const topCat = Object.entries(prefs.favoriteCategories || {})
        .sort((a, b) => b[1] - a[1])[0]?.[0] || null;
      list.push({
        userId,
        views: history.views.length,
        purchases: history.purchases.length,
        searches: history.searches.length,
        loyaltyScore: Math.round(prefs.loyaltyScore || 0),
        avgOrderValue: Math.round(prefs.avgOrderValue || 0),
        topCategory: topCat,
        favoriteCategories: prefs.favoriteCategories || {},
        priceRange: prefs.priceRange && Number.isFinite(prefs.priceRange.min)
          ? { min: prefs.priceRange.min, max: prefs.priceRange.max }
          : null,
        lastActive: history.lastActive
      });
    });
    return list
      .sort((a, b) => (b.views + b.purchases * 2) - (a.views + a.purchases * 2))
      .slice(0, limit);
  }
}

// Экспорт singleton
export default new NovaAIEngine();
