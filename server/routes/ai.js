import express from 'express';
import aiEngine from '../services/aiEngine.js';
import recommendationService from '../services/recommendationService.js';
import collaborativeFilteringService from '../services/collaborativeFilteringService.js';
import hybridRecommender from '../services/hybridRecommender.js';
import evaluationService from '../services/evaluationService.js';
import inventoryAIService from '../services/inventoryAIService.js';
import products from '../data/products.js';

const router = express.Router();

/**
 * 🧠 Nova Shop AI API Routes
 * Все AI функции магазина
 */

// ==========================================
// 📊 ОТСЛЕЖИВАНИЕ ПОВЕДЕНИЯ
// ==========================================

/**
 * POST /api/ai/track
 * Отслеживание действий пользователя
 */
router.post('/track', (req, res) => {
  try {
    const { userId, action, data } = req.body;
    
    if (!userId || !action) {
      return res.status(400).json({ error: 'userId and action required' });
    }
    
    const result = aiEngine.trackUserAction(userId, action, data || {});
    res.json(result);
  } catch (error) {
    console.error('Track error:', error);
    res.status(500).json({ error: 'Tracking failed' });
  }
});

// ==========================================
// 🎯 РЕКОМЕНДАЦИИ (content-based filtering)
// ==========================================

/**
 * POST /api/ai/recommendations/personalized
 * Персональные рекомендации на основе истории
 * Body: { viewedIds: number[], purchasedIds: number[], limit?: number }
 */
router.post('/recommendations/personalized', (req, res) => {
  try {
    const {
      viewedIds = [], purchasedIds = [], limit = 4,
      algorithm = 'hybrid',  // 'content' | 'collaborative' | 'hybrid'
      alpha                  // override hybrid alpha (0..1)
    } = req.body;

    const n = parseInt(limit);
    let recs;
    let usedAlgo;

    switch (algorithm) {
      case 'content':
        recs = recommendationService.getPersonalized(viewedIds, purchasedIds, products, n);
        usedAlgo = 'content-based-tfidf';
        break;
      case 'collaborative':
        recs = collaborativeFilteringService.getRecommendations(viewedIds, purchasedIds, products, n);
        if (!recs.length) {
          recs = recommendationService.getPersonalized(viewedIds, purchasedIds, products, n);
          usedAlgo = 'content-based-tfidf (CF fallback)';
        } else {
          usedAlgo = 'item-item-cf';
        }
        break;
      case 'hybrid':
      default:
        recs = hybridRecommender.getRecommendations(viewedIds, purchasedIds, products, n, alpha);
        usedAlgo = 'hybrid';
        break;
    }

    aiEngine.logReco({
      algorithm: usedAlgo,
      alpha:     algorithm === 'hybrid' ? (alpha ?? hybridRecommender.getAlpha()) : null,
      count:     recs.length,
      userId:    req.body.userId
    });

    res.json({
      recommendations: recs,
      algorithm: usedAlgo,
      alpha: algorithm === 'hybrid' ? (alpha ?? hybridRecommender.getAlpha()) : null,
      generatedAt: new Date()
    });
  } catch (error) {
    console.error('Personalized recs error:', error);
    res.status(500).json({ error: 'Failed to generate recommendations' });
  }
});

/**
 * GET /api/ai/recommendations/similar/:productId
 * Похожие товары для страницы продукта
 */
router.get('/recommendations/similar/:productId', (req, res) => {
  try {
    const productId = parseInt(req.params.productId);
    const limit     = parseInt(req.query.limit) || 4;
    const algorithm = req.query.algorithm || 'content';

    let recs;
    let usedAlgo;
    if (algorithm === 'collaborative') {
      recs = collaborativeFilteringService.getSimilarItems(productId, products, limit);
      if (!recs.length) {
        recs = recommendationService.getSimilarProducts(productId, products, limit);
        usedAlgo = 'tfidf-cosine (CF fallback)';
      } else {
        usedAlgo = 'item-item-cf';
      }
    } else {
      recs = recommendationService.getSimilarProducts(productId, products, limit);
      usedAlgo = 'tfidf-cosine';
    }

    res.json({ recommendations: recs, algorithm: usedAlgo, generatedAt: new Date() });
  } catch (error) {
    console.error('Similar products error:', error);
    res.status(500).json({ error: 'Failed to get similar products' });
  }
});

