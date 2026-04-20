import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import AISearch from './AISearch';

/**
 * Современная Hero секция с красивыми анимациями
 * - Встроенный поиск
 * - Плавные анимации при загрузке
 * - Hover эффекты
 * - Градиенты и глоу эффекты
 */

function Hero() {
  const navigate = useNavigate();
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [animatedStats, setAnimatedStats] = useState({ orders: 0, satisfaction: 0, market: 0 });

  useEffect(() => {
    setIsLoaded(true);
    // Анимация чисел
    const duration = 2000;
    const steps = 60;
    const interval = duration / steps;
    let step = 0;
    
    const timer = setInterval(() => {
      step++;
      const progress = step / steps;
      const easeOut = 1 - Math.pow(1 - progress, 3);
      
      setAnimatedStats({
        orders: Math.floor(67000 * easeOut),
        satisfaction: Math.floor(98 * easeOut),
        market: Math.floor(74 * easeOut)
      });
      
      if (step >= steps) clearInterval(timer);
    }, interval);
    
    return () => clearInterval(timer);
  }, []);

  // Категории пополнений
  const topupCategories = [
    { id: 'steam', name: 'Steam', icon: '💳', color: '#1b2838', gradient: 'linear-gradient(135deg, #1b2838, #2a475e)', link: '/steam-topup', desc: 'Пополнение кошелька' },
    { id: 'telegram', name: 'Telegram Stars', icon: '⭐', color: '#229ED9', gradient: 'linear-gradient(135deg, #229ED9, #0088cc)', link: '/catalog?category=items', desc: 'Звёзды для Telegram' },
    { id: 'roblox', name: 'Roblox', icon: '🎮', color: '#E2231A', gradient: 'linear-gradient(135deg, #E2231A, #ff4444)', link: '/catalog?category=items', desc: 'Robux на аккаунт' }
  ];

  // Категории игр
  const gameCategories = [
    { id: 'steam', name: 'Steam', icon: '💳', count: '2000+' },
    { id: 'fortnite', name: 'Fortnite', icon: '🎯', count: '50+' },
    { id: 'roblox', name: 'Roblox', icon: '🟥', count: '30+' },
    { id: 'mobilelegends', name: 'Mobile Legends', icon: '⚔️', count: '25+' },
    { id: 'genshin', name: 'Genshin Impact', icon: '✨', count: '20+' },
    { id: 'honkai', name: 'Honkai', icon: '🌟', count: '15+' }
  ];

  // Популярные товары
  const popularProducts = [
    { 
      id: 1, 
      name: 'Смена региона Steam',
      game: 'Steam',
      gameIcon: '💳',
      type: 'На аккаунт',
      desc: 'Смена региона на Казахстан или Аргентину',
      price: 277,
      badge: '🔥 Хит',
      link: '/steam-topup'
    },
    { 
      id: 2, 
      name: '2800 V-Bucks',
      game: 'Fortnite',
      gameIcon: '🎯',
      type: 'Внутриигровая валюта',
      desc: 'Для покупки скинов и боевого пропуска',
      price: 1278,
      link: '/product/2'
    },
    { 
      id: 3, 
      name: 'Пополнение Steam',
      game: 'Steam', 
      gameIcon: '💳',
      type: 'На кошелёк',
      desc: 'Любая сумма от 100 до 50000 ₽',
      price: 100,
      priceLabel: 'от',
      badge: '⭐ Популярное',
      link: '/steam-topup'
    },
    { 
      id: 4, 
      name: 'CS2 Prime Status',
      game: 'Steam',
      gameIcon: '🎮',
      type: 'Улучшение аккаунта',
      desc: 'Prime статус для Counter-Strike 2',
      price: 1199,
      link: '/product/5'
    },
    { 
      id: 5, 
      name: 'Robux 1000',
      game: 'Roblox',
      gameIcon: '🟥',
      type: 'Внутриигровая валюта',
      desc: 'Робуксы на ваш аккаунт',
      price: 749,
      link: '/product/6'
    },
    { 
      id: 6, 
      name: 'Кристаллы Genesis',
      game: 'Genshin Impact',
      gameIcon: '✨',
      type: 'Внутриигровая валюта',
      desc: '6480 кристаллов для гачи',
      price: 1299,
      badge: '✨ Новое',
      link: '/product/8'
    }
  ];

  return (
    <section className={`hero-modern ${isLoaded ? 'loaded' : ''}`}>
      {/* Модалка "Как это работает" */}
      {showHowItWorks && (
        <div className="modal-overlay" onClick={() => setShowHowItWorks(false)}>
          <div className="modal-modern" onClick={e => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setShowHowItWorks(false)}>✕</button>
            <div className="modal-header-icon">❓</div>
            <h2>Как это работает?</h2>
            <div className="steps-container">
              <div className="step-card">
                <div className="step-num">1</div>
                <div className="step-icon">🔍</div>
                <h4>Выберите товар</h4>
                <p>Найдите нужный товар в каталоге или через поиск</p>
              </div>
              <div className="step-card">
                <div className="step-num">2</div>
                <div className="step-icon">📝</div>
                <h4>Введите данные</h4>
                <p>Укажите логин или ID вашего аккаунта</p>
              </div>
              <div className="step-card">
                <div className="step-num">3</div>
                <div className="step-icon">💳</div>
                <h4>Оплатите</h4>
                <p>Картой, СБП или ЮMoney</p>
              </div>
              <div className="step-card">
                <div className="step-num">4</div>
                <div className="step-icon">⚡</div>
                <h4>Получите</h4>
                <p>Товар придёт за 1-10 минут</p>
              </div>
            </div>
            <button className="modal-action-btn" onClick={() => setShowHowItWorks(false)}>
              Понятно! 👍
            </button>
          </div>
        </div>
      )}

      {/* Hero Header с gradient overlay */}
      <div className="hero-top">
        <div className="hero-bg-glow"></div>
        <div className="hero-content">
          <div className="hero-title-area animate-fade-up">
            <span className="hero-badge">🎮 Игровой магазин №1</span>
            <h1 className="hero-main-title">
              <span className="title-gradient">Nova Shop</span>
            </h1>
            <p className="hero-tagline">Пополнение балансов, игровая валюта и ключи игр</p>
          </div>
          
          {/* Поиск */}
          <div className="hero-search-area animate-fade-up delay-1">
            <AISearch />
          </div>

          {/* Быстрые действия */}
          <div className="hero-quick-actions animate-fade-up delay-2">
            <Link to="/catalog" className="hero-btn primary">
              <span className="btn-icon">🛒</span>
              <span>Каталог</span>
            </Link>
            <button className="hero-btn secondary" onClick={() => setShowHowItWorks(true)}>
              <span className="btn-icon">❓</span>
              <span>Как это работает?</span>
            </button>
            <Link to="/deals" className="hero-btn accent">
              <span className="btn-icon">🔥</span>
              <span>Акции</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Категории пополнений */}
      <div className="section-container animate-fade-up delay-3">
        <div className="section-header">
          <h2><span className="section-icon">💳</span> Быстрое пополнение</h2>
        </div>
        <div className="topup-grid">
          {topupCategories.map((cat, idx) => (
            <Link 
              key={cat.id} 
              to={cat.link}
              className="topup-card-modern"
              style={{ 
                '--card-gradient': cat.gradient,
                animationDelay: `${0.1 * idx}s`
              }}
            >
              <div className="topup-glow" style={{ background: cat.color }}></div>
              <div className="topup-icon-wrap">
                <span className="topup-icon">{cat.icon}</span>
              </div>
              <div className="topup-info">
                <span className="topup-name">{cat.name}</span>
                <span className="topup-desc">{cat.desc}</span>
              </div>
              <div className="topup-arrow">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Категории игр */}
      <div className="section-container animate-fade-up delay-4">
        <div className="section-header">
          <h2><span className="section-icon">🎮</span> Игры и товары</h2>
          <Link to="/catalog" className="see-all-link">Все категории →</Link>
        </div>
        <div className="games-scroll">
          {gameCategories.map((cat, idx) => (
            <Link 
              key={cat.id} 
              to={`/catalog?category=${cat.id === 'steam' ? 'steam' : 'items'}`}
              className="game-chip"
              style={{ animationDelay: `${0.05 * idx}s` }}
            >
              <span className="game-chip-icon">{cat.icon}</span>
              <span className="game-chip-name">{cat.name}</span>
              <span className="game-chip-count">{cat.count}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Популярные товары */}
      <div className="section-container animate-fade-up delay-5">
        <div className="section-header">
          <h2><span className="section-icon">🔥</span> Популярное</h2>
          <Link to="/catalog" className="see-all-link">Смотреть все →</Link>
        </div>
        <div className="products-grid-modern">
          {popularProducts.map((product, idx) => (
            <Link 
              key={product.id}
              to={product.link}
              className="product-card-modern"
              style={{ animationDelay: `${0.08 * idx}s` }}
            >
              {product.badge && (
                <div className="product-badge-modern">{product.badge}</div>
              )}
              <div className="product-header">
                <span className="product-game-icon">{product.gameIcon}</span>
                <span className="product-game-name">{product.game}</span>
                <span className="product-type">{product.type}</span>
              </div>
              <h3 className="product-title">{product.name}</h3>
              <p className="product-desc">{product.desc}</p>
              <div className="product-footer">
                <div className="product-price-modern">
                  {product.priceLabel && <span className="price-from">{product.priceLabel}</span>}
                  <span className="price-amount">{product.price}</span>
                  <span className="price-currency">₽</span>
                </div>
                <span className="product-arrow">→</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Статистика */}
      <div className="stats-modern animate-fade-up delay-6">
        <div className="stats-bg-pattern"></div>
        <div className="stats-content-modern">
          <div className="stats-brand">
            <div className="stats-logo-modern">🎮</div>
            <div className="stats-brand-text">
              <h3>Nova Shop</h3>
              <p>Надёжный игровой магазин</p>
            </div>
          </div>
          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-value-modern">{animatedStats.satisfaction}%</span>
              <span className="stat-label-modern">Довольны покупкой</span>
            </div>
            <div className="stat-card">
              <span className="stat-value-modern">{animatedStats.orders.toLocaleString()}+</span>
              <span className="stat-label-modern">Заказов выполнено</span>
            </div>
            <div className="stat-card">
              <span className="stat-value-modern">{animatedStats.market}%</span>
              <span className="stat-label-modern">Рынка СНГ</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Hero;
