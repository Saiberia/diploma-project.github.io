import express from 'express';
import aiEngine from '../services/aiEngine.js';

const router = express.Router();

// Mock orders
const orders = [];

router.post('/create', (req, res) => {
  const { productIds, totalPrice, paymentMethod, userId = 'guest' } = req.body;
  const ipAddress = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
  const deviceId  = req.headers['user-agent'] || 'unknown';

  if (!productIds || !totalPrice) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Антифрод — проверяем до создания заказа
  const fraudCheck = aiEngine.detectFraud({ userId, amount: totalPrice, ipAddress, deviceId });

  if (fraudCheck.blocked) {
    return res.status(403).json({
      error: 'Transaction blocked by fraud detection',
      riskScore: fraudCheck.riskScore,
      triggers: fraudCheck.triggers,
      recommendation: fraudCheck.recommendation
    });
  }

  const order = {
    id: 'order_' + Math.random().toString(36).substr(2, 9),
    productIds,
    totalPrice,
    paymentMethod,
    userId,
    status: 'pending',
    fraudRisk: fraudCheck.riskLevel,
    requiresVerification: fraudCheck.requiresVerification,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  orders.push(order);

  // Фиксируем в истории для будущих проверок
  aiEngine.recordOrder(userId, totalPrice, ipAddress, deviceId);

  // Фиксируем продажу в движке прогнозирования спроса
  for (const item of Array.isArray(productIds) ? productIds : [productIds]) {
    const productId = typeof item === 'object' ? item.productId || item.id : String(item);
    const quantity  = typeof item === 'object' ? (item.quantity || 1) : 1;
    aiEngine.recordSale(productId, quantity);
  }

  res.json({ order, fraudCheck, message: 'Order created successfully' });
});

router.get('/history', (req, res) => {
  // Mock user orders
  const userOrders = [
    {
      id: 'order_1',
      productName: 'Steam Wallet 100$',
      price: 100,
      status: 'completed',
      createdAt: new Date('2024-01-10')
    },
    {
      id: 'order_2',
      productName: 'Valorant Battle Pass',
      price: 9.99,
      status: 'completed',
      createdAt: new Date('2024-01-05')
    }
  ];
  
  res.json(userOrders);
});

router.get('/:orderId', (req, res) => {
  const order = orders.find(o => o.id === req.params.orderId);
  
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }
  
  res.json(order);
});

export default router;
