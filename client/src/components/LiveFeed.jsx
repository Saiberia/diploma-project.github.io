import { useState, useEffect } from 'react';
import '../styles/LiveFeed.css';

function LiveFeed() {
  const [orders, setOrders] = useState([
    { id: 1, user: 'Иван П.', product: 'Steam 500₽', time: '1м назад', city: 'Москва' },
    { id: 2, user: 'Мария К.', product: 'Valorant BP', time: '3м назад', city: 'СПб' },
    { id: 3, user: 'Алекс Ш.', product: 'CS2 Pass', time: '5м назад', city: 'Екатеринбург' },
    { id: 4, user: 'Елена В.', product: 'Steam 1000₽', time: '7м назад', city: 'Новосибирск' },
    { id: 5, user: 'Сергей М.', product: 'Dota 2 BP', time: '9м назад', city: 'Казань' },
  ]);

  useEffect(() => {
    // Добавляй новые заказы каждые 3-5 секунд
    const interval = setInterval(() => {
      const names = ['Иван П.', 'Мария К.', 'Алекс Ш.', 'Елена В.', 'Сергей М.', 'Виктор Л.', 'Анна Р.', 'Петр П.'];
      const products = ['Steam 500₽', 'Steam 1000₽', 'Valorant BP', 'CS2 Pass', 'Dota 2 BP', 'Phasmophobia', 'Honkai Pass'];
      const cities = ['Москва', 'СПб', 'Екатеринбург', 'Новосибирск', 'Казань', 'Владивосток', 'Уфа', 'Челябинск'];

      const newOrder = {
        id: Math.random(),
        user: names[Math.floor(Math.random() * names.length)],
        product: products[Math.floor(Math.random() * products.length)],
        time: 'только что',
        city: cities[Math.floor(Math.random() * cities.length)]
      };

      setOrders(prev => [newOrder, ...prev.slice(0, 9)]);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="live-feed">
      <div className="feed-header">
        <h3>🔥 Последние покупки</h3>
        <span className="feed-live">●●● LIVE</span>
      </div>
      <div className="feed-list">
        {orders.map(order => (
          <div key={order.id} className="feed-item">
            <div className="feed-icon">✓</div>
            <div className="feed-content">
              <span className="feed-user">{order.user}</span>
              <span className="feed-product">купил {order.product}</span>
            </div>
            <div className="feed-meta">
              <span className="feed-city">{order.city}</span>
              <span className="feed-time">{order.time}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default LiveFeed;
