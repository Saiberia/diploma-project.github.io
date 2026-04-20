import { Link } from 'react-router-dom';

function Deals() {
  const deals = [
    {
      id: 1,
      name: 'Steam 1000₽ со скидкой',
      originalPrice: 1000,
      dealPrice: 890,
      discount: 11,
      icon: '💳',
      description: 'Быстрое пополнение кошелька',
      badge: 'Популярная',
      endsIn: '2 дня'
    },
    {
      id: 2,
      name: 'Valorant Battle Pass',
      originalPrice: 599,
      dealPrice: 499,
      discount: 17,
      icon: '🎯',
      description: 'Современный сезон',
      badge: 'Горячая',
      endsIn: '5 дней'
    },
    {
      id: 3,
      name: 'CS2 Pass + Бонус',
      originalPrice: 699,
      dealPrice: 549,
      discount: 21,
      icon: '⚔️',
      description: 'С дополнительными предметами',
      badge: 'Мега',
      endsIn: '3 дня'
    },
    {
      id: 4,
      name: 'Steam 500₽ Bundle',
      originalPrice: 500,
      dealPrice: 450,
      discount: 10,
      icon: '🪲',
      description: 'Двойное пополнение со скидкой',
      badge: 'Новое',
      endsIn: '1 день'
    },
    {
      id: 5,
      name: 'Dota 2 Cosmetics Pack',
      originalPrice: 1200,
      dealPrice: 899,
      discount: 25,
      icon: '👹',
      description: 'Коллекция редких предметов',
      badge: 'Супер',
      endsIn: '6 дней'
    },
    {
      id: 6,
      name: 'Комбо: All Games',
      originalPrice: 2999,
      dealPrice: 1999,
      discount: 33,
      icon: '🎮',
      description: 'Несколько популярных товаров',
      badge: 'Лучшая',
      endsIn: '4 дня'
    }
  ];

  const getBadgeColor = (badge) => {
    switch (badge) {
      case 'Популярная': return '#3b82f6';
      case 'Горячая': return '#ef4444';
      case 'Мега': return '#a855f7';
      case 'Новое': return '#10b981';
      case 'Супер': return '#f59e0b';
      case 'Лучшая': return '#06b6d4';
      default: return '#6b7280';
    }
  };

  return (
    <div className="deals-page">
      <div className="deals-container">
        <div className="deals-header">
          <div>
            <h1>🎁 Акции и скидки</h1>
            <p>Лучшие предложения доступны прямо сейчас!</p>
          </div>
          <div className="deals-timer">
            <div className="timer-item">
              <span className="timer-label">Обновляем каждый день</span>
            </div>
          </div>
        </div>

        <div className="deals-filters">
          <button className="filter-btn active">🔥 Все акции</button>
          <button className="filter-btn">💰 Скидка 10-20%</button>
          <button className="filter-btn">🚀 Скидка 20%+</button>
          <button className="filter-btn">⏰ Заканчивается скоро</button>
        </div>

        <div className="deals-grid">
          {deals.map(deal => {
            const savings = deal.originalPrice - deal.dealPrice;
            return (
              <div key={deal.id} className="deal-card">
                <div className="deal-header-section">
                  <div className="deal-icon">{deal.icon}</div>
                  <div
                    className="deal-badge"
                    style={{ backgroundColor: getBadgeColor(deal.badge) }}
                  >
                    {deal.badge}
                  </div>
                </div>

                <h3 className="deal-title">{deal.name}</h3>
                <p className="deal-desc">{deal.description}</p>

                <div className="deal-pricing">
                  <div className="price-section">
                    <span className="original-price">{deal.originalPrice}₽</span>
                    <span className="deal-price">{deal.dealPrice}₽</span>
                  </div>
                  <div className="discount-section">
                    <span className="discount-percent">-{deal.discount}%</span>
                    <span className="savings">Экономия: {savings}₽</span>
                  </div>
                </div>

                <div className="deal-timer-small">
                  ⏰ Осталось: {deal.endsIn}
                </div>

                <button className="btn-deal">
                  💳 Купить сейчас
                </button>
              </div>
            );
          })}
        </div>

        {/* Promo section */}
        <section className="deals-promo">
          <div className="promo-content">
            <h2>✨ Подпишитесь на обновления</h2>
            <p>Узнавайте первыми о новых акциях и скидках</p>
            <div className="promo-input">
              <input
                type="email"
                placeholder="Ваш email..."
              />
              <button className="btn-primary">Подписаться</button>
            </div>
          </div>
        </section>

        {/* FAQ section */}
        <section className="deals-faq">
          <h2>❓ Вопросы по акциям</h2>
          <div className="faq-grid">
            <div className="faq-item">
              <h4>Как часто бывают скидки?</h4>
              <p>Мы обновляем акции каждый день. Рекомендуем подписаться на Telegram для уведомлений.</p>
            </div>
            <div className="faq-item">
              <h4>Можно ли комбинировать скидки?</h4>
              <p>Каждая акция действует отдельно. Одновременно применять несколько скидок нельзя.</p>
            </div>
            <div className="faq-item">
              <h4>Что если цена упала после покупки?</h4>
              <p>Свяжитесь с поддержкой через чат, и мы поможем вернуть разницу в течение 24 часов.</p>
            </div>
            <div className="faq-item">
              <h4>Есть ли скидки для постоянных клиентов?</h4>
              <p>Да! После 10 покупок вы получаете 5% скидку на все товары автоматически.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default Deals;
