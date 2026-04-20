import { Link } from 'react-router-dom';

function Orders({ user }) {
  const orders = [
    {
      id: 'NOVA-2026-001',
      items: [{ name: 'Steam Wallet 500 ₽', icon: '💳' }],
      total: 500,
      status: 'completed',
      date: '12 января 2026',
      deliveredAt: '12 января 2026, 15:30'
    },
    {
      id: 'NOVA-2026-002',
      items: [{ name: 'Valorant Battle Pass', icon: '🎯' }],
      total: 599,
      status: 'completed',
      date: '10 января 2026',
      deliveredAt: '10 января 2026, 12:15'
    },
    {
      id: 'NOVA-2026-003',
      items: [{ name: 'V-Bucks 1000', icon: '🎮' }, { name: 'Robux 1000', icon: '⚔️' }],
      total: 1548,
      status: 'processing',
      date: '12 января 2026',
      deliveredAt: null
    }
  ];

  if (!user) {
    return (
      <div className="orders-page">
        <div className="orders-container">
          <div className="auth-required">
            <div className="auth-icon">🔐</div>
            <h2>Войдите в аккаунт</h2>
            <p>Для просмотра заказов необходима авторизация</p>
            <Link to="/profile" className="btn-primary">Войти</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="orders-page">
      <div className="orders-container">
        <div className="page-header">
          <h1>Мои заказы</h1>
          <span className="orders-count">{orders.length} заказов</span>
        </div>

        {orders.length === 0 ? (
          <div className="orders-empty">
            <div className="empty-icon">📦</div>
            <h2>Заказов пока нет</h2>
            <p>Ваши покупки появятся здесь</p>
            <Link to="/catalog" className="btn-primary">Перейти в каталог</Link>
          </div>
        ) : (
          <div className="orders-list">
            {orders.map(order => (
              <div key={order.id} className={`order-card status-${order.status}`}>
                <div className="order-header">
                  <div className="order-id">
                    <span className="label">Заказ</span>
                    <span className="value">#{order.id}</span>
                  </div>
                  <div className={`order-status ${order.status}`}>
                    {order.status === 'completed' && <><span className="status-dot"></span> Выполнен</>}
                    {order.status === 'processing' && <><span className="status-dot"></span> В обработке</>}
                    {order.status === 'cancelled' && <><span className="status-dot"></span> Отменён</>}
                  </div>
                </div>

                <div className="order-items">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="order-item">
                      <span className="item-icon">{item.icon}</span>
                      <span className="item-name">{item.name}</span>
                    </div>
                  ))}
                </div>

                <div className="order-footer">
                  <div className="order-meta">
                    <div className="meta-item">
                      <span className="meta-label">Дата</span>
                      <span className="meta-value">{order.date}</span>
                    </div>
                    <div className="meta-item">
                      <span className="meta-label">Сумма</span>
                      <span className="meta-value price">{order.total} ₽</span>
                    </div>
                  </div>
                  
                  {order.status === 'completed' && (
                    <div className="order-delivered">
                      ✓ Доставлено {order.deliveredAt}
                    </div>
                  )}
                  
                  {order.status === 'processing' && (
                    <div className="order-processing">
                      ⏳ Ожидайте, заказ обрабатывается...
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Orders;