/**
 * GET /api/ai/recommendations/popular
 * Популярные товары (без истории пользователя)
 */
router.get('/recommendations/popular', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 4;
    const recs = recommendationService.getPersonalized([], [], products, limit);
    res.json({ recommendations: recs, algorithm: 'popularity', generatedAt: new Date() });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get popular products' });
  }
});

// ==========================================
// 🔍 УМНЫЙ ПОИСК
// ==========================================

/**
 * POST /api/ai/search
 * Умный поиск с NLP
 */
router.post('/search', (req, res) => {
  try {
    const { query, limit = 20, userId } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query required' });
    }

    const t0 = process.hrtime.bigint();
    const searchResults = aiEngine.smartSearch(query, products, { limit });
    const processingMs = Number(process.hrtime.bigint() - t0) / 1e6;

    aiEngine.logSearch({
      query,
      intent:       searchResults.intent,
      totalFound:   searchResults.totalFound,
      processingMs: parseFloat(processingMs.toFixed(2)),
      userId
    });

    res.json({
      ...searchResults,
      processingTime: `${processingMs.toFixed(2)}ms`
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// ==========================================
// 💰 ДИНАМИЧЕСКОЕ ЦЕНООБРАЗОВАНИЕ
// ==========================================

/**
 * GET /api/ai/dynamic-price/:productId
 * Получение динамической цены
 */
router.get('/dynamic-price/:productId', (req, res) => {
  try {
    const { productId } = req.params;
    const { basePrice = 1000, userTier = 'standard', demand = 50, inventory = 100 } = req.query;
    
    const priceData = aiEngine.calculateDynamicPrice(
      productId,
      parseFloat(basePrice),
      {
        demand: parseFloat(demand),
        inventory: parseFloat(inventory),
        userTier
      }
    );
    
    res.json(priceData);
  } catch (error) {
    console.error('Pricing error:', error);
    res.status(500).json({ error: 'Pricing calculation failed' });
  }
});

/**
 * POST /api/ai/calculate-price
 * Расчёт динамической цены (POST версия)
 */
router.post('/calculate-price', (req, res) => {
  try {
    const { productId, basePrice, context = {} } = req.body;

    if (!productId || !basePrice) {
      return res.status(400).json({ error: 'productId and basePrice required' });
    }

    const priceData = aiEngine.calculateDynamicPrice(productId, basePrice, context);
    res.json(priceData);
  } catch (error) {
    res.status(500).json({ error: 'Pricing calculation failed' });
  }
});

/**
 * GET /api/ai/pricing-context/:productId
 * Возвращает реальный контекст по товару:
 *  - текущий остаток на складе (из products.js)
 *  - спрос, рассчитанный по последним 7 дням истории продаж
 *  - текущее время/день недели
 * Используется UI калькулятора, чтобы показать «откуда цифры».
 */
router.get('/pricing-context/:productId', (req, res) => {
  try {
    const { productId } = req.params;
    const ctx = aiEngine.getPricingContext(productId, products);
    res.json(ctx);
  } catch (error) {
    console.error('Pricing context error:', error);
    res.status(500).json({ error: 'Pricing context failed' });
  }
});

/**
 * GET /api/ai/holidays
 * Календарь праздников на ближайшие N дней (default 30).
 * UI прогноза подсвечивает эти даты на графике.
 */
router.get('/holidays', (req, res) => {
  const days = Math.min(parseInt(req.query.days) || 30, 365);
  const startStr = req.query.from;
  const start = startStr ? new Date(startStr) : new Date();
  res.json({
    from: start.toISOString().split('T')[0],
    days,
    holidays: aiEngine.getHolidayCalendar(days, start)
  });
});

// ==========================================
// 📈 ПРОГНОЗИРОВАНИЕ СПРОСА
// ==========================================

/**
 * GET /api/ai/demand-forecast/:productId
 * Прогноз спроса на товар
 */
router.get('/demand-forecast/:productId', (req, res) => {
  try {
    const { productId } = req.params;
    const { days = 7 } = req.query;
    
    const forecast = aiEngine.forecastDemand(productId, [], parseInt(days));
    
    res.json(forecast);
  } catch (error) {
    console.error('Forecast error:', error);
    res.status(500).json({ error: 'Forecast failed' });
  }
});

// ==========================================
// 🛡️ ДЕТЕКЦИЯ ФРОДА
// ==========================================

/**
 * POST /api/ai/verify-transaction
 * Проверка транзакции на фрод
 */
router.post('/verify-transaction', (req, res) => {
  try {
    const transaction = req.body;
    
    if (!transaction.userId || !transaction.amount) {
      return res.status(400).json({ error: 'userId and amount required' });
    }
    
    const result = aiEngine.detectFraud(transaction);
    res.json(result);
  } catch (error) {
    console.error('Fraud check error:', error);
    res.status(500).json({ error: 'Fraud check failed' });
  }
});

/**
 * GET /api/ai/fraud-log
 * Последние заблокированные транзакции
 */
router.get('/fraud-log', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 200);
  res.json(aiEngine.getFlaggedTransactions(limit));
});

// ==========================================
// 💬 АНАЛИЗ НАСТРОЕНИЙ И ЧАТ
// ==========================================

/**
 * POST /api/ai/analyze-sentiment
 * Анализ настроения текста
 */
router.post('/analyze-sentiment', (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text required' });
    }
    
    const analysis = aiEngine.analyzeSentiment(text);
    res.json(analysis);
  } catch (error) {
    res.status(500).json({ error: 'Sentiment analysis failed' });
  }
});

