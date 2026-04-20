import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import '../styles/AISearch.css';

/**
 * AI Поиск в стиле yepshop
 * Простой и функциональный
 */
function AISearch() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const mockProducts = [
    { id: 1, name: 'Пополнение Steam кошелька', category: 'steam', price: 100, icon: '💳', priceLabel: 'от' },
    { id: 2, name: 'V-Bucks 1000 (Fortnite)', category: 'items', price: 799, icon: '🎯' },
    { id: 3, name: "Baldur's Gate 3", category: 'games', price: 1999, icon: '🎮' },
    { id: 4, name: 'Valorant Points 1000', category: 'items', price: 599, icon: '⚔️' },
    { id: 5, name: 'CS2 Prime Status', category: 'games', price: 1199, icon: '🎮' },
    { id: 6, name: 'Robux 1000 (Roblox)', category: 'items', price: 749, icon: '🟥' },
    { id: 7, name: 'Elden Ring', category: 'games', price: 2499, icon: '🎮' },
    { id: 8, name: 'Genshin Impact Кристаллы', category: 'items', price: 1299, icon: '✨' },
    { id: 9, name: 'Смена региона Steam', category: 'steam', price: 277, icon: '💳' },
    { id: 10, name: 'Dota 2 Battle Pass', category: 'moba', price: 799, icon: '⚔️' }
  ];

  const performSearch = (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    setIsSearching(true);
    setShowResults(true);

    setTimeout(() => {
      const lowerQuery = query.toLowerCase();
      
      // Умный поиск с синонимами
      const synonyms = {
        'стим': ['steam', 'пополнение'],
        'кс': ['cs2', 'cs', 'prime', 'counter-strike'],
        'кс2': ['cs2', 'prime'],
        'ксго': ['cs2', 'prime', 'csgo'],
        'форт': ['fortnite', 'v-bucks', 'vbucks'],
        'робуксы': ['robux', 'roblox'],
        'роблокс': ['robux', 'roblox'],
        'геншин': ['genshin', 'кристаллы'],
        'валорант': ['valorant', 'vp'],
        'дота': ['dota', 'battle pass'],
        'элден': ['elden', 'ring']
      };
      
      let searchTerms = [lowerQuery];
      
      for (const [key, values] of Object.entries(synonyms)) {
        if (lowerQuery.includes(key)) {
          searchTerms = [...searchTerms, ...values];
        }
      }
      
      const results = mockProducts.filter(p => {
        const productText = `${p.name} ${p.category}`.toLowerCase();
        return searchTerms.some(term => productText.includes(term));
      });

      setSearchResults(results.slice(0, 6));
      setIsSearching(false);
    }, 200);
  };

  const handleSearch = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    performSearch(query);
  };

  const handleProductClick = (product) => {
    setShowResults(false);
    setSearchQuery('');
    if (product.id === 1) {
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
                onClick={() => { setSearchQuery(''); setSearchResults([]); setShowResults(false); }}
              >
                ✕
              </button>
            )}
          </div>
          <button type="submit" className="search-submit">
            Найти
          </button>
        </form>

        {/* Результаты */}
        {showResults && searchQuery && (
          <div className="search-dropdown">
            {isSearching ? (
              <div className="search-loading">
                <span className="loading-spinner"></span>
                Ищем...
              </div>
            ) : searchResults.length > 0 ? (
              <>
                <div className="search-results-header">
                  Найдено: {searchResults.length}
                </div>
                <div className="search-results-list">
                  {searchResults.map(product => (
                    <div
                      key={product.id}
                      className="search-result-row"
                      onMouseDown={() => handleProductClick(product)}
                    >
                      <span className="result-icon">{product.icon}</span>
                      <div className="result-info">
                        <span className="result-name">{product.name}</span>
                        <span className="result-cat">{product.category}</span>
                      </div>
                      <span className="result-price">
                        {product.priceLabel && <span className="price-from">{product.priceLabel} </span>}
                        {product.price}₽
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
