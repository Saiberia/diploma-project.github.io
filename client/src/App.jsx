import './App.css';
import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Hero from './components/Hero';
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
        // === STEAM ===
        {
          id: 1,
          name: 'Пополнение Steam кошелька',
          category: 'steam',
          tags: ['steam', 'кошелёк', 'пополнение', 'баланс'],
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
          id: 9,
          name: 'Пополнение Steam 1000 ₽',
          category: 'steam',
          tags: ['steam', 'кошелёк', 'пополнение', 'баланс'],
          price: 1000,
          description: 'Пополнение баланса Steam на 1000 рублей',
          rating: 4.9,
          reviews: 3210,
          image: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1676930/header.jpg',
          stock: 500
        },
        {
          id: 11,
          name: 'Пополнение Steam 500 ₽',
          category: 'steam',
          tags: ['steam', 'кошелёк', 'пополнение', 'баланс'],
          price: 500,
          description: 'Пополнение баланса Steam на 500 рублей',
          rating: 4.9,
          reviews: 2100,
          image: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1676930/header.jpg',
          stock: 500
        },
        {
          id: 12,
          name: 'Пополнение Steam 2500 ₽',
          category: 'steam',
          tags: ['steam', 'кошелёк', 'пополнение', 'баланс'],
          price: 2500,
          badge: 'hit',
          description: 'Пополнение баланса Steam на 2500 рублей — выгодный вариант для покупки игр',
          rating: 4.9,
          reviews: 1890,
          image: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1676930/header.jpg',
          stock: 300
        },

        // === ИГРЫ (games) ===
        {
          id: 3,
          name: "Baldur's Gate 3",
          category: 'games',
          tags: ['rpg', 'фэнтези', 'кооп', 'steam', 'larian'],
          price: 1999,
          badge: 'new',
          description: 'Награжденная множеством премий RPG от Larian Studios',
          rating: 4.9,
          reviews: 8900,
          image: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1086940/header.jpg',
          stock: 100
        },
        {
          id: 5,
          name: 'CS2 Prime Status',
          category: 'games',
          tags: ['шутер', 'counter-strike', 'cs2', 'steam', 'мультиплеер'],
          price: 1199,
          badge: 'popular',
          description: 'Улучшенный статус Counter-Strike 2 с эксклюзивными функциями',
          rating: 4.8,
          reviews: 1250,
          image: 'https://cdn.cloudflare.steamstatic.com/steam/apps/730/header.jpg',
          stock: 999
        },
        {
          id: 7,
          name: 'Elden Ring',
          category: 'games',
          tags: ['rpg', 'соулслайк', 'fromsoft', 'steam', 'экшен'],
          price: 2499,
          badge: 'hit',
          description: 'Эпическая экшен-RPG от FromSoftware и Джорджа Мартина',
          rating: 4.9,
          reviews: 4200,
          image: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1245620/header.jpg',
          stock: 50
        },
        {
          id: 13,
          name: 'Cyberpunk 2077',
          category: 'games',
          tags: ['rpg', 'экшен', 'открытый мир', 'cd projekt', 'steam'],
          price: 1799,
          badge: 'hit',
          description: 'Культовая RPG в антураже киберпанка от CD Projekt RED',
          rating: 4.7,
          reviews: 6300,
          image: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1091500/header.jpg',
          stock: 200
        },
        {
          id: 14,
          name: 'Red Dead Redemption 2',
          category: 'games',
          tags: ['экшен', 'приключение', 'открытый мир', 'rockstar', 'steam'],
          price: 1499,
          description: 'Легендарный вестерн от Rockstar Games с открытым миром',
          rating: 4.9,
          reviews: 7800,
          image: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1174180/header.jpg',
          stock: 150
        },
        {
          id: 15,
          name: 'GTA V Premium',
          category: 'games',
          tags: ['экшен', 'открытый мир', 'rockstar', 'steam', 'мультиплеер'],
          price: 899,
          badge: 'popular',
          description: 'GTA V с Premium Online Edition — лучший криминальный экшен',
          rating: 4.8,
          reviews: 15200,
          image: 'https://cdn.cloudflare.steamstatic.com/steam/apps/271590/header.jpg',
          stock: 500
        },
        {
          id: 16,
          name: 'The Witcher 3: Wild Hunt',
          category: 'games',
          tags: ['rpg', 'фэнтези', 'cd projekt', 'steam', 'открытый мир'],
          price: 999,
          description: 'Легендарная RPG про Геральта из Ривии с огромным миром',
          rating: 4.9,
          reviews: 9400,
          image: 'https://cdn.cloudflare.steamstatic.com/steam/apps/292030/header.jpg',
          stock: 300
        },
        {
          id: 17,
          name: 'Hogwarts Legacy',
          category: 'games',
          tags: ['rpg', 'фэнтези', 'гарри поттер', 'steam', 'приключение'],
          price: 2199,
          badge: 'new',
          description: 'Откройте для себя волшебный мир Хогвартса в масштабной RPG',
          rating: 4.7,
          reviews: 3600,
          image: 'https://cdn.cloudflare.steamstatic.com/steam/apps/990080/header.jpg',
          stock: 80
        },
        {
          id: 18,
          name: 'Starfield',
          category: 'games',
          tags: ['rpg', 'sci-fi', 'космос', 'bethesda', 'steam'],
          price: 2499,
          description: 'Масштабная космическая RPG от создателей Skyrim — Bethesda',
          rating: 4.4,
          reviews: 2100,
          image: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1716740/header.jpg',
          stock: 60
        },

        // === ПРЕДМЕТЫ / ВАЛЮТА (items) ===
        {
          id: 2,
          name: 'V-Bucks 1000 (Fortnite)',
          category: 'items',
          tags: ['fortnite', 'v-bucks', 'валюта', 'скины', 'battle pass'],
          price: 799,
          badge: 'hit',
          description: 'Виртуальная валюта для Fortnite на 1000 V-Bucks',
          rating: 4.8,
          reviews: 3200,
          image: 'https://cdn2.unrealengine.com/fortnite-og-social-1920x1080-1920x1080-6a11e2efcf0d.jpg',
          stock: 500
        },
        {
          id: 4,
          name: 'Valorant Points 1000',
          category: 'items',
          tags: ['valorant', 'vp', 'riot', 'скины', 'валюта'],
          price: 599,
          description: 'Валюта Valorant для покупки скинов и боевого пропуска',
          rating: 4.7,
          reviews: 2100,
          image: 'https://images.contentstack.io/v3/assets/bltb6530b271fddd0b1/blt2ef6c6d8c5554b34/5f73e4bf12051e1754f9cd90/Valorant_EP3_Social_Panels_Competetive_16x9.jpg',
          stock: 200
        },
        {
          id: 6,
          name: 'Robux 1000 (Roblox)',
          category: 'items',
          tags: ['roblox', 'robux', 'валюта', 'детям'],
          price: 749,
          description: 'Валюта Roblox для внутриигровых покупок',
          rating: 4.6,
          reviews: 1840,
          image: 'https://images.rbxcdn.com/d7dca9b47afaaa18a918236f1aec8284.png',
          stock: 300
        },
        {
          id: 8,
          name: 'Genshin Impact Кристаллы',
          category: 'items',
          tags: ['genshin', 'кристаллы', 'гача', 'hoyoverse', 'валюта'],
          price: 1299,
          badge: 'hit',
          description: 'Кристаллы Genesis для Genshin Impact (6480 шт)',
          rating: 4.7,
          reviews: 1560,
          image: 'https://webstatic.hoyoverse.com/upload/op-public/2022/08/24/c8e0f76f47f4c192c59e36cda4d77a66_8136443159498971098.jpg',
          stock: 250
        },
        {
          id: 19,
          name: 'Valorant Points 2650',
          category: 'items',
          tags: ['valorant', 'vp', 'riot', 'скины', 'валюта'],
          price: 1299,
          badge: 'popular',
          description: 'Выгодный набор VP для Valorant — 2650 очков',
          rating: 4.8,
          reviews: 1670,
          image: 'https://images.contentstack.io/v3/assets/bltb6530b271fddd0b1/blt2ef6c6d8c5554b34/5f73e4bf12051e1754f9cd90/Valorant_EP3_Social_Panels_Competetive_16x9.jpg',
          stock: 150
        },
        {
          id: 20,
          name: 'V-Bucks 2800 (Fortnite)',
          category: 'items',
          tags: ['fortnite', 'v-bucks', 'валюта', 'скины', 'battle pass'],
          price: 1599,
          description: 'Увеличенный пакет V-Bucks для Fortnite — 2800 монет',
          rating: 4.8,
          reviews: 2100,
          image: 'https://cdn2.unrealengine.com/fortnite-og-social-1920x1080-1920x1080-6a11e2efcf0d.jpg',
          stock: 300
        },
        {
          id: 21,
          name: 'Apex Coins 1000',
          category: 'items',
          tags: ['apex legends', 'монеты', 'ea', 'шутер', 'валюта'],
          price: 699,
          description: 'Монеты Apex для покупки скинов и Battle Pass в Apex Legends',
          rating: 4.6,
          reviews: 980,
          image: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1172470/header.jpg',
          stock: 400
        },
        {
          id: 22,
          name: 'Telegram Stars 100',
          category: 'items',
          tags: ['telegram', 'stars', 'звёзды', 'донат'],
          price: 349,
          badge: 'new',
          description: '100 звёзд Telegram для оплаты ботов и сервисов',
          rating: 4.5,
          reviews: 540,
          image: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1676930/header.jpg',
          stock: 1000
        },
        {
          id: 23,
          name: 'Telegram Stars 500',
          category: 'items',
          tags: ['telegram', 'stars', 'звёзды', 'донат'],
          price: 1599,
          description: '500 звёзд Telegram — выгодный пакет для активного использования',
          rating: 4.6,
          reviews: 320,
          image: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1676930/header.jpg',
          stock: 1000
        },

        // === MOBA ===
        {
          id: 10,
          name: 'Dota 2 — Battle Pass',
          category: 'moba',
          tags: ['dota2', 'moba', 'battle pass', 'valve', 'ti'],
          price: 799,
          badge: 'new',
          description: 'Боевой пропуск с эксклюзивным контентом и наградами',
          rating: 4.6,
          reviews: 890,
          image: 'https://cdn.cloudflare.steamstatic.com/steam/apps/570/header.jpg',
          stock: 1000
        },
        {
          id: 24,
          name: 'League of Legends RP 1000',
          category: 'moba',
          tags: ['lol', 'league of legends', 'riot', 'rp', 'скины'],
          price: 499,
          description: '1000 Riot Points для League of Legends',
          rating: 4.7,
          reviews: 2350,
          image: 'https://cdn.cloudflare.steamstatic.com/steam/apps/2586840/header.jpg',
          stock: 500
        },
        {
          id: 25,
          name: 'Mobile Legends Diamonds',
          category: 'moba',
          tags: ['mobile legends', 'diamonds', 'алмазы', 'мобильный'],
          price: 449,
          badge: 'popular',
          description: '500 алмазов Mobile Legends для покупки скинов',
          rating: 4.5,
          reviews: 1120,
          image: 'https://cdn.cloudflare.steamstatic.com/steam/apps/570/header.jpg',
          stock: 600
        },
        {
          id: 26,
          name: 'Dota 2 — Immortal Treasure',
          category: 'moba',
          tags: ['dota2', 'moba', 'сундук', 'предмет', 'valve'],
          price: 349,
          description: 'Immortal Treasure — сундук с редкими предметами для Dota 2',
          rating: 4.4,
          reviews: 670,
          image: 'https://cdn.cloudflare.steamstatic.com/steam/apps/570/header.jpg',
          stock: 800
        },

        // === Дополнительно: подписки (subscription) ===
        {
          id: 27,
          name: 'Xbox Game Pass Ultimate 1 мес',
          category: 'subscription',
          tags: ['xbox', 'gamepass', 'подписка', 'microsoft', 'игры'],
          price: 599,
          badge: 'hit',
          description: 'Доступ к сотням игр для Xbox и PC на 1 месяц',
          rating: 4.8,
          reviews: 3400,
          image: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1676930/header.jpg',
          stock: 999
        },
        {
          id: 28,
          name: 'EA Play Pro 1 мес',
          category: 'subscription',
          tags: ['ea', 'ea play', 'подписка', 'origin', 'игры'],
          price: 499,
          description: 'Подписка EA Play Pro на 1 месяц — все новинки EA',
          rating: 4.5,
          reviews: 1200,
          image: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1676930/header.jpg',
          stock: 500
        }
      ];

      const mockCategories = [
        { id: 'all', name: 'Все товары', icon: '🎮' },
        { id: 'steam', name: 'Steam', icon: '💳' },
        { id: 'games', name: 'Игры', icon: '🎯' },
        { id: 'items', name: 'Предметы', icon: '⚔️' },
        { id: 'moba', name: 'MOBA', icon: '👹' },
        { id: 'subscription', name: 'Подписки', icon: '🎫' }
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
    let updatedCart;
    if (existingItem) {
      updatedCart = cart.map(item =>
        item.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      );
    } else {
      updatedCart = [...cart, { ...product, quantity: 1 }];
    }
    setCart(updatedCart);
    localStorage.setItem('cart', JSON.stringify(updatedCart));
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