/**
 * POST /api/ai/chat
 * AI чатбот
 */
router.post('/chat', (req, res) => {
  const { message, conversationId, intent: clientIntent, confidence, userId } = req.body;

  let response = 'Чем могу помочь? 🎮';
  let detectedIntent = clientIntent || 'unknown';
  const messageLower = message?.toLowerCase() || '';

  // Анализ настроения (lexicon-based)
  const sentiment = aiEngine.analyzeSentiment(message || '');

  // Умные ответы (детектор намерений на стороне сервера для случаев,
  // когда клиентский классификатор не уверен)
  if (messageLower.includes('steam') || messageLower.includes('стим')) {
    response = '💳 Пополнение Steam доступно от 100₽. Моментальное зачисление! Перейти в раздел Steam?';
    detectedIntent = clientIntent || 'product_steam';
  } else if (messageLower.includes('fortnite') || messageLower.includes('v-bucks') || messageLower.includes('вбакс')) {
    response = '🎮 V-Bucks для Fortnite! 1000 V-Bucks = 799₽. Нужна помощь с покупкой?';
    detectedIntent = clientIntent || 'product_vbucks';
  } else if (messageLower.includes('оплат') || messageLower.includes('карт')) {
    response = '💳 Принимаем: банковские карты, СБП, ЮMoney. Все платежи защищены!';
    detectedIntent = clientIntent || 'payment';
  } else if (messageLower.includes('доставк') || messageLower.includes('когда')) {
    response = '⚡ Доставка моментальная! Цифровые товары приходят за 1-5 минут после оплаты.';
    detectedIntent = clientIntent || 'delivery';
  } else if (messageLower.includes('привет') || messageLower.includes('здравств')) {
    response = '👋 Привет! Я AI-помощник Nova Shop. Подскажу по любому товару или помогу с заказом!';
    detectedIntent = clientIntent || 'greeting';
  } else if (sentiment.sentiment === 'negative') {
    response = '😔 Понимаю ваше беспокойство! Опишите проблему подробнее, и я постараюсь помочь.';
    detectedIntent = clientIntent || 'negative_feedback';
  }

  aiEngine.logChat({
    message,
    intent:    detectedIntent,
    sentiment: sentiment.sentiment,
    confidence: typeof confidence === 'number' ? confidence : null,
    userId
  });

  res.json({
    conversationId: conversationId || 'conv_' + Date.now(),
    message: response,
    intent: detectedIntent,
    sentiment: sentiment.sentiment,
    timestamp: new Date()
  });
});

