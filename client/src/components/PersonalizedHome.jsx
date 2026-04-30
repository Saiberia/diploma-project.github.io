import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { aiAPI } from '../services/api';
import { trackProductView } from './AIRecommendations';
import '../styles/PersonalizedHome.css';

/**
 * Персонализированная витрина — главная страница, перестраиваемая под пользователя.
 *
 * Архитектура секций:
 *   1. «Продолжите смотреть» — последние просмотренные (localStorage)
 *   2. «Подобрано для вас» — content-based + collaborative (hybrid α=0.5)
 *   3. «Часто покупают вместе» — collaborative item-item на последнем просмотренном
 *   4. «Новинки в вашем жанре» — фильтр по genre из самого просматриваемого товара
 *   5. «Скидки на ваши категории» — фильтр по любимой категории
 *
 * Cold-start (нет истории): показываем популярные + general-purpose рекомендации.
 *
 * Все рекомендации — реальные, через /api/ai/recommendations/*. Никакой захардкоженной
 * логики; весь rerank делается на сервере.
 */

function getViewHistory() {
  try { return JSON.parse(localStorage.getItem('viewedProducts') || '[]'); }
  catch { return []; }
}
function getPurchaseHistory() {
  try { return JSON.parse(localStorage.getItem('purchasedProducts') || '[]'); }
  catch { return []; }
}

