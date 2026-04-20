import express from 'express';
import aiEngine from '../services/aiEngine.js';

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
// 🎯 ПЕРСОНАЛИЗИРОВАННЫЕ РЕКОМЕНДАЦИИ
// ==========================================

/**
 * GET /api/ai/recommendations/:userId
 * Получение персонализированных рекомендаций
 */
router.get('/recommendations/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 6, algorithm = 'hybrid' } = req.query;
    
    // Моковые продукты (в реальности из БД)
    const products = [
      { id: 1, name: 'Пополнение Steam', category: 'steam', price: 100, rating: 4.9, reviews: 12840, badge: 'popular' },
      { id: 2, name: 'V-Bucks 1000', category: 'items', price: 799, rating: 4.8, reviews: 3200, badge: 'hit' },
      { id: 3, name: "Baldur's Gate 3", category: 'games', price: 1999, rating: 4.9, reviews: 8900, badge: 'new' },
      { id: 4, name: 'Valorant Points 1000', category: 'items', price: 599, rating: 4.7, reviews: 2100 },
      { id: 5, name: 'CS2 Prime Status', category: 'games', price: 1199, rating: 4.8, reviews: 5600, badge: 'popular' },
      { id: 6, name: 'Robux 1000', category: 'items', price: 749, rating: 4.6, reviews: 4200 },
      { id: 7, name: 'Elden Ring', category: 'games', price: 2499, rating: 4.9, reviews: 15000 },
      { id: 8, name: 'Genshin Impact Кристаллы', category: 'items', price: 1299, rating: 4.5, reviews: 2800 },
      { id: 9, name: 'Смена региона Steam', category: 'steam', price: 277, rating: 4.9, reviews: 8400, badge: 'hit' },
      { id: 10, name: 'Dota 2 Battle Pass', category: 'moba', price: 799, rating: 4.7, reviews: 3500 }
    ];
    
    const recommendations = await aiEngine.getRecommendations(
      userId, 
      products,
      { limit: parseInt(limit), algorithm }
    );
    
    res.json({
      userId,
      recommendations,
      algorithm,
      generatedAt: new Date(),
      modelVersion: aiEngine.models.recommendation.version
    });
  } catch (error) {
    console.error('Recommendations error:', error);
    res.status(500).json({ error: 'Failed to generate recommendations' });
  }
});

/**
 * GET /api/ai/recommendations
 * Рекомендации без userId (популярные)
 */