// ==========================================
// 📝 ГЕНЕРАЦИЯ КОНТЕНТА
// ==========================================

/**
 * POST /api/ai/generate-description
 * Генерация описания товара
 */
router.post('/generate-description', (req, res) => {
  const { productName, category, tone = 'professional' } = req.body;
  
  const templates = {
    professional: `${productName} — это премиальный цифровой товар категории "${category}". Мгновенная доставка, гарантия качества и поддержка 24/7. Присоединяйтесь к тысячам довольных клиентов Nova Shop!`,
    casual: `${productName} 🎮 Крутая штука для настоящих геймеров! Быстро, надёжно, без заморочек. Бери и кайфуй!`,
    marketing: `🔥 ${productName} — хит продаж! Более 10,000 довольных покупателей. Мгновенная доставка. Гарантия возврата. Не упустите!`
  };
  
  res.json({
    productName,
    category,
    tone,
    description: templates[tone] || templates.professional,
    generatedAt: new Date()
  });
});

// ==========================================
// 📊 АНАЛИТИКА
// ==========================================

/**
 * GET /api/ai/analytics
 * AI аналитика
 */
// Кэш реальных метрик качества (тяжело пересчитывать на каждый запрос)
let _cachedQualityMetrics = null;
let _cachedQualityAt = 0;
const QUALITY_TTL = 5 * 60 * 1000; // 5 минут

function getQualityMetricsCached() {
  if (_cachedQualityMetrics && Date.now() - _cachedQualityAt < QUALITY_TTL) {
    return _cachedQualityMetrics;
  }
  try {
    const result = evaluationService.evaluate({
      ks: [5], alpha: 0.5, numUsers: 30, products
    });
    const summary = {};
    for (const [algo, data] of Object.entries(result.results || {})) {
      const m = data.metrics?.['@5'];
      if (m) summary[algo] = m;
    }
    _cachedQualityMetrics = summary;
    _cachedQualityAt = Date.now();
    return summary;
  } catch {
    return {};
  }
}

router.get('/analytics', (req, res) => {
  try {
    const analytics = aiEngine.getAnalytics();
    const cfStats = collaborativeFilteringService.getStats();
    const quality = getQualityMetricsCached();
    res.json({
      ...analytics,
      collaborativeFiltering: cfStats,
      qualityMetrics: quality
    });
  } catch (error) {
    res.status(500).json({ error: 'Analytics failed' });
  }
});

// ==========================================
// 📐 МЕТРИКИ КАЧЕСТВА РЕКОМЕНДАЦИЙ
// ==========================================

/**
 * GET /api/ai/metrics
 * Precision@k, Recall@k, NDCG@k, MRR для всех алгоритмов
 * на синтетическом held-out наборе.
 *
 * Query: ?ks=3,5,10&alpha=0.5&users=30
 */
router.get('/metrics', (req, res) => {
  try {
    const ks       = (req.query.ks || '3,5,10').split(',').map(s => parseInt(s)).filter(Boolean);
    const alpha    = req.query.alpha != null ? parseFloat(req.query.alpha) : 0.5;
    const numUsers = parseInt(req.query.users) || 30;
    const result = evaluationService.evaluate({
      ks, alpha, numUsers, products
    });
    res.json(result);
  } catch (error) {
    console.error('Metrics error:', error);
    res.status(500).json({ error: error.message || 'Evaluation failed' });
  }
});

