import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';

function Catalog({ products, loading, onAddToCart }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const categoryFromUrl = searchParams.get('category');
  const searchFromUrl = searchParams.get('search');
  
  const [selectedCategory, setSelectedCategory] = useState(categoryFromUrl || 'all');
  const [sortBy, setSortBy] = useState('popular');
  const [priceRange, setPriceRange] = useState([0, 5000]);
  const [notification, setNotification] = useState(null);
  const [textQuery, setTextQuery] = useState(searchFromUrl || '');

  useEffect(() => {
    if (categoryFromUrl) {
      setSelectedCategory(categoryFromUrl);
    }
  }, [categoryFromUrl]);

  useEffect(() => {
    setTextQuery(searchFromUrl || '');
  }, [searchFromUrl]);

  const categories = [
    { id: 'all',          name: 'Все товары', icon: '🎮' },
    { id: 'steam',        name: 'Steam',       icon: '💳' },
    { id: 'games',        name: 'Игры',        icon: '🎯' },
    { id: 'items',        name: 'Предметы',    icon: '⚔️' },
    { id: 'moba',         name: 'MOBA',        icon: '👹' },
    { id: 'subscription', name: 'Подписки',    icon: '🎫' }
  ];

  // Картинки для товаров
  const productImages = {
    steam: 'https://store.cloudflare.steamstatic.com/public/shared/images/header/logo_steam.svg',
    games: 'https://cdn.akamai.steamstatic.com/steam/apps/1245620/header.jpg',
    items: 'https://cdn.akamai.steamstatic.com/steam/apps/730/header.jpg'
  };

  let filtered = products
    .filter(p => selectedCategory === 'all' || p.category === selectedCategory)
    .filter(p => p.price >= priceRange[0] && p.price <= priceRange[1]);

  if (textQuery && textQuery.trim()) {
    const q = textQuery.trim().toLowerCase();
    filtered = filtered.filter(p => {
      const hay = [
        p.name,
        p.description,
        p.category,
        p.genre,
        ...(p.tags || [])
      ].filter(Boolean).join(' ').toLowerCase();
      return hay.includes(q);
    });
  }

  if (sortBy === 'price-asc') {
    filtered = [...filtered].sort((a, b) => a.price - b.price);
  } else if (sortBy === 'price-desc') {
    filtered = [...filtered].sort((a, b) => b.price - a.price);
  } else if (sortBy === 'rating') {
    filtered = [...filtered].sort((a, b) => b.rating - a.rating);
  }

  const handleAddToCart = (product) => {
    onAddToCart(product);
    setNotification(`✓ ${product.name} добавлен в корзину`);
    setTimeout(() => setNotification(null), 2500);
  };

  return (
    <div className="catalog-page">
      {/* Toast уведомление */}
      {notification && (
        <div className="toast-notification show">
          {notification}
        </div>
      )}

      <div className="catalog-container">
        {/* Sidebar */}
        <aside className="catalog-sidebar">
          <div className="sidebar-section">
            <h3>📁 Категории</h3>
            <div className="categories-list">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  className={`category-btn ${selectedCategory === cat.id ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(cat.id)}
                >
                  <span className="cat-icon">{cat.icon}</span>
                  <span className="cat-name">{cat.name}</span>
                  <span className="cat-count">
                    {cat.id === 'all' ? products.length : products.filter(p => p.category === cat.id).length}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="sidebar-section">
            <h3>💰 Цена</h3>
            <div className="price-filter">
              <div className="price-inputs">
                <div className="price-input-wrap">
                  <input 
                    type="number" 
                    min="0" 
                    value={priceRange[0]}
                    onChange={(e) => setPriceRange([parseInt(e.target.value) || 0, priceRange[1]])}
                    placeholder="От"
                  />
                  <span className="currency">₽</span>
                </div>
                <span className="price-separator">—</span>
                <div className="price-input-wrap">
                  <input 
                    type="number" 
                    max="10000"
                    value={priceRange[1]}
                    onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value) || 5000])}
                    placeholder="До"
                  />
                  <span className="currency">₽</span>
                </div>
              </div>
            </div>
          </div>

          <div className="sidebar-section">
            <h3>📊 Сортировка</h3>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="sort-select">
              <option value="popular">Популярные</option>
              <option value="price-asc">Сначала дешевле</option>
              <option value="price-desc">Сначала дороже</option>
              <option value="rating">По рейтингу</option>
            </select>
          </div>
        </aside>

        {/* Main Content */}
        <div className="catalog-main">
          <div className="catalog-header">
            <h1>
              {selectedCategory === 'all' ? 'Все товары' : 
               categories.find(c => c.id === selectedCategory)?.name}
            </h1>
            <span className="products-count">{filtered.length} товаров</span>
          </div>

          {loading ? (
            <div className="catalog-loading">
              <div className="spinner"></div>
              <p>Загрузка...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="catalog-empty">
              <div className="empty-icon">🔍</div>
              <h2>Товары не найдены</h2>
              <p>Попробуйте изменить фильтры</p>
              <button onClick={() => { setSelectedCategory('all'); setPriceRange([0, 5000]); }} className="btn-reset">
                Сбросить фильтры
              </button>
            </div>
          ) : (
            <div className="catalog-grid">
              {filtered.map(product => (
                <article key={product.id} className={`product-card ${product.isService ? 'service-card' : ''}`}>
                  {product.badge && (
                    <div className={`product-badge badge-${product.badge}`}>
                      {product.badge === 'popular' && '⭐ Хит'}
                      {product.badge === 'hit' && '🔥 Топ'}
                      {product.badge === 'new' && '✨ Новое'}
                      {product.badge === 'free' && '🎁 Free'}
                    </div>
                  )}
                  
                  {product.isService && (
                    <div className="service-badge">⚡ Услуга</div>
                  )}

                  {product.isService ? (
                    <div 
                      className="product-image-link service-link"
                      onClick={() => navigate(product.serviceUrl)}
                    >
                      <div className="product-image service-image">
                        <img 
                          src={product.image} 
                          alt={product.name}
                          loading="lazy"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                        <div className="product-image-fallback">
                          <span className="fallback-icon">💳</span>
                        </div>
                        <div className="service-overlay">
                          <span className="service-icon">💳</span>
                          <span className="service-text">Пополнить →</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <Link to={`/product/${product.id}`} className="product-image-link">
                      <div className="product-image">
                        <img 
                          src={product.image} 
                          alt={product.name}
                          loading="lazy"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                        <div className="product-image-fallback">
                          <span className="fallback-icon">
                            {product.category === 'steam' && '💳'}
                            {product.category === 'games' && '🎮'}
                            {product.category === 'items' && '⚔️'}
                            {product.category === 'moba' && '👹'}
                            {product.category === 'subscription' && '🎫'}
                          </span>
                        </div>
                      </div>
                    </Link>
                  )}

                  <div className="product-body">
                    <div className="product-category-tag">
                      {categories.find(c => c.id === product.category)?.icon} {categories.find(c => c.id === product.category)?.name}
                    </div>
                    
                    {product.isService ? (
                      <div 
                        className="product-title-link service-link"
                        onClick={() => navigate(product.serviceUrl)}
                      >
                        <h3 className="product-title">{product.name}</h3>
                      </div>
                    ) : (
                      <Link to={`/product/${product.id}`} className="product-title-link">
                        <h3 className="product-title">{product.name}</h3>
                      </Link>
                    )}

                    <p className="product-desc">{product.description}</p>

                    <div className="product-meta">
                      <div className="product-rating">
                        <span className="stars">{'★'.repeat(Math.round(product.rating))}</span>
                        <span className="rating-text">{product.rating}</span>
                      </div>
                      <span className="reviews">({product.reviews} отзывов)</span>
                    </div>

                    <div className="product-footer">
                      <div className="product-price">
                        {product.isService ? (
                          <span className="price-from">от {product.price} ₽</span>
                        ) : product.price === 0 ? (
                          <span className="price-free">Бесплатно</span>
                        ) : (
                          <span className="price-value">{product.price} ₽</span>
                        )}
                      </div>
                      {product.isService ? (
                        <button 
                          className="btn-service"
                          onClick={() => navigate(product.serviceUrl)}
                        >
                          Пополнить →
                        </button>
                      ) : (
                        <button 
                          className="btn-add-to-cart"
                          onClick={() => handleAddToCart(product)}
                        >
                          В корзину
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Catalog;
