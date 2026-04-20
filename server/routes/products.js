import express from 'express';

const router = express.Router();

// Mock data for demo
const mockProducts = [
  {
    id: 1,
    name: 'CS2 (Counter-Strike 2)',
    category: 'games',
    price: 0,
    image: 'https://via.placeholder.com/300x400?text=CS2',
    description: 'Free competitive tactical shooter',
    rating: 4.8,
    reviews: 1250
  },
  {
    id: 2,
    name: 'Valorant Battle Pass',
    category: 'items',
    price: 9.99,
    image: 'https://via.placeholder.com/300x400?text=Valorant+Pass',
    description: 'Access 50+ cosmetic rewards',
    rating: 4.5,
    reviews: 892
  },
  {
    id: 3,
    name: 'Steam Wallet 100$',
    category: 'steam',
    price: 100,
    image: 'https://via.placeholder.com/300x400?text=Steam+100',
    description: 'Add $100 to your Steam account',
    rating: 4.9,
    reviews: 5420
  },
  {
    id: 4,
    name: 'Dota 2 Cosmetics Bundle',
    category: 'items',
    price: 24.99,
    image: 'https://via.placeholder.com/300x400?text=Dota+Bundle',
    description: 'Premium hero skins and effects',
    rating: 4.6,
    reviews: 634
  },
  {
    id: 5,
    name: 'Baldur\'s Gate 3',
    category: 'games',
    price: 59.99,
    image: 'https://via.placeholder.com/300x400?text=Baldurs+Gate+3',
    description: 'Award-winning RPG masterpiece',
    rating: 4.9,
    reviews: 8900
  },
  {
    id: 6,
    name: 'Fortnite V-Bucks 1000',
    category: 'items',
    price: 9.99,
    image: 'https://via.placeholder.com/300x400?text=Fortnite+VBucks',
    description: '1000 V-Bucks for cosmetics',
    rating: 4.7,
    reviews: 4200
  }
];

// Get all products with filters
router.get('/', (req, res) => {
  const { category, search, sort } = req.query;
  
  let filtered = [...mockProducts];
  
  if (category && category !== 'all') {
    filtered = filtered.filter(p => p.category === category);
  }
  
  if (search) {
    const searchLower = search.toLowerCase();
    filtered = filtered.filter(p => 
      p.name.toLowerCase().includes(searchLower) ||
      p.description.toLowerCase().includes(searchLower)
    );
  }
  
  if (sort === 'price-asc') {
    filtered.sort((a, b) => a.price - b.price);
  } else if (sort === 'price-desc') {
    filtered.sort((a, b) => b.price - a.price);
  } else if (sort === 'rating') {
    filtered.sort((a, b) => b.rating - a.rating);
  }
  
  res.json({ 
    data: filtered,
    count: filtered.length,
    total: mockProducts.length
  });
});

// Get single product
router.get('/:id', (req, res) => {
  const product = mockProducts.find(p => p.id === parseInt(req.params.id));
  
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }
  
  res.json(product);
});

// Get categories
router.get('/categories/list', (req, res) => {
  const categories = [
    { id: 'games', name: 'Games', icon: '🎮' },
    { id: 'items', name: 'Game Items', icon: '⚔️' },
    { id: 'steam', name: 'Steam Top-up', icon: '🪲' },
    { id: 'cosmetics', name: 'Cosmetics', icon: '✨' }
  ];
  
  res.json(categories);
});

export default router;
