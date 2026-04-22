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
 * - Умный поиск с NLP
 */

class NovaAIEngine {
  constructor() {
    // Хранилище данных
    this.userBehavior = new Map();
    this.productStats = new Map();
    this.priceHistory = new Map();
    this.demandHistory = new Map();
    this.sessionData = new Map();
    
    // ML модели (эмуляция)
    this.models = {
      recommendation: { accuracy: 0.87, version: '2.1' },
      pricing: { accuracy: 0.92, version: '1.8' },
      fraud: { accuracy: 0.98, version: '3.0' },
      sentiment: { accuracy: 0.85, version: '1.5' },
      demand: { accuracy: 0.89, version: '2.0' }
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

  // ==========================================
  // 🎯 ПЕРСОНАЛИЗИРОВАННЫЕ РЕКОМЕНДАЦИИ
  // ==========================================
  
  /**
   * Генерация персонализированных рекомендаций
   */
  async getRecommendations(userId, products, options = {}) {
    const { limit = 6, excludePurchased = true, algorithm = 'hybrid' } = options;
    
    const userHistory = this.userBehavior.get(userId);
    
    // Если нет истории - возвращаем популярные товары
    if (!userHistory || userHistory.purchases.length === 0) {
      return this.getPopularProducts(products, limit);
    }
    
    let recommendations = [];
    
    switch (algorithm) {
      case 'collaborative':
        recommendations = await this.collaborativeFiltering(userId, products, userHistory);
        break;
      case 'content':
        recommendations = await this.contentBasedFiltering(products, userHistory);
        break;
      case 'hybrid':
      default:
        // Комбинация методов
        const collaborative = await this.collaborativeFiltering(userId, products, userHistory);
        const contentBased = await this.contentBasedFiltering(products, userHistory);
        recommendations = this.mergeRecommendations(collaborative, contentBased);
    }
    
    // Фильтрация уже купленных
    if (excludePurchased) {
      const purchasedIds = new Set(userHistory.purchases.map(p => p.productId));
      recommendations = recommendations.filter(r => !purchasedIds.has(r.id));
    }
    
    // Добавляем причину рекомендации
    recommendations = recommendations.slice(0, limit).map(product => ({
      ...product,
      recommendationReason: this.getRecommendationReason(product, userHistory),
      confidence: this.calculateConfidence(product, userHistory)
    }));
    
    return recommendations;
  }
  
  /**
   * Коллаборативная фильтрация
   */
  async collaborativeFiltering(userId, products, userHistory) {
    // Находим похожих пользователей
    const similarUsers = this.findSimilarUsers(userId);
    
    // Собираем товары, которые купили похожие пользователи
    const recommendedIds = new Set();
    similarUsers.forEach(([similarUserId, similarity]) => {
      const theirHistory = this.userBehavior.get(similarUserId);
      if (theirHistory) {
        theirHistory.purchases.forEach(p => {
          if (p.productId) recommendedIds.add(p.productId);
        });
      }
    });
    
    return products
      .filter(p => recommendedIds.has(p.id))
      .map(p => ({
        ...p,
        score: 0.8 + Math.random() * 0.2,
        method: 'collaborative'
      }))
      .sort((a, b) => b.score - a.score);
  }
  
  /**
   * Контентная фильтрация
   */
  async contentBasedFiltering(products, userHistory) {
    const preferences = userHistory.preferences || {};
    
    return products.map(product => {
      let score = 0;
      
      // Соответствие категории
      if (preferences.favoriteCategories?.[product.category]) {
        score += 40 * (preferences.favoriteCategories[product.category] / 10);
      }
      
      // Соответствие ценовому диапазону
      if (preferences.priceRange) {
        if (product.price >= preferences.priceRange.min * 0.7 &&
            product.price <= preferences.priceRange.max * 1.3) {
          score += 25;
        }
      }
      
      // Рейтинг товара
      score += (product.rating || 4) * 5;
      
      // Популярность
      score += Math.min(20, (product.reviews || 0) / 100);
      
      return {
        ...product,
        score: Math.min(100, score),
        method: 'content'
      };
    }).sort((a, b) => b.score - a.score);
  }
  
  /**
   * Объединение рекомендаций
   */
  mergeRecommendations(collaborative, contentBased) {
    const scoreMap = new Map();
    
    // Коллаборативные с весом 0.6
    collaborative.forEach((item, index) => {
      const existing = scoreMap.get(item.id) || { ...item, totalScore: 0, count: 0 };
      existing.totalScore += (item.score || 0) * 0.6;
      existing.count++;
      scoreMap.set(item.id, existing);
    });
    
    // Контентные с весом 0.4
    contentBased.forEach((item, index) => {
      const existing = scoreMap.get(item.id) || { ...item, totalScore: 0, count: 0 };
      existing.totalScore += (item.score || 0) * 0.4;
      existing.count++;
      scoreMap.set(item.id, existing);
    });
    
    return Array.from(scoreMap.values())
      .map(item => ({
        ...item,
        score: item.totalScore / item.count,
        method: 'hybrid'
      }))
      .sort((a, b) => b.score - a.score);
  }
  
  /**
   * Поиск похожих пользователей
   */
  findSimilarUsers(userId) {
    const userHistory = this.userBehavior.get(userId);
    if (!userHistory) return [];
    
    const userCategories = new Set(
      userHistory.purchases.map(p => p.category)
    );
    
    const similarities = [];
    
    this.userBehavior.forEach((otherHistory, otherUserId) => {
      if (otherUserId === userId) return;
      
      const otherCategories = new Set(
        otherHistory.purchases.map(p => p.category)
      );
      
      // Jaccard similarity
      const intersection = [...userCategories].filter(c => otherCategories.has(c)).length;
      const union = new Set([...userCategories, ...otherCategories]).size;
      const similarity = union > 0 ? intersection / union : 0;
      
      if (similarity > 0.3) {
        similarities.push([otherUserId, similarity]);
      }
    });
    
    return similarities.sort((a, b) => b[1] - a[1]).slice(0, 10);
  }
  
  /**
   * Популярные товары (fallback)
   */
  getPopularProducts(products, limit) {
    return products
      .sort((a, b) => (b.reviews || 0) - (a.reviews || 0))
      .slice(0, limit)
      .map(p => ({
        ...p,
        recommendationReason: 'Популярно среди покупателей',
        confidence: 0.75
      }));
  }
  
  /**
   * Генерация причины рекомендации
   */
  getRecommendationReason(product, userHistory) {
    const reasons = [];
    
    if (userHistory.preferences?.favoriteCategories?.[product.category]) {
      reasons.push(`Вам нравится категория ${product.category}`);
    }
    
    if (product.rating >= 4.5) {
      reasons.push('Высокий рейтинг покупателей');
    }
    
    if (product.badge === 'popular' || product.badge === 'hit') {
      reasons.push('Хит продаж');
    }
    
    return reasons[0] || 'Подобрано для вас AI';
  }
  
  /**
   * Расчёт уверенности рекомендации
   */
  calculateConfidence(product, userHistory) {
    let confidence = 0.7;
    
    if (userHistory.preferences?.favoriteCategories?.[product.category]) {
      confidence += 0.1;
    }
    if (product.rating >= 4.5) confidence += 0.05;
    if (product.reviews > 1000) confidence += 0.05;
    
    return Math.min(0.98, confidence);
  }

  // ==========================================
  // 💰 ДИНАМИЧЕСКОЕ ЦЕНООБРАЗОВАНИЕ
  // ==========================================
  
  /**
   * Расчёт динамической цены
   */
  calculateDynamicPrice(productId, basePrice, context = {}) {
    const {
      demand = 50,
      inventory = 100,
      userTier = 'standard',
      competition = 1.0,
      timeOfDay = new Date().getHours(),
      dayOfWeek = new Date().getDay()
    } = context;
    
    // Факторы ценообразования
    const factors = {
      demand: this.getDemandFactor(demand),
      inventory: this.getInventoryFactor(inventory),
      seasonal: this.getSeasonalFactor(),
      userTier: this.getUserTierDiscount(userTier),
      timeOfDay: this.getTimeOfDayFactor(timeOfDay),
      weekend: this.getWeekendFactor(dayOfWeek),
      competition: competition
    };
    
    // Расчёт финальной цены
    let dynamicPrice = basePrice;
    dynamicPrice *= factors.demand;
    dynamicPrice *= factors.inventory;
    dynamicPrice *= factors.seasonal;
    dynamicPrice *= factors.userTier;
    dynamicPrice *= factors.timeOfDay;
    dynamicPrice *= factors.weekend;
    dynamicPrice *= factors.competition;
    
    // Ограничение изменения цены ±30%
    const minPrice = basePrice * 0.7;
    const maxPrice = basePrice * 1.3;
    dynamicPrice = Math.max(minPrice, Math.min(maxPrice, dynamicPrice));
    
    // Округление
    dynamicPrice = Math.round(dynamicPrice);
    
    // Сохранение истории
    this.savePriceHistory(productId, basePrice, dynamicPrice, factors);
    
    return {
      productId,
      basePrice,
      dynamicPrice,
      discount: basePrice > dynamicPrice 
        ? Math.round((1 - dynamicPrice / basePrice) * 100) 
        : 0,
      factors: Object.fromEntries(
        Object.entries(factors).map(([k, v]) => [k, Math.round(v * 100)])
      ),
      validUntil: new Date(Date.now() + 30 * 60 * 1000), // 30 минут
      reason: this.getPricingReason(factors, basePrice, dynamicPrice)
    };
  }
  
  getDemandFactor(demand) {
    // 0-100, где 100 = очень высокий спрос
    if (demand > 80) return 1.15;
    if (demand > 60) return 1.08;
    if (demand > 40) return 1.0;
    if (demand > 20) return 0.95;
    return 0.9;
  }
  
  getInventoryFactor(inventory) {
    if (inventory > 500) return 0.92;
    if (inventory > 100) return 0.97;
    if (inventory > 20) return 1.0;
    if (inventory > 5) return 1.08;
    return 1.15; // Мало на складе
  }
  
  getSeasonalFactor() {
    const month = new Date().getMonth();
    // Ноябрь-декабрь (праздники)
    if (month >= 10) return 1.12;
    // Лето
    if (month >= 5 && month <= 7) return 1.05;
    return 1.0;
  }
  
  getUserTierDiscount(tier) {
    const discounts = {
      'vip': 0.85,
      'platinum': 0.88,
      'gold': 0.92,
      'silver': 0.95,
      'standard': 1.0
    };
    return discounts[tier] || 1.0;
  }
  
  getTimeOfDayFactor(hour) {
    // Вечер (18-23) - пик активности
    if (hour >= 18 && hour <= 23) return 1.03;
    // Ночь - скидки
    if (hour >= 0 && hour < 6) return 0.95;
    return 1.0;
  }
  
  getWeekendFactor(day) {
    // Пятница-воскресенье
    if (day === 5 || day === 6 || day === 0) return 1.05;
    return 1.0;
  }
  
  savePriceHistory(productId, basePrice, dynamicPrice, factors) {
    const history = this.priceHistory.get(productId) || [];
    history.push({
      timestamp: new Date(),
      basePrice,
      dynamicPrice,
      factors
    });
    // Храним последние 100 записей
    if (history.length > 100) history.shift();
    this.priceHistory.set(productId, history);
  }
  
  getPricingReason(factors, basePrice, dynamicPrice) {
    if (dynamicPrice < basePrice) {
      if (factors.userTier < 1) return 'Скидка для VIP клиента';
      if (factors.inventory > 1.1) return 'Распродажа остатков';
      if (factors.demand < 1) return 'Специальная цена';
      return 'Персональная скидка';
    }
    if (dynamicPrice > basePrice) {
      if (factors.inventory > 1.1) return 'Ограниченное количество';
      if (factors.demand > 1.1) return 'Высокий спрос';
      return 'Актуальная цена';
    }
    return 'Стандартная цена';
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
   * Прогноз спроса — скользящее среднее 7 дней × тренд × сезонность
   */
  forecastDemand(productId, historicalData = [], days = 7) {
    const productHistory = this.demandHistory.get(productId) || [];
    // Внешние данные (если переданы) мержим по дате
    const merged = [...productHistory];
    for (const ext of historicalData) {
      const dateStr = ext.date || new Date().toISOString().split('T')[0];
      const idx = merged.findIndex(e => e.date === dateStr);
      if (idx >= 0) merged[idx].quantity += (ext.quantity || 0);
      else merged.push({ date: dateStr, quantity: ext.quantity || 0 });
    }
    merged.sort((a, b) => a.date.localeCompare(b.date));

    // 7-дневное скользящее среднее по последним данным
    const window7 = merged.slice(-7);
    const avg7 = window7.length > 0
      ? window7.reduce((s, d) => s + (d.quantity || 0), 0) / window7.length
      : 10;

    // Тренд: последние 7 vs предыдущие 7
    const trendMultiplier = this._calcTrend(merged);
    const seasonalMultiplier = this.getSeasonalFactor();

    // Базовый прогноз дня = avg7 × тренд × сезонность
    const baseForecast = avg7 * trendMultiplier * seasonalMultiplier;

    const forecast = [];
    const now = new Date();

    for (let i = 0; i < days; i++) {
      const forecastDate = new Date(now.getTime() + i * 86400000);
      const dayOfWeek = forecastDate.getDay();
      const weekendBoost = (dayOfWeek === 0 || dayOfWeek === 6) ? 1.2 : 1.0;

      const predicted = Math.max(1, Math.round(baseForecast * weekendBoost));
      // Доверие падает чем дальше прогноз и чем меньше данных
      const dataFactor = Math.min(1, merged.length / 14);
      const confidence = parseFloat(Math.max(0.5, (0.95 - i * 0.04) * dataFactor).toFixed(2));

      forecast.push({
        date: forecastDate.toISOString().split('T')[0],
        dayName: ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'][dayOfWeek],
        predictedDemand: predicted,
        confidence,
        lowerBound: Math.round(predicted * (2 - confidence)),
        upperBound: Math.round(predicted * (1 + (1 - confidence) + 0.15))
      });
    }

    return {
      productId,
      dataPoints: merged.length,
      forecast,
      summary: {
        totalPredicted: forecast.reduce((sum, f) => sum + f.predictedDemand, 0),
        avgDaily: Math.round(baseForecast),
        avg7DaySales: parseFloat(avg7.toFixed(1)),
        trend: trendMultiplier > 1.05 ? 'rising' : trendMultiplier < 0.95 ? 'falling' : 'stable',
        peakDay: forecast.reduce((max, f) => f.predictedDemand > max.predictedDemand ? f : max, forecast[0]),
        recommendation: this.getDemandRecommendation(avg7, trendMultiplier)
      }
    };
  }

  _calcTrend(data) {
    if (data.length < 8) return 1.0;
    const recent = data.slice(-7).reduce((s, d) => s + (d.quantity || 0), 0) / 7;
    const older = data.slice(-14, -7).reduce((s, d) => s + (d.quantity || 0), 0) / 7;
    if (older === 0) return 1.0;
    return Math.min(2.0, Math.max(0.3, recent / older));
  }

  getDemandRecommendation(avg7, trend) {
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
    const intent = this.detectSearchIntent(normalizedQuery);
    const expandedTerms = this.expandSearchTerms(normalizedQuery);
    
    // Поиск с учётом расширенных терминов
    const results = products.map(product => {
      const score = this.calculateSearchScore(product, expandedTerms, intent);
      return { ...product, searchScore: score };
    })
    .filter(p => p.searchScore > 0)
    .sort((a, b) => b.searchScore - a.searchScore);
    
    return {
      query,
      normalizedQuery,
      intent,
      expandedTerms,
      results: results.slice(0, options.limit || 20),
      totalFound: results.length,
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
    const synonyms = {
      'стим': ['steam', 'стим', 'пополнение'],
      'кс': ['cs2', 'cs', 'counter-strike', 'кс2', 'ксго'],
      'форт': ['fortnite', 'фортнайт', 'v-bucks', 'вбаксы'],
      'роблокс': ['roblox', 'робуксы', 'robux'],
      'геншин': ['genshin', 'гачa', 'примогемы'],
      'валорант': ['valorant', 'vp', 'валорант'],
      'дота': ['dota', 'дота2', 'dota2'],
      'элден': ['elden ring', 'элден ринг'],
      'балдур': ['baldurs gate', 'baldur', 'балдур']
    };
    
    const terms = query.split(' ');
    const expanded = new Set(terms);
    
    terms.forEach(term => {
      Object.entries(synonyms).forEach(([key, values]) => {
        if (term.includes(key) || values.some(v => v.includes(term))) {
          values.forEach(v => expanded.add(v));
        }
      });
    });
    
    return Array.from(expanded);
  }
  
  calculateSearchScore(product, terms, intent) {
    let score = 0;
    const productText = `${product.name} ${product.category} ${product.description || ''}`.toLowerCase();
    
    terms.forEach(term => {
      if (productText.includes(term)) {
        score += term.length > 3 ? 20 : 10;
      }
    });
    
    // Бонусы по намерению
    switch (intent) {
      case 'cheap':
        score += product.price < 500 ? 15 : 0;
        break;
      case 'popular':
        score += product.badge === 'popular' || product.badge === 'hit' ? 20 : 0;
        break;
      case 'new':
        score += product.badge === 'new' ? 25 : 0;
        break;
    }
    
    // Бонус за рейтинг
    score += (product.rating || 4) * 2;
    
    return score;
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
   * Проверка транзакции на фрод
   */
  detectFraud(transaction) {
    const {
      userId,
      amount,
      paymentMethod,
      deviceId,
      ipAddress,
      userAgent
    } = transaction;
    
    const checks = {
      velocityCheck: this.checkVelocity(userId),
      amountAnomaly: this.checkAmountAnomaly(userId, amount),
      deviceCheck: this.checkDevice(userId, deviceId),
      behaviorCheck: this.checkBehavior(userId)
    };
    
    // Расчёт риска
    let riskScore = 0;
    if (!checks.velocityCheck) riskScore += 30;
    if (!checks.amountAnomaly) riskScore += 25;
    if (!checks.deviceCheck) riskScore += 25;
    if (!checks.behaviorCheck) riskScore += 20;
    
    const riskLevel = riskScore < 30 ? 'low' : riskScore < 60 ? 'medium' : 'high';
    
    return {
      transactionId: `txn_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      isLegitimate: riskScore < 60,
      riskScore,
      riskLevel,
      checks,
      requiresVerification: riskScore >= 40,
      recommendation: this.getFraudRecommendation(riskScore, checks)
    };
  }
  
  checkVelocity(userId) {
    const history = this.userBehavior.get(userId);
    if (!history) return true;
    
    const recentPurchases = history.purchases.filter(p => {
      const hourAgo = Date.now() - 60 * 60 * 1000;
      return new Date(p.timestamp).getTime() > hourAgo;
    });
    
    return recentPurchases.length < 5; // Не более 5 покупок в час
  }
  
  checkAmountAnomaly(userId, amount) {
    const history = this.userBehavior.get(userId);
    if (!history || history.purchases.length < 3) return true;
    
    const avgAmount = history.purchases.reduce((s, p) => s + (p.price || 0), 0) 
                    / history.purchases.length;
    
    // Сумма не должна превышать 5x от средней
    return amount <= avgAmount * 5;
  }
  
  checkDevice(userId, deviceId) {
    // Проверка известного устройства
    const session = this.sessionData.get(userId);
    if (!session) return true;
    
    return !session.knownDevices || session.knownDevices.includes(deviceId);
  }
  
  checkBehavior(userId) {
    const history = this.userBehavior.get(userId);
    if (!history) return true;
    
    // Должны быть просмотры перед покупкой
    return history.views.length > 0;
  }
  
  getFraudRecommendation(riskScore, checks) {
    if (riskScore >= 60) return 'Заблокировать транзакцию и уведомить службу безопасности';
    if (riskScore >= 40) return 'Требуется дополнительная верификация (SMS/Email)';
    if (riskScore >= 20) return 'Мониторинг транзакции';
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
      timestamp: new Date()
    };
  }
}

// Экспорт singleton
export default new NovaAIEngine();