/**
 * GET /api/ai/metrics/alpha-sweep
 * Перебор α для гибрида: видно, при каком значении гибрид максимален.
 * Query: ?k=5
 */
router.get('/metrics/alpha-sweep', (req, res) => {
  try {
    const k = parseInt(req.query.k) || 5;
    const result = evaluationService.evaluateAlphaSweep({
      products, ks: [k]
    });
    res.json(result);
  } catch (error) {
    console.error('Alpha sweep error:', error);
    res.status(500).json({ error: error.message || 'Alpha sweep failed' });
  }
});

// ==========================================
// 📦 INVENTORY AI (для backend-AI темы)
// ==========================================

/**
 * GET /api/ai/inventory/alerts
 * Все товары с риском stockout — отсортированы по серьёзности.
 */
router.get('/inventory/alerts', (req, res) => {
  try {
    const alerts = inventoryAIService.getAlerts(products);
    const summary = inventoryAIService.getSummary(products);
    res.json({ alerts, summary, generatedAt: new Date() });
  } catch (e) {
    console.error('Inventory alerts error:', e);
    res.status(500).json({ error: 'Inventory alerts failed' });
  }
});

/**
 * GET /api/ai/inventory/forecast/:productId
 * Полный прогноз по одному товару.
 */
router.get('/inventory/forecast/:productId', (req, res) => {
  const product = products.find(p => String(p.id) === String(req.params.productId));
  if (!product) return res.status(404).json({ error: 'Product not found' });
  try {
    const report = inventoryAIService.forecastStockout(product, {
      days:     parseInt(req.query.days) || 30,
      leadTime: parseInt(req.query.leadTime) || 3
    });
    res.json(report);
  } catch (e) {
    res.status(500).json({ error: 'Forecast failed' });
  }
});

/**
 * GET /api/ai/inventory/summary
 * Сводка по складу для дашборда.
 */
router.get('/inventory/summary', (req, res) => {
  res.json(inventoryAIService.getSummary(products));
});

/**
 * GET /api/ai/analytics/search
 * Агрегированная аналитика по поисковым запросам.
 */
router.get('/analytics/search', (req, res) => {
  res.json(aiEngine.getSearchAnalytics());
});

/**
 * GET /api/ai/analytics/chat
 * Агрегированная аналитика по чат-боту.
 */
router.get('/analytics/chat', (req, res) => {
  res.json(aiEngine.getChatAnalytics());
});

/**
 * GET /api/ai/users
 * Список профилей пользователей с компактным резюме (для админки).
 */
router.get('/users', (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  res.json({
    profiles: aiEngine.getUserProfiles(limit),
    total: aiEngine.getAnalytics().totalUsers
  });
});

/**
 * GET /api/ai/users/:userId
 * Полный профиль пользователя + список «похожих» (Jaccard).
 */
router.get('/users/:userId', (req, res) => {
  const { userId } = req.params;
  const history = aiEngine.userBehavior.get(userId);
  if (!history) return res.status(404).json({ error: 'User not found' });

  const similar = aiEngine.findSimilarUsers(userId);
  res.json({
    userId,
    history: {
      views:     history.views.slice(-30),
      purchases: history.purchases.slice(-30),
      searches:  history.searches.slice(-30),
      lastActive: history.lastActive
    },
    preferences: history.preferences || {},
    similarUsers: similar.map(([id, similarity]) => ({ userId: id, similarity: parseFloat(similarity.toFixed(3)) }))
  });
});

/**
 * GET /api/ai/health
 * Проверка здоровья AI сервисов
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    services: {
      recommendations: 'operational',
      search: 'operational',
      pricing: 'operational',
      fraud: 'operational',
      sentiment: 'operational',
      forecasting: 'operational'
    },
    uptime: process.uptime(),
    timestamp: new Date()
  });
});

export default router;