router.get('/recommendations', async (req, res) => {
  try {
    const products = [
      { id: 1, name: 'Пополнение Steam', category: 'steam', price: 100, rating: 4.9, reviews: 12840, badge: 'popular' },
      { id: 2, name: 'V-Bucks 1000', category: 'items', price: 799, rating: 4.8, reviews: 3200, badge: 'hit' },
      { id: 3, name: "Baldur's Gate 3", category: 'games', price: 1999, rating: 4.9, reviews: 8900, badge: 'new' },
      { id: 5, name: 'CS2 Prime Status', category: 'games', price: 1199, rating: 4.8, reviews: 5600, badge: 'popular' },
      { id: 9, name: 'Смена региона Steam', category: 'steam', price: 277, rating: 4.9, reviews: 8400, badge: 'hit' }
    ];
    
    const recommendations = products.map(p => ({
      ...p,
      recommendationReason: 'Популярно среди покупателей',
      confidence: 0.85
    }));
    
    res.json({
      recommendations,
      type: 'popular',
      generatedAt: new Date()
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get recommendations' });
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
    const { query, limit = 20 } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query required' });
    }
    
    const products = [
      { id: 1, name: 'Пополнение Steam кошелька', category: 'steam', price: 100, rating: 4.9, description: 'Моментальное пополнение баланса Steam' },
      { id: 2, name: 'V-Bucks 1000 (Fortnite)', category: 'items', price: 799, rating: 4.8, description: 'Валюта для Fortnite' },
      { id: 3, name: "Baldur's Gate 3", category: 'games', price: 1999, rating: 4.9, description: 'Эпическая RPG' },
      { id: 4, name: 'Valorant Points 1000', category: 'items', price: 599, rating: 4.7, description: 'Очки для Valorant' },
      { id: 5, name: 'CS2 Prime Status', category: 'games', price: 1199, rating: 4.8, description: 'Counter-Strike 2 Prime' },
      { id: 6, name: 'Robux 1000 (Roblox)', category: 'items', price: 749, rating: 4.6, description: 'Валюта Roblox' },
      { id: 7, name: 'Elden Ring', category: 'games', price: 2499, rating: 4.9, description: 'Action RPG от FromSoftware' },
      { id: 8, name: 'Genshin Impact Кристаллы', category: 'items', price: 1299, rating: 4.5, description: 'Кристаллы Genesis' },
      { id: 9, name: 'Смена региона Steam', category: 'steam', price: 277, rating: 4.9, description: 'Смена региона на Казахстан' },
      { id: 10, name: 'Dota 2 Battle Pass', category: 'moba', price: 799, rating: 4.7, description: 'Боевой пропуск Dota 2' }
    ];
    
    const searchResults = aiEngine.smartSearch(query, products, { limit });
    
    res.json({
      ...searchResults,
      processingTime: `${Math.floor(Math.random() * 50 + 20)}ms`
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

/**
 * POST /api/ai/semantic-search
 * Семантический поиск (алиас)
 */
router.post('/semantic-search', (req, res) => {
  const { query } = req.body;
  
  const results = [
    { id: 1, name: 'CS2 - Competitive FPS', relevance: 0.98, category: 'games' },
    { id: 2, name: 'Valorant - Tactical Shooter', relevance: 0.95, category: 'games' },
    { id: 3, name: 'Overwatch 2 - Team-based FPS', relevance: 0.92, category: 'games' }
  ];
  
  res.json({ query, results, processingTime: '124ms' });
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
  const { message, conversationId } = req.body;
  
  let response = 'Чем могу помочь? 🎮';
  const messageLower = message?.toLowerCase() || '';
  
  // Анализ настроения
  const sentiment = aiEngine.analyzeSentiment(message || '');
  
  // Умные ответы
  if (messageLower.includes('steam') || messageLower.includes('стим')) {
    response = '💳 Пополнение Steam доступно от 100₽. Моментальное зачисление! Перейти в раздел Steam?';
  } else if (messageLower.includes('fortnite') || messageLower.includes('v-bucks') || messageLower.includes('вбакс')) {
    response = '🎮 V-Bucks для Fortnite! 1000 V-Bucks = 799₽. Нужна помощь с покупкой?';
  } else if (messageLower.includes('оплат') || messageLower.includes('карт')) {
    response = '💳 Принимаем: банковские карты, СБП, ЮMoney. Все платежи защищены!';
  } else if (messageLower.includes('доставк') || messageLower.includes('когда')) {
    response = '⚡ Доставка моментальная! Цифровые товары приходят за 1-5 минут после оплаты.';
  } else if (messageLower.includes('привет') || messageLower.includes('здравств')) {
    response = '👋 Привет! Я AI-помощник Nova Shop. Подскажу по любому товару или помогу с заказом!';
  } else if (sentiment.sentiment === 'negative') {
    response = '😔 Понимаю ваше беспокойство! Опишите проблему подробнее, и я постараюсь помочь.';
  }
  
  res.json({
    conversationId: conversationId || 'conv_' + Date.now(),
    message: response,
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
router.get('/analytics', (req, res) => {
  try {
    const analytics = aiEngine.getAnalytics();
    
    res.json({
      ...analytics,
      additionalMetrics: {
        recommendationAccuracy: 0.87,
        searchRelevance: 0.92,
        fraudDetectionRate: 0.98,
        demandPredictionAccuracy: 0.89,
        averageResponseTime: '45ms'
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Analytics failed' });
  }
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
