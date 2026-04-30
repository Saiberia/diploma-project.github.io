import { Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { ordersAPI } from '../services/api';

function Orders({ user }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const { data } = await ordersAPI.getHistory();
        if (!cancelled) setOrders(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!cancelled) setError('Не удалось загрузить историю заказов');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const normalized = useMemo(() => {
    return (orders || []).map((o) => {
      // demo-shape from backend fallback: {id, productName, price, status, createdAt}
      if (o && o.productName && o.price != null) {
        return {
          id: o.id,
          items: [{ name: o.productName, icon: '🎮' }],
          total: o.price,
          status: o.status || 'processing',
          date: o.createdAt ? new Date(o.createdAt).toLocaleDateString('ru-RU') : '',
          deliveredAt: o.status === 'completed' && o.createdAt ? new Date(o.createdAt).toLocaleString('ru-RU') : null
        };
      }
      // real order shape: {id, items, totalPrice, status, createdAt}
      const total = o?.totalPrice ?? o?.total ?? 0;
      return {
        id: o?.id || 'ORDER',
        items: (o?.items || []).map(it => ({ name: `Товар #${it.productId} ×${it.quantity || 1}`, icon: '🎮' })),
        total,
        status: o?.status || 'processing',
        date: o?.createdAt ? new Date(o.createdAt).toLocaleDateString('ru-RU') : '',
        deliveredAt: o?.status === 'completed' && o?.updatedAt ? new Date(o.updatedAt).toLocaleString('ru-RU') : null
      };
    });
  }, [orders]);

  return (
    <div className="orders-page">
      <div className="orders-container">
        <div className="page-header">
          <h1>Мои заказы</h1>
          <span className="orders-count">{normalized.length} заказов</span>
        </div>

        {loading && (
          <div className="orders-empty">
            <div className="empty-icon">⏳</div>
            <h2>Загрузка…</h2>
            <p>Получаем историю заказов</p>
          </div>
        )}

        {!loading && error && (
          <div className="orders-empty">
            <div className="empty-icon">⚠️</div>
            <h2>Ошибка</h2>
            <p>{error}</p>
            <Link to="/catalog" className="btn-primary">Перейти в каталог</Link>
          </div>
        )}

        {!loading && !error && normalized.length === 0 ? (
          <div className="orders-empty">
            <div className="empty-icon">📦</div>
            <h2>Заказов пока нет</h2>
            <p>Ваши покупки появятся здесь</p>
            <Link to="/catalog" className="btn-primary">Перейти в каталог</Link>
          </div>
        ) : (
          <div className="orders-list">
            {normalized.map(order => (
              <div key={order.id} className={`order-card status-${order.status}`}>
                <div className="order-header">
                  <div className="order-id">
                    <span className="label">Заказ</span>
                    <span className="value">#{order.id}</span>
                  </div>
                  <div className={`order-status ${order.status}`}>
                    {order.status === 'completed' && <><span className="status-dot"></span> Выполнен</>}
                    {order.status === 'processing' && <><span className="status-dot"></span> В обработке</>}
                    {order.status === 'pending' && <><span className="status-dot"></span> Ожидает</>}
                    {order.status === 'pending_verification' && <><span className="status-dot"></span> Верификация</>}
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
                      ✓ Доставлено {order.deliveredAt || ''}
                    </div>
                  )}
                  
                  {(order.status === 'processing' || order.status === 'pending' || order.status === 'pending_verification') && (
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
