import { Link } from 'react-router-dom';

function Categories() {
  const categories = [
    {
      id: 'steam',
      name: 'Steam',
      icon: '💳',
      image: 'https://store.cloudflare.steamstatic.com/public/shared/images/header/logo_steam.svg',
      description: 'Пополнение кошелька Steam, подарочные карты',
      count: 15,
      color: '#1b2838',
      gradient: 'linear-gradient(135deg, #1b2838 0%, #2a475e 100%)'
    },
    {
      id: 'games',
      name: 'Игры',
      icon: '🎮',
      image: 'https://cdn.akamai.steamstatic.com/steam/apps/1245620/header.jpg',
      description: 'Ключи игр, лицензии, подписки',
      count: 25,
      color: '#7c3aed',
      gradient: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)'
    },
    {
      id: 'items',
      name: 'Игровые предметы',
      icon: '⚔️',
      image: 'https://cdn.akamai.steamstatic.com/steam/apps/730/header.jpg',
      description: 'V-Bucks, Robux, боевые пропуски',
      count: 30,
      color: '#059669',
      gradient: 'linear-gradient(135deg, #059669 0%, #10b981 100%)'
    },
    {
      id: 'moba',
      name: 'MOBA игры',
      icon: '👹',
      image: 'https://cdn.cloudflare.steamstatic.com/steam/apps/570/header.jpg',
      description: 'Dota 2, League of Legends и др.',
      count: 10,
      color: '#dc2626',
      gradient: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)'
    }
  ];

  const popularItems = [
    { name: 'Steam 500₽', price: 500, icon: '💳', category: 'steam' },
    { name: 'V-Bucks 1000', price: 799, icon: '🎮', category: 'items' },
    { name: 'Robux 1000', price: 749, icon: '⚔️', category: 'items' },
    { name: 'Valorant BP', price: 599, icon: '🎯', category: 'items' }
  ];

  return (
    <div className="categories-page">
      <div className="categories-container">
        {/* Header */}
        <div className="page-header">
          <h1>Категории товаров</h1>
          <p>Выберите категорию для просмотра товаров</p>
        </div>

        {/* Main Categories */}
        <div className="main-categories">
          {categories.map(cat => (
            <Link
              key={cat.id}
              to={`/catalog?category=${cat.id}`}
              className="category-card-large"
              style={{ background: cat.gradient }}
            >
              <div className="category-card-content">
                <span className="category-icon-large">{cat.icon}</span>
                <div className="category-info">
                  <h2>{cat.name}</h2>
                  <p>{cat.description}</p>
                  <span className="category-count-badge">{cat.count} товаров</span>
                </div>
              </div>
              <div className="category-arrow">→</div>
            </Link>
          ))}
        </div>

        {/* Popular Items */}
        <section className="popular-section">
          <div className="section-header">
            <h2>🔥 Популярные товары</h2>
            <Link to="/catalog" className="view-all">Смотреть все →</Link>
          </div>
          
          <div className="popular-grid">
            {popularItems.map((item, idx) => (
              <Link to={`/catalog?category=${item.category}`} key={idx} className="popular-item">
                <div className="popular-icon">{item.icon}</div>
                <div className="popular-info">
                  <h4>{item.name}</h4>
                  <span className="popular-price">{item.price} ₽</span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Info Section */}
        <section className="info-section">
          <div className="info-cards">
            <div className="info-card">
              <span className="info-icon">⚡</span>
              <h3>Мгновенная доставка</h3>
              <p>Получите товар сразу после оплаты</p>
            </div>
            <div className="info-card">
              <span className="info-icon">🔒</span>
              <h3>Безопасно</h3>
              <p>Гарантия на все товары</p>
            </div>
            <div className="info-card">
              <span className="info-icon">💬</span>
              <h3>Поддержка 24/7</h3>
              <p>Ответим на любые вопросы</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default Categories;
