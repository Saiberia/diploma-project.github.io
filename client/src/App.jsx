import './App.css';
import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Hero from './components/Hero';
import AISearch from './components/AISearch';
import AIRecommendations from './components/AIRecommendations';
import LiveFeed from './components/LiveFeed';
import Chatbot from './components/Chatbot';
import Footer from './components/Footer';
import ProductDetail from './pages/ProductDetail';
import Catalog from './pages/Catalog';
import Categories from './pages/Categories';
import Deals from './pages/Deals';
import UserProfile from './pages/UserProfile';
import Orders from './pages/Orders';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import AdminPanel from './pages/AdminPanel';
import AdminSettings from './pages/AdminSettings';
import SteamTopup from './pages/SteamTopup';

function App() {
  const [cart, setCart] = useState([]);
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    // Load user from localStorage
    const savedUser = localStorage.getItem('user');
    if (savedUser) setUser(JSON.parse(savedUser));
    // Load cart from localStorage
    const savedCart = localStorage.getItem('cart');
    if (savedCart) setCart(JSON.parse(savedCart));
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const mockProducts = [
        {
          id: 1,
          name: 'Пополнение Steam кошелька',
          category: 'steam',
          price: 100,
          badge: 'popular',
          description: 'Моментальное пополнение баланса Steam. Введите логин и сумму - деньги зачислятся мгновенно!',
          rating: 4.9,
          reviews: 12840,
          image: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1676930/header.jpg',
          stock: 99999,
          isService: true,
          serviceUrl: '/steam-topup'
        },
        {
          id: 2,
          name: 'V-Bucks 1000 (Fortnite)',
          category: 'items',
          price: 799,
          badge: 'hit',
          description: 'Виртуальная валюта для Fortnite на 1000 V-Bucks',
          rating: 4.8,
          reviews: 3200,
          image: 'https://cdn2.unrealengine.com/fortnite-og-social-1920x1080-1920x1080-6a11e2efcf0d.jpg',
          stock: 500
        },
        {
          id: 3,
          name: 'Baldur\'s Gate 3',
          category: 'games',
          price: 1999,
          badge: 'new',
          description: 'Награжденная множеством премий RPG от Larian Studios',
          rating: 4.9,
          reviews: 8900,
          image: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1086940/header.jpg',
          stock: 100
        },
        {
          id: 4,
          name: 'Valorant Points 1000',
          category: 'items',
          price: 599,
          description: 'Валюта Valorant для покупки скинов и боевого пропуска',
          rating: 4.7,
          reviews: 2100,
          image: 'https://images.contentstack.io/v3/assets/bltb6530b271fddd0b1/blt2ef6c6d8c5554b34/5f73e4bf12051e1754f9cd90/Valorant_EP3_Social_Panels_Competetive_16x9.jpg',
          stock: 200
        },
        {
          id: 5,
          name: 'CS2 Prime Status',
          category: 'games',
          price: 1199,
          badge: 'popular',
          description: 'Улучшенный статус Counter-Strike 2 с эксклюзивными функциями',
          rating: 4.8,
          reviews: 1250,
          image: 'https://cdn.cloudflare.steamstatic.com/steam/apps/730/header.jpg',
          stock: 999
        },
        {
          id: 6,
          name: 'Robux 1000 (Roblox)',
          category: 'items',
          price: 749,
          description: 'Валюта Roblox для внутриигровых покупок',
          rating: 4.6,
          reviews: 1840,
          image: 'https://images.rbxcdn.com/d7dca9b47afaaa18a918236f1aec8284.png',
          stock: 300
        },
        {
          id: 7,
          name: 'Elden Ring',
          category: 'games',
          price: 2499,
          badge: 'hit',
          description: 'Эпическая экшен-RPG от FromSoftware и Джорджа Мартина',
          rating: 4.9,
          reviews: 4200,
          image: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1245620/header.jpg',
          stock: 50
        },
        {
          id: 8,
          name: 'Genshin Impact Кристаллы',
          category: 'items',
          price: 1299,
          badge: 'hit',
          description: 'Кристаллы Genesis для Genshin Impact (6480 шт)',
          rating: 4.7,
          reviews: 1560,
          image: 'https://webstatic.hoyoverse.com/upload/op-public/2022/08/24/c8e0f76f47f4c192c59e36cda4d77a66_8136443159498971098.jpg',
          stock: 250
        },
        {
          id: 9,
          name: 'Пополнение Steam 1000 ₽',
          category: 'steam',
          price: 1000,
          description: 'Пополнение баланса Steam на 1000 рублей',
          rating: 4.9,
          reviews: 3210,
          image: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1676930/header.jpg',
          stock: 500
        },
        {
          id: 10,
          name: 'Dota 2 - Battle Pass',
          category: 'moba',
          price: 799,
          badge: 'new',
          description: 'Боевой пропуск с эксклюзивным контентом и наградами',
          rating: 4.6,
          reviews: 890,
          image: 'https://cdn.cloudflare.steamstatic.com/steam/apps/570/header.jpg',
          stock: 1000
        }
      ];
      
      const mockCategories = [
        { id: 'all', name: 'Все товары', icon: '🎮' },
        { id: 'steam', name: 'Steam', icon: '💳' },
        { id: 'games', name: 'Игры', icon: '🎯' },
        { id: 'items', name: 'Предметы', icon: '⚔️' },
        { id: 'moba', name: 'MOBA', icon: '👹' }
      ];
      
      setProducts(mockProducts);
      setCategories(mockCategories);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (product) => {
    const existingItem = cart.find(item => item.id === product.id);
    if (existingItem) {
      setCart(cart.map(item =>
        item.id === product.id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
    localStorage.setItem('cart', JSON.stringify([...cart, { ...product, quantity: 1 }]));
  };

  const removeFromCart = (productId) => {
    const updated = cart.filter(item => item.id !== productId);
    setCart(updated);
    localStorage.setItem('cart', JSON.stringify(updated));
  };

  const updateCartQuantity = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }
    const updated = cart.map(item =>
      item.id === productId 
        ? { ...item, quantity: newQuantity }
        : item
    );
    setCart(updated);
    localStorage.setItem('cart', JSON.stringify(updated));
  };

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  return (
    <Router>
      <div className="app">
        <Header 
          user={user} 
          cartCount={cart.length}
          onLogout={handleLogout}
          products={products}
        />
        
        <Routes>
          <Route path="/" element={
            <main className="main-content">
              <Hero />
              <div className="content-container">
                <AISearch />
                <AIRecommendations />
                <LiveFeed />
              </div>
            </main>
          } />
          
          <Route path="/catalog" element={
            <main className="main-content">
              <Catalog products={products} loading={loading} onAddToCart={addToCart} />
            </main>
          } />
          
          <Route path="/categories" element={
            <main className="main-content">
              <Categories />
            </main>
          } />
          
          <Route path="/deals" element={
            <main className="main-content">
              <Deals />
            </main>
          } />
          
          <Route path="/product/:id" element={
            <ProductDetail 
              products={products} 
              onAddToCart={addToCart}
            />
          } />
          
          <Route path="/cart" element={
            <Cart 
              items={cart} 
              onRemove={removeFromCart}
              onUpdate={updateCartQuantity}
            />
          } />
          
          <Route path="/checkout" element={
            <Checkout cartItems={cart} user={user} />
          } />
          
          <Route path="/profile" element={
            <UserProfile 
              user={user} 
              onLogin={handleLogin}
              onLogout={handleLogout}
            />
          } />
          
          <Route path="/orders" element={
            <Orders user={user} />
          } />

          <Route path="/steam-topup" element={
            <SteamTopup user={user} />
          } />
          
          <Route path="/admin" element={
            <AdminPanel 
              products={products}
              user={user}
            />
          } />

          <Route path="/admin/settings" element={
            <AdminSettings 
              user={user}
              onLogout={handleLogout}
            />
          } />
        </Routes>

        <Chatbot />
        <Footer />
      </div>
    </Router>
  );
}

export default App;
