import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Checkout.css';
import { ordersAPI, aiAPI } from '../services/api';

function Checkout({ cartItems, user, onClearCart }) {
  const navigate = useNavigate();
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [formData, setFormData] = useState({
    email: user?.email || '',
    name:  user?.username || '',
    gameAccount: '',
    notes: ''
  });
  const [orderResult, setOrderResult] = useState(null); // {order, fraudCheck}
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const total = cartItems.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting || cartItems.length === 0) return;
    setSubmitting(true);
    setError(null);

    try {
      // Логируем покупку для рекомендательного движка
      const purchasedIds = cartItems.map(i => i.id);
      const prevPurchased = JSON.parse(localStorage.getItem('purchasedProducts') || '[]');
      const updatedPurchased = [...new Set([...purchasedIds, ...prevPurchased])].slice(0, 50);
      localStorage.setItem('purchasedProducts', JSON.stringify(updatedPurchased));

      // Реальный POST в backend (там сработает антифрод-движок)
      const { data } = await ordersAPI.create({
        productIds:   cartItems.map(i => ({ productId: i.id, quantity: i.quantity || 1 })),
        totalPrice:   total,
        paymentMethod,
        userId:       user?.id || 'guest',
        customerInfo: formData
      });

      // Трекаем покупку в AI-движке
      if (user?.id) {
        for (const item of cartItems) {
          aiAPI.track(user.id, 'purchase', {
            productId: item.id,
            category:  item.category,
            price:     item.price
          }).catch(() => {});
        }
      }

      setOrderResult(data);
      if (onClearCart) onClearCart();

      setTimeout(() => navigate('/orders'), 5000);
    } catch (err) {
      const status = err.response?.status;
      const body   = err.response?.data;
      if (status === 403 && body?.error?.includes('fraud')) {
        setError({
          type: 'fraud',
          riskScore: body.riskScore,
          triggers:  body.triggers,
          recommendation: body.recommendation
        });
      } else {
        setError({ type: 'generic', message: body?.error || 'Ошибка оформления заказа. Попробуйте ещё раз.' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (orderResult) {
    const { order, fraudCheck } = orderResult;
    return (
      <div className="checkout-page">
        <div className="order-success">
          <div className="success-icon">✓</div>
          <h1>Заказ успешно создан!</h1>
          <div className="order-details">
            <p>Номер заказа: <strong>{order.id}</strong></p>
            <p>Сумма: <strong>{order.totalPrice} ₽</strong></p>
            <p>Статус: <strong>{order.status}</strong></p>
          </div>

          {fraudCheck && (
            <div className={`fraud-status fraud-${fraudCheck.riskLevel}`}>
              <strong>🛡️ Антифрод-проверка:</strong>{' '}
              risk = {fraudCheck.riskScore}/100 ({fraudCheck.riskLevel})
              {fraudCheck.requiresVerification && (
                <p className="warn">⚠️ Требуется дополнительная верификация по SMS/Email</p>
              )}
            </div>
          )}

          <p className="redirect-message">Переход в «Мои заказы» через 5 сек…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-page">
      <div className="checkout-container">
        <h1>Оформление заказа</h1>

        {error && error.type === 'fraud' && (
          <div className="fraud-alert">
            <h3>🚫 Транзакция заблокирована антифрод-системой</h3>
            <p>Risk score: <strong>{error.riskScore}/100</strong></p>
            <p>{error.recommendation}</p>
            <details>
              <summary>Сработавшие триггеры ({error.triggers?.length || 0})</summary>
              <ul>
                {(error.triggers || []).map((t, i) => <li key={i}><code>{t}</code></li>)}
              </ul>
            </details>
            <p className="hint">
              Для тестирования: создайте 3 заказа подряд (velocity user), 5 заказов с одного IP за час, или один крупный (&gt;5×ср.чека).
            </p>
          </div>
        )}

        {error && error.type === 'generic' && (
          <div className="checkout-error">{error.message}</div>
        )}

        <div className="checkout-layout">
          <form className="checkout-form" onSubmit={handleSubmit}>
            <section className="form-section">
              <h2>1️⃣ Ваши данные</h2>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="your@email.com"
                />
              </div>

              <div className="form-group">
                <label>Имя / Никнейм</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="Ваше имя"
                />
              </div>

              <div className="form-group">
                <label>Игровой аккаунт (если требуется)</label>
                <input
                  type="text"
                  name="gameAccount"
                  value={formData.gameAccount}
                  onChange={handleChange}
                  placeholder="Steam ID, Epic ID и т.д."
                />
              </div>
            </section>

            <section className="form-section">
              <h2>2️⃣ Способ оплаты</h2>
              <div className="payment-options">
                <label className={`payment-option ${paymentMethod === 'card' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    value="card"
                    checked={paymentMethod === 'card'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  />
                  <span className="option-icon">💳</span>
                  <span className="option-text">Карта</span>
                </label>

                <label className={`payment-option ${paymentMethod === 'telegram' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    value="telegram"
                    checked={paymentMethod === 'telegram'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  />
                  <span className="option-icon">💬</span>
                  <span className="option-text">Телеграм</span>
                </label>

                <label className={`payment-option ${paymentMethod === 'crypto' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    value="crypto"
                    checked={paymentMethod === 'crypto'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  />
                  <span className="option-icon">₿</span>
                  <span className="option-text">Крипто</span>
                </label>
              </div>
            </section>

            <section className="form-section">
              <h2>3️⃣ Комментарий</h2>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Дополнительная информация (опционально)"
                rows="4"
              ></textarea>
            </section>

            <button type="submit" className="btn-submit" disabled={submitting || cartItems.length === 0}>
              {submitting ? 'Обработка…' : `Оплатить ${total} ₽ →`}
            </button>
          </form>

          <aside className="checkout-summary">
            <div className="summary-box">
              <h2>Ваш заказ</h2>

              <div className="order-items">
                {cartItems.map(item => (
                  <div key={item.id} className="order-item">
                    <div className="item-info">
                      <span className="item-title">{item.name}</span>
                      <span className="item-qty">x{item.quantity || 1}</span>
                    </div>
                    <span className="item-cost">{item.price * (item.quantity || 1)} ₽</span>
                  </div>
                ))}
              </div>

              <div className="divider"></div>

              <div className="cost-breakdown">
                <div className="cost-line">
                  <span>Товары:</span>
                  <strong>{total} ₽</strong>
                </div>
                <div className="cost-line">
                  <span>Доставка:</span>
                  <strong className="free">БЕСПЛАТНО</strong>
                </div>
              </div>

              <div className="total-cost">
                <span>Итого:</span>
                <strong>{total} ₽</strong>
              </div>

              <div className="info-box">
                <p>✓ Быстрая обработка</p>
                <p>✓ Безопасная оплата</p>
                <p>✓ Гарантия</p>
                <p>🛡️ Антифрод-защита</p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

export default Checkout;
