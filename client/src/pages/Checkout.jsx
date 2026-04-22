import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Checkout.css';

function Checkout({ cartItems, user }) {
  const navigate = useNavigate();
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [formData, setFormData] = useState({
    email: user?.email || '',
    name: user?.username || '',
    gameAccount: '',
    notes: ''
  });
  const [orderCreated, setOrderCreated] = useState(false);

  const total = cartItems.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Mock order creation
    const order = {
      id: 'ord_' + Math.random().toString(36).substr(2, 9),
      items: cartItems,
      total: total,
      customer: formData,
      paymentMethod: paymentMethod,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    console.log('Order created:', order);
    setOrderCreated(true);

    setTimeout(() => {
      navigate('/');
    }, 3000);
  };

  if (orderCreated) {
    return (
      <div className="checkout-page">
        <div className="order-success">
          <div className="success-icon">✓</div>
          <h1>Заказ успешно создан!</h1>
          <p>Спасибо за покупку</p>
          <div className="order-details">
            <p>Номер заказа: <strong>ORD-{Date.now()}</strong></p>
            <p>Сумма: <strong>{total} ₽</strong></p>
          </div>
          <p className="redirect-message">Переход на главную через 3 сек...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-page">
      <div className="checkout-container">
        <h1>Оформление заказа</h1>

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

            <button type="submit" className="btn-submit">
              Оплатить {total} ₽ →
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
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

export default Checkout;
