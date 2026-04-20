import express from 'express';

const router = express.Router();

// Mock orders
const orders = [];

router.post('/create', (req, res) => {
  const { productIds, totalPrice, paymentMethod } = req.body;
  
  if (!productIds || !totalPrice) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  const order = {
    id: 'order_' + Math.random().toString(36).substr(2, 9),
    productIds,
    totalPrice,
    paymentMethod,
    status: 'pending',
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  orders.push(order);
  
  res.json({ order, message: 'Order created successfully' });
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
