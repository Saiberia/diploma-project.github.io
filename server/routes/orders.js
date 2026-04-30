import express from 'express';
import aiEngine from '../services/aiEngine.js';
import orderPriorityService from '../services/orderPriorityService.js';
import products from '../data/products.js';

const router = express.Router();

// In-memory store (для учебного проекта)
const orders = [];

router.post('/create', (req, res) => {
  const { productIds, totalPrice, paymentMethod, userId = 'guest', customerInfo = {} } = req.body;
  const ipAddress = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
  const deviceId  = req.headers['user-agent'] || 'unknown';

  if (!productIds || !totalPrice) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // 1. Антифрод-проверка ДО списания
  const fraudCheck = aiEngine.detectFraud({ userId, amount: totalPrice, ipAddress, deviceId });

  if (fraudCheck.blocked) {
    return res.status(403).json({
      error:      'Transaction blocked by fraud detection',
      riskScore:  fraudCheck.riskScore,
      riskLevel:  fraudCheck.riskLevel,
      triggers:   fraudCheck.triggers,
      recommendation: fraudCheck.recommendation
    });
  }

  // Нормализация items
  const items = (Array.isArray(productIds) ? productIds : [productIds]).map(item => {
    if (typeof item === 'object') {
      return { productId: item.productId || item.id, quantity: item.quantity || 1 };
    }
    return { productId: item, quantity: 1 };
  });

  const order = {
    id: 'ORD-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2, 5).toUpperCase(),
    items,
    productIds: items.map(i => i.productId),
    totalPrice,
    paymentMethod,
    userId,
    customerInfo,
    status: fraudCheck.requiresVerification ? 'pending_verification' : 'pending',
    fraudRisk: fraudCheck.riskLevel,
    fraudScore: fraudCheck.riskScore,
    requiresVerification: fraudCheck.requiresVerification,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  // 2. Скоринг приоритета
  const priorityResult = orderPriorityService.scoreOrder(order, {
    userBehavior: aiEngine.userBehavior.get(userId),
    products,
    fraudResult: fraudCheck
  });
  order.priority      = priorityResult.score;
  order.priorityLevel = priorityResult.level;
  order.priorityReasons = priorityResult.reasons;
  order.priorityComponents = priorityResult.components;

  orders.push(order);

  // 3. История заказов для будущих фрод-проверок
  aiEngine.recordOrder(userId, totalPrice, ipAddress, deviceId);

  // 4. Фиксируем продажи для прогноза спроса
  for (const item of items) {
    aiEngine.recordSale(item.productId, item.quantity);
  }

  res.json({ order, fraudCheck, priority: priorityResult, message: 'Order created successfully' });
});

/**
 * GET /api/orders/all
 * Все заказы (для админки). В учебном стенде — in-memory.
 */
router.get('/all', (req, res) => {
  res.json(orders.slice(-200).reverse());
});

router.get('/history', (req, res) => {
  const { userId } = req.query;
  let result = orders;
  if (userId) result = orders.filter(o => o.userId === userId);
  // Если истории нет — отдаём демо-данные, чтобы UI не был пустым
  if (!result.length) {
    return res.json([
      { id: 'ORD-DEMO-1', productName: 'Steam Wallet 500₽', price: 500, status: 'completed', createdAt: new Date(Date.now() - 86400000) },
      { id: 'ORD-DEMO-2', productName: 'Valorant Points 1000', price: 599, status: 'completed', createdAt: new Date(Date.now() - 5 * 86400000) }
    ]);
  }
  res.json(result.slice(-30).reverse());
});

/**
 * GET /api/orders/queue
 * Очередь заказов с AI-приоритизацией для админки.
 */
router.get('/queue', (req, res) => {
  const enriched = orders.map(o => ({
    ...o,
    productNames: o.items.map(it => {
      const p = products.find(pr => String(pr.id) === String(it.productId));
      return p ? `${p.name} ×${it.quantity}` : `#${it.productId} ×${it.quantity}`;
    })
  }));
  const queue = orderPriorityService.buildQueue(enriched);
  res.json({ queue, total: queue.length, generatedAt: new Date() });
});

router.patch('/:orderId/status', (req, res) => {
  const order = orders.find(o => o.id === req.params.orderId);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  const { status } = req.body;
  if (!['pending', 'processing', 'completed', 'cancelled', 'pending_verification'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  order.status = status;
  order.updatedAt = new Date();
  res.json({ order });
});

router.get('/:orderId', (req, res) => {
  const order = orders.find(o => o.id === req.params.orderId);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json(order);
});

export default router;
