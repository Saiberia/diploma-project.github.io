import { Link } from 'react-router-dom';
import { useState } from 'react';

function Cart({ items, onRemove, onUpdate }) {
  const [promoCode, setPromoCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [promoStatus, setPromoStatus] = useState(null); // 'success', 'error', null

  const total = items.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);
  const finalTotal = Math.max(0, total - discount);
  const itemCount = items.length;

  const handlePromoCode = () => {
    if (promoCode.toUpperCase() === 'NOVA10') {
      setDiscount(total * 0.1);
      setPromoStatus({ type: 'success', message: 'Промокод применён! Скидка 10%' });
    } else if (promoCode.toUpperCase() === 'SAVE20') {
      setDiscount(total * 0.2);
      setPromoStatus({ type: 'success', message: 'Промокод применён! Скидка 20%' });
    } else {
      setPromoStatus({ type: 'error', message: 'Неверный промокод' });
      setDiscount(0);
    }
    setTimeout(() => setPromoStatus(null), 3000);
  };

  const handleQuantityChange = (itemId, newQuantity) => {
    if (newQuantity > 0 && onUpdate) {
      onUpdate(itemId, newQuantity);
    }
  };

  if (itemCount === 0) {
    return (
      <div className="cart-page">
        <div className="cart-container">
          <div className="cart-empty">
            <div className="empty-icon">🛒</div>
            <h2>Корзина пуста</h2>
            <p>Добавьте товары из каталога</p>
            <Link to="/catalog" className="btn-primary">Перейти в каталог</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-page">
      <div className="cart-container">
        <div className="page-header">
          <h1>Корзина</h1>
          <span className="items-count">{itemCount} товаров</span>
        </div>

        <div className="cart-layout">
          {/* Cart Items */}
          <div className="cart-items">
            {items.map(item => (
              <div key={item.id} className="cart-item">
                <div className="cart-item-image">
                  {item.category === 'steam' && '💳'}
                  {item.category === 'games' && '🎮'}
                  {item.category === 'items' && '⚔️'}
                </div>

                <div className="cart-item-details">
                  <Link to={`/product/${item.id}`} className="cart-item-name">
                    {item.name}
                  </Link>
                  <span className="cart-item-category">{item.category}</span>
                </div>

                <div className="cart-item-quantity">
                  <button
                    className="qty-btn"
                    onClick={() => handleQuantityChange(item.id, (item.quantity || 1) - 1)}
                  >−</button>
                  <span className="qty-value">{item.quantity || 1}</span>
                  <button
                    className="qty-btn"
                    onClick={() => handleQuantityChange(item.id, (item.quantity || 1) + 1)}
                  >+</button>
                </div>

                <div className="cart-item-price">
                  {item.price * (item.quantity || 1)} ₽
                </div>

                <button
                  className="cart-item-remove"
                  onClick={() => onRemove(item.id)}
                  title="Удалить"
                >×</button>
              </div>
            ))}
          </div>

          {/* Cart Summary */}
          <div className="cart-summary">
            <h3>Итого</h3>
            
            <div className="summary-row">
              <span>Товары ({itemCount})</span>
              <span>{total} ₽</span>
            </div>

            {discount > 0 && (
              <div className="summary-row discount">
                <span>Скидка</span>
                <span className="discount-value">-{discount.toFixed(0)} ₽</span>
              </div>
            )}

            <div className="summary-row total">
              <span>К оплате</span>
              <span className="total-value">{finalTotal.toFixed(0)} ₽</span>
            </div>

            {/* Promo Code */}
            <div className="promo-section">
              <div className="promo-input-group">
                <input
                  type="text"
                  placeholder="Промокод"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handlePromoCode()}
                />
                <button onClick={handlePromoCode}>OK</button>
              </div>
              {promoStatus && (
                <div className={`promo-message ${promoStatus.type}`}>
                  {promoStatus.type === 'success' ? '✓' : '✗'} {promoStatus.message}
                </div>
              )}
            </div>

            <Link to="/checkout" className="btn-checkout">
              Оформить заказ
            </Link>

            <div className="payment-methods">
              <span>💳</span>
              <span>📱</span>
              <span>₿</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Cart;
