import express from 'express';

const router = express.Router();

// Mock authentication
router.post('/register', (req, res) => {
  const { email, password, username } = req.body;
  
  if (!email || !password || !username) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  // Mock user creation
  const user = {
    id: Math.random().toString(36).substr(2, 9),
    email,
    username,
    createdAt: new Date()
  };
  
  // Mock token
  const token = 'mock_token_' + Math.random().toString(36).substr(2, 9);
  
  res.json({ user, token });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }
  
  const user = {
    id: 'user_123',
    email,
    username: email.split('@')[0],
    balance: 150.50,
    createdAt: new Date()
  };
  
  const token = 'mock_token_' + Math.random().toString(36).substr(2, 9);
  
  res.json({ user, token });
});

router.post('/logout', (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

export default router;
