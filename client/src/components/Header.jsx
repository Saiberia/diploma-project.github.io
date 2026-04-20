import { Link, useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';

function Header({ user, cartCount, onLogout, onSearch, products = [] }) {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);
  const searchRef = useRef(null);

  const onlineCount = Math.floor(Math.random() * 150) + 50;

  // Close menus when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearch(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (e) => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(e.target.value);

    if (query.trim() === '') {
      setSearchResults([]);
      setShowSearch(false);
      return;
    }

    // Search in products
    const results = products.filter(p =>
      p.name.toLowerCase().includes(query) ||
      p.description.toLowerCase().includes(query) ||
      p.category.toLowerCase().includes(query)
    ).slice(0, 6);

    setSearchResults(results);
    setShowSearch(results.length > 0);

    if (onSearch) onSearch(query);
  };

  const handleSearchClick = (productId) => {
    setSearchQuery('');
    setShowSearch(false);
    navigate(`/product/${productId}`);
  };

  return (
    <header className="header">
      <div className="header-content">
        <Link to="/" className="logo">
          <span className="logo-icon">🎮</span>
          <span className="logo-text">Nova Shop</span>
        </Link>

        <nav className={`nav ${mobileMenuOpen ? 'active' : ''}`}>
          <Link to="/" className="nav-item">Главная</Link>
          <Link to="/catalog" className="nav-item">Каталог</Link>
          <Link to="/categories" className="nav-item">Категории</Link>
          <Link to="/deals" className="nav-item">Акции</Link>
        </nav>

        <div className="header-actions">
          {/* Search */}
          <div className="search-wrapper" ref={searchRef}>
            <div className="search-input-group">
              <input
                type="text"
                className="search-input"
                placeholder="Поиск товаров..."
                value={searchQuery}
                onChange={handleSearch}
                onFocus={() => searchQuery && setShowSearch(true)}
              />
              <button className="search-btn">🔍</button>
            </div>

            {/* Search Results */}
            {showSearch && searchResults.length > 0 && (
              <div className="search-results-dropdown">
                {searchResults.map(product => (
                  <div
                    key={product.id}
                    className="search-result-item"
                    onClick={() => handleSearchClick(product.id)}
                  >
                    <div className="search-result-icon">
                      {product.category === 'steam' && '💳'}
                      {product.category === 'games' && '🎮'}
                      {product.category === 'items' && '⚔️'}
                      {product.category === 'moba' && '👹'}
                    </div>
                    <div className="search-result-content">
                      <div className="search-result-name">{product.name}</div>
                      <div className="search-result-price">{product.price}₽</div>
                    </div>
                    <div className="search-result-arrow">→</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="header-right">
            {/* Online Badge */}
            <div className="online-badge">
              <span className="online-dot"></span>
              {onlineCount}
            </div>

            {/* Cart */}
            <Link to="/cart" className="cart-btn">
              🛒
              {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
            </Link>

            {/* User Menu */}
            {user ? (
              <div className="user-menu" ref={userMenuRef}>
                <button
                  className="user-status"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                >
                  <span className="online-indicator"></span>
                  {user.username}
                </button>

                {userMenuOpen && (
                  <div className="dropdown-menu active">
                    <Link to="/profile" className="dropdown-item">
                      👤 Мой профиль
                    </Link>
                    <Link to="/orders" className="dropdown-item">
                      📦 Мои заказы
                    </Link>
                    {user.role === 'admin' && (
                      <>
                        <div className="dropdown-divider"></div>
                        <Link to="/admin" className="dropdown-item admin-link">
                          ⚙️ Админ-панель
                        </Link>
                        <Link to="/admin/settings" className="dropdown-item admin-link">
                          ⚡ Настройки
                        </Link>
                      </>
                    )}
                    <div className="dropdown-divider"></div>
                    <button
                      onClick={() => {
                        onLogout();
                        setUserMenuOpen(false);
                      }}
                      className="dropdown-item logout"
                    >
                      🚪 Выход
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/profile" className="login-btn">
                Вход
              </Link>
            )}

            {/* Mobile Menu Button */}
            <button
              className="mobile-menu-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              ☰
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
