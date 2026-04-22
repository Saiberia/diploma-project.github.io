import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/AIRecommendations.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Чтение истории просмотров из localStorage
function getViewHistory() {
  try {
    return JSON.parse(localStorage.getItem('viewedProducts') || '[]');
  } catch {
    return [];
  }
}

function getPurchaseHistory() {
  try {
    return JSON.parse(localStorage.getItem('purchasedProducts') || '[]');
  } catch {
    return [];
  }
}

// Запись просмотренного товара
export function trackProductView(productId) {
  const history = getViewHistory();
  const updated = [productId, ...history.filter(id => id !== productId)].slice(0, 20);
  localStorage.setItem('viewedProducts', JSON.stringify(updated));
}

function AIRecommendations({ currentProductId = null, title = 'AI Рекомендации для вас' }) {
  const navigate = useNavigate();
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [mode, setMode]       = useState('personalized'); // 'similar' | 'personalized'

  useEffect(() => {
    const controller = new AbortController();
    loadRecommendations(controller.signal);
    return () => controller.abort();
  }, [currentProductId]);

  async function loadRecommendations(signal) {
    setLoading(true);
    setError(null);

    try {
      let data;

      if (currentProductId) {
        // На странице товара — похожие
        setMode('similar');
        const res = await fetch(
          `${API}/ai/recommendations/similar/${currentProductId}?limit=4`,
          { signal }
        );
        data = await res.json();
      } else {
        // На главной — персонализированные
        setMode('personalized');
        const viewedIds    = getViewHistory();
        const purchasedIds = getPurchaseHistory();
        const res = await fetch(`${API}/ai/recommendations/personalized`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ viewedIds, purchasedIds, limit: 4 }),
          signal,
        });
        data = await res.json();
      }

      setRecommendations(data.recommendations || []);
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError('Не удалось загрузить рекомендации');
      }
    } finally {
      setLoading(false);
    }
  }

  function handleProductClick(productId) {
    trackProductView(productId);
    navigate(`/product/${productId}`);
  }

  if (loading) {
    return (
      <div className="ai-recommendations">
        <div className="rec-header">
          <h3>🤖 {title}</h3>
        </div>
        <div className="rec-skeleton-grid">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="rec-skeleton" />
          ))}
        </div>
      </div>
    );
  }

  if (error || recommendations.length === 0) {
    return null;
  }

  const modeLabel = mode === 'similar'
    ? 'Косинусное сходство по тегам и жанру'
    : 'На основе истории просмотров';

  return (
    <div className="ai-recommendations">
      <div className="rec-header">
        <h3>🤖 {title}</h3>
        <span className="rec-badge" title={modeLabel}>
          {mode === 'similar' ? 'Похожие товары' : 'Персонально для вас'}
        </span>
      </div>

      <div className="recommendations-grid">
        {recommendations.map(rec => (
          <div
            key={rec.id}
            className="rec-card"
            onClick={() => handleProductClick(rec.id)}
            role="button"
            tabIndex={0}
            onKeyPress={e => e.key === 'Enter' && handleProductClick(rec.id)}
          >
            {rec.badge && <span className="rec-tag">{rec.badge}</span>}

            <div className="rec-confidence">
              <div className="confidence-bar">
                <div
                  className="confidence-fill"
                  style={{ width: `${rec.confidence || 75}%` }}
                />
              </div>
              <span className="confidence-text">{rec.confidence || 75}% совпадение</span>
            </div>

            <div className="rec-image-wrap">
              {rec.image
                ? <img src={rec.image} alt={rec.name} className="rec-image" loading="lazy" />
                : <div className="rec-icon">🎮</div>
              }
            </div>

            <h4 className="rec-name">{rec.name}</h4>

            {rec.reason && (
              <p className="rec-reason">💡 {rec.reason}</p>
            )}

            <div className="rec-meta">
              <span className="rec-rating">⭐ {rec.rating}</span>
              {rec.reviews && (
                <span className="rec-reviews">{rec.reviews.toLocaleString('ru-RU')} отзывов</span>
              )}
            </div>

            <div className="rec-price">{rec.price.toLocaleString('ru-RU')} ₽</div>

            <button
              className="btn-add-to-cart"
              onClick={e => { e.stopPropagation(); handleProductClick(rec.id); }}
            >
              Подробнее →
            </button>
          </div>
        ))}
      </div>

      <p className="rec-algorithm-note">
        Алгоритм: content-based filtering · {modeLabel}
      </p>
    </div>
  );
}

export default AIRecommendations;
