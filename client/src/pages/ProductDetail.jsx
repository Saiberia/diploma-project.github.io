import { useParams, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import AIRecommendations, { trackProductView } from '../components/AIRecommendations';
import { aiAPI } from '../services/api';

function ProductDetail({ products, user, onAddToCart }) {
  const { id } = useParams();
  const product = products.find(p => p.id === parseInt(id));
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [selectedTab, setSelectedTab] = useState('description');

  useEffect(() => {
    if (!product) return;
    trackProductView(product.id);

    // Поведенческий трек на backend — чтобы в админке наполнялась вкладка Behavior.
    if (user?.id) {
      aiAPI.track(user.id, 'view', {
        productId: product.id,
        category: product.category,
        price: product.price,
        game: product.genre || null
      }).catch(() => {});
    }
  }, [product?.id, user?.id]);

  if (!product) {
    return (
      <div className="product-detail-page">
        <div className="detail-container">
          <div className="not-found">
            <div className="not-found-icon">❌</div>
            <h2>Товар не найден</h2>
            <p>К сожалению, этого товара нет в нашем каталоге</p>
            <Link to="/catalog" className="btn-primary">← Вернуться в каталог</Link>
          </div>
        </div>
      </div>
    );
  }

  const handleAddToCart = () => {
    for (let i = 0; i < quantity; i++) {
      onAddToCart(product);
    }
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="product-detail-page">
      <div className="detail-container">
        {/* Breadcrumb */}
        <nav className="breadcrumb">
          <Link to="/">🏠 Главная</Link>
          <span className="sep">›</span>
          <Link to="/catalog">📦 Каталог</Link>
          <span className="sep">›</span>
          <span className="current">{product.name}</span>
        </nav>

        {/* Main Content */}
        <div className="product-detail-layout">
          {/* Image Section */}
          <div className="detail-image-section">
            <div className="image-container">
              <img src={product.image} alt={product.name} className="detail-image" />
              {product.badge && (
                <div className={`product-badge badge-${product.badge}`}>
                  {product.badge === 'popular' && '⭐ Популярное'}
                  {product.badge === 'hit' && '🔥 Хит'}
                  {product.badge === 'new' && '✨ Новое'}
                </div>
              )}
            </div>
            
            {/* Category Icon */}
            <div className="category-badge">
              {product.category === 'steam' && '💳 Steam'}
              {product.category === 'games' && '🎮 Игры'}
              {product.category === 'items' && '⚔️ Предметы'}
              {product.category === 'moba' && '👹 MOBA'}
            </div>
          </div>

          {/* Info Section */}
          <div className="detail-info-section">
            {/* Title & Rating */}
            <h1 className="detail-title">{product.name}</h1>

            <div className="detail-rating">
              <div className="stars">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className={i < Math.round(product.rating) ? 'filled' : ''}>★</span>
                ))}
              </div>
              <span className="rating-value">{product.rating}</span>
              <span className="reviews-count">({product.reviews} отзывов)</span>
            </div>

            {/* Price */}
            <div className="price-section">
              {product.price === 0 ? (
                <div className="price-free">
                  <span className="price-label">ЦЕНА</span>
                  <div className="free-badge">🎁 БЕСПЛАТНО</div>
                </div>
              ) : (
                <div className="price-normal">
                  <span className="price-label">ЦЕНА</span>
                  <div className="price-value">
                    <span className="amount">{product.price}</span>
                    <span className="currency">₽</span>
                  </div>
                </div>
              )}
            </div>

            {/* Stock Status */}
            <div className={`stock-status ${product.stock > 0 ? 'in-stock' : 'out-stock'}`}>
              {product.stock > 0 ? (
                <>
                  <span className="dot">●</span>
                  <span>В наличии: {product.stock} шт.</span>
                </>
              ) : (
                <>
                  <span className="dot">●</span>
                  <span>Нет в наличии</span>
                </>
              )}
            </div>

            {/* Quantity Selector */}
            <div className="quantity-section">
              <label>Количество:</label>
              <div className="quantity-control">
                <button 
                  className="qty-btn"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                >
                  −
                </button>
                <input 
                  type="number" 
                  className="qty-input"
                  value={quantity} 
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  min="1"
                />
                <button 
                  className="qty-btn"
                  onClick={() => setQuantity(quantity + 1)}
                >
                  +
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="action-buttons">
              <button 
                className={`btn-add-cart ${added ? 'success' : ''}`}
                onClick={handleAddToCart}
                disabled={product.stock === 0}
              >
                {added ? '✓ Добавлено в корзину!' : '🛒 Добавить в корзину'}
              </button>
              <button className="btn-wishlist" title="Добавить в избранное">
                ❤️ В избранное
              </button>
            </div>

            {/* Features */}
            <div className="features-list">
              <div className="feature-item">
                <span className="feature-icon">⚡</span>
                <span className="feature-text">Мгновенная доставка</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">🔒</span>
                <span className="feature-text">Безопасная покупка</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">✓</span>
                <span className="feature-text">Гарантия качества</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">💬</span>
                <span className="feature-text">24/7 Поддержка</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Section */}
        <div className="detail-tabs-section">
          <div className="tabs-header">
            <button 
              className={`tab-button ${selectedTab === 'description' ? 'active' : ''}`}
              onClick={() => setSelectedTab('description')}
            >
              📋 Описание
            </button>
            <button 
              className={`tab-button ${selectedTab === 'specs' ? 'active' : ''}`}
              onClick={() => setSelectedTab('specs')}
            >
              🔧 Характеристики
            </button>
            <button 
              className={`tab-button ${selectedTab === 'delivery' ? 'active' : ''}`}
              onClick={() => setSelectedTab('delivery')}
            >
              📦 Доставка
            </button>
          </div>

          <div className="tabs-content">
            {selectedTab === 'description' && (
              <div className="tab-pane">
                <h3>О товаре</h3>
                <p>{product.description}</p>
              </div>
            )}

            {selectedTab === 'specs' && (
              <div className="tab-pane">
                <h3>Характеристики товара</h3>
                <div className="specs-grid">
                  <div className="spec-item">
                    <span className="spec-label">Категория:</span>
                    <span className="spec-value">{product.category}</span>
                  </div>
                  <div className="spec-item">
                    <span className="spec-label">Рейтинг:</span>
                    <span className="spec-value">{product.rating}/5</span>
                  </div>
                  <div className="spec-item">
                    <span className="spec-label">Отзывов:</span>
                    <span className="spec-value">{product.reviews}</span>
                  </div>
                  <div className="spec-item">
                    <span className="spec-label">На складе:</span>
                    <span className="spec-value">{product.stock} шт.</span>
                  </div>
                </div>
              </div>
            )}

            {selectedTab === 'delivery' && (
              <div className="tab-pane">
                <h3>Доставка и получение</h3>
                <div className="delivery-info">
                  <div className="delivery-item">
                    <span className="delivery-icon">⚡</span>
                    <div>
                      <strong>Цифровые товары</strong>
                      <p>Получите мгновенно в личном кабинете после оплаты</p>
                    </div>
                  </div>
                  <div className="delivery-item">
                    <span className="delivery-icon">📦</span>
                    <div>
                      <strong>Физические товары</strong>
                      <p>Доставка по РФ 1-3 дня. Бесплатно при заказе от 1000₽</p>
                    </div>
                  </div>
                  <div className="delivery-item">
                    <span className="delivery-icon">🌍</span>
                    <div>
                      <strong>Международная доставка</strong>
                      <p>Страны СНГ за 3-5 дней, остальной мир за 7-14 дней</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <AIRecommendations
          currentProductId={product.id}
          title="Похожие товары"
        />
      </div>
    </div>
  );
}

export default ProductDetail;
