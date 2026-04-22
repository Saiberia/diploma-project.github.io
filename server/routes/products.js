import express from 'express';
import products from '../data/products.js';

const router = express.Router();

router.get('/', (req, res) => {
  const { category, search, sort } = req.query;

  let filtered = [...products];

  if (category && category !== 'all') {
    filtered = filtered.filter(p => p.category === category);
  }

  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      (p.tags || []).some(t => t.includes(q))
    );
  }

  if (sort === 'price-asc')  filtered.sort((a, b) => a.price - b.price);
  else if (sort === 'price-desc') filtered.sort((a, b) => b.price - a.price);
  else if (sort === 'rating') filtered.sort((a, b) => b.rating - a.rating);

  res.json({ data: filtered, count: filtered.length, total: products.length });
});

router.get('/categories/list', (req, res) => {
  res.json([
    { id: 'all',          name: 'Все товары',  icon: '🎮' },
    { id: 'steam',        name: 'Steam',        icon: '💳' },
    { id: 'games',        name: 'Игры',         icon: '🎯' },
    { id: 'items',        name: 'Предметы',     icon: '⚔️' },
    { id: 'moba',         name: 'MOBA',         icon: '👹' },
    { id: 'subscription', name: 'Подписки',     icon: '🎫' },
  ]);
});

router.get('/:id', (req, res) => {
  const product = products.find(p => p.id === parseInt(req.params.id));
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json(product);
});

export default router;
