import { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import '../styles/AISearch.css';

const CATEGORY_ICONS = {
  steam: '💳',
  games: '🎮',
  items: '⚔️',
  moba: '👹',
  subscription: '🎫'
};

const INTENT_LABELS = {
  buy: { icon: '🛒', text: 'Хочешь купить' },
  cheap: { icon: '💰', text: 'Ищешь подешевле' },
  popular: { icon: '🔥', text: 'Показываю популярные' },
  new: { icon: '✨', text: 'Показываю новинки' }
};

function AISearch() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchData, setSearchData] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const debounceRef = useRef(null);
  const abortRef = useRef(null);

  const performSearch = async (query) => {
    if (!query.trim()) {
      setSearchData(null);
      setShowResults(false);
      return;
    }
    setIsSearching(true);
    setShowResults(true);

    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const res = await fetch('/api/ai/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, limit: 6 }),
        signal: ctrl.signal
      });
      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();
      setSearchData(data);
    } catch (err) {
      if (err.name !== 'AbortError') {
        setSearchData({ results: [], intent: 'browse', totalFound: 0 });
      }
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearch = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => performSearch(query), 250);
  };

  const handleProductClick = (product) => {
    setShowResults(false);
    setSearchQuery('');
    if (product.category === 'steam' && /пополн/i.test(product.name)) {
      navigate('/steam-topup');
    } else {
      navigate(`/product/${product.id}`);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/catalog?search=${encodeURIComponent(searchQuery)}`);
      setShowResults(false);
    }
  };

  const results = searchData?.results || [];
  const intent = searchData?.intent;
  const intentInfo = intent && intent !== 'browse' ? INTENT_LABELS[intent] : null;

  return (
    <div className="search-section">
      <div className="search-container">
        <form className="search-form" onSubmit={handleSubmit}>
          <div className="search-input-wrap">
            <span className="search-icon-left">🔍</span>
            <input
              type="text"
              placeholder="Поиск: Steam, Fortnite, Robux, CS2..."
              className="search-input-main"
              value={searchQuery}
              onChange={handleSearch}
              onFocus={() => searchQuery && setShowResults(true)}
              onBlur={() => setTimeout(() => setShowResults(false), 200)}
            />
            {searchQuery && (
              <button
                type="button"
                className="search-clear"
                onClick={() => { setSearchQuery(''); setSearchData(null); setShowResults(false); }}
              >
                ✕
              </button>
            )}
          </div>
          <button type="submit" className="search-submit">
            Найти
          </button>
        </form>

        {showResults && searchQuery && (
          <div className="search-dropdown">
            {isSearching ? (
              <div className="search-loading">
                <span className="loading-spinner"></span>
                Ищем...
              </div>
            ) : results.length > 0 ? (
              <>
                <div className="search-results-header">
                  {intentInfo && (
                    <span className="search-intent-badge">
                      {intentInfo.icon} {intentInfo.text}
                    </span>
                  )}
                  <span className="search-results-count">Найдено: {searchData.totalFound}</span>
                </div>
                <div className="search-results-list">
                  {results.map(product => (
                    <div
                      key={product.id}
                      className="search-result-row"
                      onMouseDown={() => handleProductClick(product)}
                    >
                      <span className="result-icon">{CATEGORY_ICONS[product.category] || '🎮'}</span>
                      <div className="result-info">
                        <span className="result-name">{product.name}</span>
                        <span className="result-cat">{product.category}</span>
                      </div>
                      <span className="result-price">
                        {product.price === 0 ? 'Бесплатно' : `${product.price}₽`}
                      </span>
                      <span className="result-arrow">→</span>
                    </div>
                  ))}
                </div>
                <Link
                  to={`/catalog?search=${encodeURIComponent(searchQuery)}`}
                  className="search-all-link"
                  onMouseDown={(e) => { e.preventDefault(); navigate(`/catalog?search=${encodeURIComponent(searchQuery)}`); }}
                >
                  Смотреть все результаты →
                </Link>
              </>
            ) : (
              <div className="search-empty">
                <span>😕</span>
                <p>Ничего не найдено</p>
                <Link to="/catalog">Перейти в каталог</Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default AISearch;