export default function PersonalizedHome({ products, user, onAddToCart }) {
  const navigate = useNavigate();
  const [recs, setRecs]                       = useState([]);
  const [recsAlgorithm, setRecsAlgorithm]     = useState(null);
  const [recsAlpha, setRecsAlpha]             = useState(null);
  const [coBuy, setCoBuy]                     = useState([]);
  const [popular, setPopular]                 = useState([]);
  const [loading, setLoading]                 = useState(true);

  const viewedIds    = useMemo(() => getViewHistory(),    []);
  const purchasedIds = useMemo(() => getPurchaseHistory(),[]);
  const hasHistory   = viewedIds.length > 0 || purchasedIds.length > 0;

  // Карта id → product для быстрого lookup
  const productsById = useMemo(() => {
    const m = new Map();
    for (const p of products) m.set(p.id, p);
    return m;
  }, [products]);

  // Последние просмотренные — берём по id из products (актуальные данные)
  const continueWatching = useMemo(() => (
    viewedIds
      .map(id => productsById.get(id))
      .filter(Boolean)
      .slice(0, 4)
  ), [viewedIds, productsById]);

  // Последний просмотренный товар → фавориты по genre / category
  const lastViewed = continueWatching[0];
  const favoriteGenre    = lastViewed?.genre;
  const favoriteCategory = lastViewed?.category;

  // Новинки в любимом жанре
  const newInGenre = useMemo(() => {
    if (!favoriteGenre) return [];
    return products
      .filter(p => p.genre === favoriteGenre && p.badge === 'new')
      .slice(0, 4);
  }, [products, favoriteGenre]);

  // Скидки в любимой категории — для демо «скидка» = низкая цена в категории
  const dealsInCategory = useMemo(() => {
    if (!favoriteCategory) return [];
    return [...products]
      .filter(p => p.category === favoriteCategory)
      .sort((a, b) => a.price - b.price)
      .slice(0, 4);
  }, [products, favoriteCategory]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        if (hasHistory) {
          const { data } = await aiAPI.getPersonalized(viewedIds, purchasedIds, {
            limit: 8, algorithm: 'hybrid'
          });
          if (cancelled) return;
          setRecs(data.recommendations || []);
          setRecsAlgorithm(data.algorithm);
          setRecsAlpha(data.alpha);

          // Co-buy: похожие на последний просмотренный (collaborative)
          if (lastViewed) {
            try {
              const { data: coData } = await aiAPI.getSimilar(lastViewed.id, {
                limit: 4, algorithm: 'collaborative'
              });
              if (!cancelled) setCoBuy(coData.recommendations || []);
            } catch { /* ignore */ }
          }
        } else {
          const { data } = await aiAPI.getPopular(8);
          if (!cancelled) {
            setPopular(data.recommendations || []);
            setRecsAlgorithm(data.algorithm);
          }
        }
      } catch (err) {
        console.warn('PersonalizedHome: AI recs failed, using catalog fallback', err);
        if (!cancelled) setPopular(products.slice(0, 8));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasHistory, lastViewed?.id]);

  const handleProductClick = (p) => {
    trackProductView(p.id);
    navigate(`/product/${p.id}`);
  };

  const renderSection = (title, items, opts = {}) => {
    if (!items || items.length === 0) return null;
    return (
      <section className="ph-section">
        <div className="ph-section-header">
          <h2>{opts.icon} {title}</h2>
          {opts.algoBadge && <span className="ph-algo-badge">{opts.algoBadge}</span>}
          {opts.link && <Link to={opts.link} className="ph-see-all">Все →</Link>}
        </div>
        <div className="ph-grid">
          {items.map(p => (
            <article key={p.id} className="ph-card" onClick={() => handleProductClick(p)}>
              {p.badge && <span className={`ph-badge ph-badge-${p.badge}`}>
                {p.badge === 'popular' && '⭐ Хит'}
                {p.badge === 'hit' && '🔥 Топ'}
                {p.badge === 'new' && '✨ Новое'}
              </span>}
              {typeof p.confidence === 'number' && (
                <span className="ph-confidence" title="Уверенность AI-рекомендации">
                  AI {p.confidence}%
                </span>
              )}
              <div className="ph-card-image">
                <img
                  src={p.image}
                  alt={p.name}
                  loading="lazy"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              </div>
              <div className="ph-card-body">
                <h3 className="ph-card-title">{p.name}</h3>
                {p.reason && <p className="ph-card-reason">💡 {p.reason}</p>}
                <div className="ph-card-footer">
                  <span className="ph-price">{p.price} ₽</span>
                  <button
                    className="ph-add"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddToCart?.(p);
                    }}
                  >В корзину</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    );
  };

  return (
    <div className="personalized-home">
      <div className="ph-hero">
        <div className="ph-hero-content">
          <h1>
            {user ? <>Привет, <span className="ph-username">{user.username}</span>!</> : 'Добро пожаловать в Nova Shop'}
          </h1>
          <p>
            {hasHistory
              ? 'Витрина перестроена под ваши предпочтения. AI рекомендует:'
              : 'Сейчас показываем популярное и новинки. Посмотрите пару товаров — витрина адаптируется под вас.'}
          </p>
          {recsAlgorithm && (
            <div className="ph-meta-badges">
              <span className="ph-meta">🤖 Алгоритм: <strong>{recsAlgorithm}</strong></span>
              {recsAlpha != null && <span className="ph-meta">α = <strong>{recsAlpha}</strong></span>}
              <span className="ph-meta">📐 Просмотрено: <strong>{viewedIds.length}</strong></span>
              <span className="ph-meta">💳 Куплено: <strong>{purchasedIds.length}</strong></span>
            </div>
          )}
        </div>
      </div>

      {loading && (
        <div className="ph-loading">
          <div className="ph-spinner" />
          <span>AI подбирает рекомендации…</span>
        </div>
      )}

      {!loading && hasHistory && (
        <>
          {renderSection('Продолжите смотреть', continueWatching, { icon: '👁️' })}
          {renderSection('Подобрано для вас', recs, {
            icon: '✨',
            algoBadge: recsAlgorithm ? `Hybrid (CB+CF)` : null
          })}
          {renderSection('Часто покупают вместе', coBuy, {
            icon: '🤝',
            algoBadge: 'Item-Item CF'
          })}
          {renderSection(`Новинки в жанре «${favoriteGenre}»`, newInGenre, { icon: '🆕' })}
          {renderSection(`Лучшие цены в «${favoriteCategory}»`, dealsInCategory, { icon: '💰' })}
        </>
      )}

      {!loading && !hasHistory && (
        <>
          {renderSection('Популярное прямо сейчас', popular, { icon: '🔥', algoBadge: 'Popularity baseline' })}
          {renderSection('Новинки', products.filter(p => p.badge === 'new').slice(0, 8), { icon: '🆕', link: '/catalog' })}
          <div className="ph-empty-hint">
            <p>Откройте любой товар или сделайте покупку — и витрина перестроится под вас.</p>
            <Link to="/catalog" className="ph-cta">Перейти в каталог →</Link>
          </div>
        </>
      )}
    </div>
  );
}
