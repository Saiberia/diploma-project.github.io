import { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';

/**
 * Улучшенная админ-панель Nova Shop
 * - Расширенная статистика с графиками
 * - Полное управление товарами
 * - Управление заказами
 * - Управление пользователями
 * - Отчёты по Steam-пополнениям
 * 
 * - Настройки магазина
 */

function AdminPanel({ products, user }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [productsList, setProductsList] = useState(products || []);
  const [searchQuery, setSearchQuery] = useState('');
  const [notification, setNotification] = useState(null);
  
  // Форма товара
  const [newProduct, setNewProduct] = useState({
    name: '',
    category: 'steam',
    price: 0,
    description: '',
    stock: 0,
    image: '',
    badge: ''
  });
  const [editingId, setEditingId] = useState(null);

  // Mock данные
  const [mockOrders] = useState([
    { id: 'ORD-7841', customer: 'aleksandr@mail.ru', username: 'Alexandr', items: 2, total: 1599, status: 'completed', date: '2024-01-15 14:32', products: ['V-Bucks 1000', 'Robux 400'] },
    { id: 'ORD-7840', customer: 'player@gmail.com', username: 'ProPlayer', items: 1, total: 749, status: 'processing', date: '2024-01-15 13:15', products: ['CS2 Prime'] },
    { id: 'ORD-7839', customer: 'gamer@yandex.ru', username: 'GamerPro', items: 3, total: 2499, status: 'completed', date: '2024-01-15 12:08', products: ['Elden Ring'] },
    { id: 'ORD-7838', customer: 'steam@bk.ru', username: 'SteamLover', items: 1, total: 500, status: 'completed', date: '2024-01-15 11:45', products: ['Steam 500₽'] },
    { id: 'ORD-7837', customer: 'test@test.com', username: 'TestUser', items: 2, total: 1299, status: 'cancelled', date: '2024-01-14 18:22', products: ['Genshin Кристаллы'] },
    { id: 'ORD-7836', customer: 'dota@mail.ru', username: 'DotaFan', items: 1, total: 799, status: 'completed', date: '2024-01-14 16:10', products: ['Dota 2 Battle Pass'] }
  ]);

  const [mockUsers] = useState([
    { id: 1, username: 'admin', email: 'admin@novashop.ru', role: 'admin', orders: 0, spent: 0, registered: '2024-01-01', status: 'active' },
    { id: 2, username: 'Alexandr', email: 'aleksandr@mail.ru', role: 'user', orders: 15, spent: 12500, registered: '2024-01-05', status: 'active' },
    { id: 3, username: 'ProPlayer', email: 'player@gmail.com', role: 'user', orders: 8, spent: 6400, registered: '2024-01-07', status: 'active' },
    { id: 4, username: 'GamerPro', email: 'gamer@yandex.ru', role: 'user', orders: 23, spent: 28900, registered: '2024-01-02', status: 'vip' },
    { id: 5, username: 'SteamLover', email: 'steam@bk.ru', role: 'user', orders: 45, spent: 67000, registered: '2023-12-15', status: 'vip' },
    { id: 6, username: 'TestUser', email: 'test@test.com', role: 'user', orders: 1, spent: 0, registered: '2024-01-14', status: 'blocked' }
  ]);

  const [steamTopups] = useState([
    { id: 'ST-001', login: 'steam_user1', amount: 500, commission: 25, status: 'completed', date: '2024-01-15 14:45' },
    { id: 'ST-002', login: 'gamer2024', amount: 1000, commission: 50, status: 'completed', date: '2024-01-15 13:20' },
    { id: 'ST-003', login: 'prouser', amount: 2000, commission: 100, status: 'processing', date: '2024-01-15 12:55' },
    { id: 'ST-004', login: 'valvelover', amount: 500, commission: 25, status: 'completed', date: '2024-01-15 11:10' },
    { id: 'ST-005', login: 'csgo_master', amount: 5000, commission: 250, status: 'completed', date: '2024-01-14 19:30' }
  ]);

  // Redirect if not admin
  if (!user || user.role !== 'admin') {
    return (
      <div className="admin-page">
        <div className="admin-denied">
          <div className="denied-icon">🔒</div>
          <h1>Доступ запрещён</h1>
          <p>Эта страница доступна только администраторам</p>
          <Link to="/" className="btn-primary">← На главную</Link>
        </div>
      </div>
    );
  }

  // Показать уведомление
  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // CRUD товаров
  const handleAddProduct = (e) => {
    e.preventDefault();
    if (editingId) {
      setProductsList(productsList.map(p => 
        p.id === editingId ? { ...newProduct, id: editingId } : p
      ));
      showNotification('Товар обновлён');
      setEditingId(null);
    } else {
      const product = {
        ...newProduct,
        id: Math.max(...productsList.map(p => p.id), 0) + 1,
        rating: 4.5,
        reviews: 0,
        image: newProduct.image || 'https://via.placeholder.com/300x200?text=' + encodeURIComponent(newProduct.name)
      };
      setProductsList([...productsList, product]);
      showNotification('Товар добавлен');
    }
    setNewProduct({ name: '', category: 'steam', price: 0, description: '', stock: 0, image: '', badge: '' });
  };

  const handleEditProduct = (product) => {
    setNewProduct(product);
    setEditingId(product.id);
    setActiveTab('products');
  };

  const handleDeleteProduct = (id) => {
    if (window.confirm('Удалить товар?')) {
      setProductsList(productsList.filter(p => p.id !== id));
      showNotification('Товар удалён', 'warning');
    }
  };

  // Статистика
  const stats = useMemo(() => {
    const totalProducts = productsList.length;
    const totalValue = productsList.reduce((sum, p) => sum + (p.price * (p.stock || 1)), 0);
    const completedOrders = mockOrders.filter(o => o.status === 'completed').length;
    const totalRevenue = mockOrders.filter(o => o.status === 'completed').reduce((sum, o) => sum + o.total, 0);
    const steamRevenue = steamTopups.filter(t => t.status === 'completed').reduce((sum, t) => sum + t.commission, 0);
    const activeUsers = mockUsers.filter(u => u.status !== 'blocked').length;
    const vipUsers = mockUsers.filter(u => u.status === 'vip').length;
    
    return {
      totalProducts,
      totalValue,
      completedOrders,
      pendingOrders: mockOrders.filter(o => o.status === 'processing').length,
      totalRevenue,
      steamRevenue,
      totalUsers: mockUsers.length,
      activeUsers,
      vipUsers,
      avgOrderValue: completedOrders > 0 ? Math.round(totalRevenue / completedOrders) : 0,
      conversionRate: 3.2,
      todayOrders: 5,
      weekOrders: 42,
      monthOrders: 156
    };
  }, [productsList, mockOrders, mockUsers, steamTopups]);

  // Фильтрация товаров
  const filteredProducts = productsList.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Категории с иконками
  const categoryIcons = {
    steam: '💳',
    games: '🎮',
    items: '⚔️',
    moba: '👹'
  };

  return (
    <div className="admin-page">
      {/* Уведомление */}
      {notification && (
        <div className={`admin-toast ${notification.type}`}>
          {notification.type === 'success' ? '✓' : '⚠️'} {notification.message}
        </div>
      )}

      <div className="admin-layout">
        {/* Sidebar */}
        <aside className="admin-sidebar">
          <div className="admin-logo">
            <span className="logo-icon">⚙️</span>
            <span className="logo-text">Admin Panel</span>
          </div>

          <nav className="admin-nav">
            <button 
              className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              <span className="nav-icon">📊</span>
              <span className="nav-text">Дашборд</span>
            </button>
            <button 
              className={`nav-item ${activeTab === 'products' ? 'active' : ''}`}
              onClick={() => setActiveTab('products')}
            >
              <span className="nav-icon">📦</span>
              <span className="nav-text">Товары</span>
              <span className="nav-badge">{stats.totalProducts}</span>
            </button>
            <button 
              className={`nav-item ${activeTab === 'orders' ? 'active' : ''}`}
              onClick={() => setActiveTab('orders')}
            >
              <span className="nav-icon">🛒</span>
              <span className="nav-text">Заказы</span>
              {stats.pendingOrders > 0 && <span className="nav-badge pending">{stats.pendingOrders}</span>}
            </button>
            <button 
              className={`nav-item ${activeTab === 'steam' ? 'active' : ''}`}
              onClick={() => setActiveTab('steam')}
            >
              <span className="nav-icon">💳</span>
              <span className="nav-text">Steam</span>
            </button>
            <button 
              className={`nav-item ${activeTab === 'users' ? 'active' : ''}`}
              onClick={() => setActiveTab('users')}
            >
              <span className="nav-icon">👥</span>
              <span className="nav-text">Пользователи</span>
              <span className="nav-badge">{stats.totalUsers}</span>
            </button>
            <button 
              className={`nav-item ${activeTab === 'analytics' ? 'active' : ''}`}
              onClick={() => setActiveTab('analytics')}
            >
              <span className="nav-icon">📈</span>
              <span className="nav-text">Аналитика</span>
            </button>
            <button 
              className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => setActiveTab('settings')}
            >
              <span className="nav-icon">⚙️</span>
              <span className="nav-text">Настройки</span>
            </button>
          </nav>

          <div className="admin-sidebar-footer">
            <Link to="/" className="back-to-site">
              ← Вернуться на сайт
            </Link>
          </div>
        </aside>

        {/* Main Content */}
        <main className="admin-main">
          {/* Header */}
          <header className="admin-header">
            <div className="header-left">
              <h1>
                {activeTab === 'dashboard' && '📊 Дашборд'}
                {activeTab === 'products' && '📦 Управление товарами'}
                {activeTab === 'orders' && '🛒 Заказы'}
                {activeTab === 'steam' && '💳 Steam пополнения'}
                {activeTab === 'users' && '👥 Пользователи'}
                {activeTab === 'analytics' && '📈 Аналитика'}
                {activeTab === 'settings' && '⚙️ Настройки'}
              </h1>
            </div>
            <div className="header-right">
              <div className="admin-user-info">
                <span className="user-avatar">👤</span>
                <span className="user-name">{user.username}</span>
                <span className="user-role">Администратор</span>
              </div>
            </div>
          </header>

          {/* Content */}
          <div className="admin-content">
            {/* DASHBOARD */}
            {activeTab === 'dashboard' && (
              <div className="dashboard-content">
                {/* Stats Grid */}
                <div className="stats-grid-4">
                  <div className="stat-card primary">
                    <div className="stat-icon">💰</div>
                    <div className="stat-info">
                      <span className="stat-value">{stats.totalRevenue.toLocaleString()} ₽</span>
                      <span className="stat-label">Общий доход</span>
                    </div>
                    <div className="stat-trend up">+12%</div>
                  </div>
                  <div className="stat-card success">
                    <div className="stat-icon">🛒</div>
                    <div className="stat-info">
                      <span className="stat-value">{stats.completedOrders}</span>
                      <span className="stat-label">Выполнено заказов</span>
                    </div>
                    <div className="stat-trend up">+8%</div>
                  </div>
                  <div className="stat-card warning">
                    <div className="stat-icon">👥</div>
                    <div className="stat-info">
                      <span className="stat-value">{stats.activeUsers}</span>
                      <span className="stat-label">Активных пользователей</span>
                    </div>
                    <div className="stat-trend up">+5%</div>
                  </div>
                  <div className="stat-card info">
                    <div className="stat-icon">💳</div>
                    <div className="stat-info">
                      <span className="stat-value">{stats.steamRevenue.toLocaleString()} ₽</span>
                      <span className="stat-label">Комиссия Steam</span>
                    </div>
                    <div className="stat-trend up">+15%</div>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="quick-stats">
                  <div className="quick-stat">
                    <span className="qs-label">Сегодня заказов</span>
                    <span className="qs-value">{stats.todayOrders}</span>
                  </div>
                  <div className="quick-stat">
                    <span className="qs-label">За неделю</span>
                    <span className="qs-value">{stats.weekOrders}</span>
                  </div>
                  <div className="quick-stat">
                    <span className="qs-label">За месяц</span>
                    <span className="qs-value">{stats.monthOrders}</span>
                  </div>
                  <div className="quick-stat">
                    <span className="qs-label">Средний чек</span>
                    <span className="qs-value">{stats.avgOrderValue} ₽</span>
                  </div>
                  <div className="quick-stat">
                    <span className="qs-label">VIP клиентов</span>
                    <span className="qs-value">{stats.vipUsers}</span>
                  </div>
                </div>

                <div className="dashboard-grid">
                  {/* Последние заказы */}
                  <div className="dashboard-card">
                    <div className="card-header">
                      <h3>🛒 Последние заказы</h3>
                      <button className="btn-link" onClick={() => setActiveTab('orders')}>Все →</button>
                    </div>
                    <div className="orders-mini-list">
                      {mockOrders.slice(0, 4).map(order => (
                        <div key={order.id} className="order-mini">
                          <div className="order-info">
                            <span className="order-id">{order.id}</span>
                            <span className="order-user">{order.username}</span>
                          </div>
                          <div className="order-details">
                            <span className="order-amount">{order.total} ₽</span>
                            <span className={`order-status status-${order.status}`}>
                              {order.status === 'completed' && '✓'}
                              {order.status === 'processing' && '⏳'}
                              {order.status === 'cancelled' && '✕'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Быстрые действия */}
                  <div className="dashboard-card">
                    <div className="card-header">
                      <h3>⚡ Быстрые действия</h3>
                    </div>
                    <div className="quick-actions">
                      <button className="quick-action" onClick={() => setActiveTab('products')}>
                        <span className="qa-icon">➕</span>
                        <span className="qa-text">Добавить товар</span>
                      </button>
                      <button className="quick-action" onClick={() => setActiveTab('orders')}>
                        <span className="qa-icon">📋</span>
                        <span className="qa-text">Проверить заказы</span>
                      </button>
                      <button className="quick-action" onClick={() => setActiveTab('steam')}>
                        <span className="qa-icon">💳</span>
                        <span className="qa-text">Steam отчёт</span>
                      </button>
                      <button className="quick-action" onClick={() => navigate('/admin/settings')}>
                        <span className="qa-icon">⚙️</span>
                        <span className="qa-text">Настройки</span>
                      </button>
                    </div>
                  </div>

                  {/* Топ товаров */}
                  <div className="dashboard-card full-width">
                    <div className="card-header">
                      <h3>🔥 Популярные товары</h3>
                      <button className="btn-link" onClick={() => setActiveTab('products')}>Все →</button>
                    </div>
                    <div className="top-products">
                      {productsList.slice(0, 5).map((product, idx) => (
                        <div key={product.id} className="top-product">
                          <span className="product-rank">#{idx + 1}</span>
                          <span className="product-icon">{categoryIcons[product.category] || '📦'}</span>
                          <span className="product-name">{product.name}</span>
                          <span className="product-price">{product.price} ₽</span>
                          <span className="product-rating">⭐ {product.rating}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* PRODUCTS */}
            {activeTab === 'products' && (
              <div className="products-content">
                {/* Форма добавления */}
                <div className="product-form-card">
                  <h3>{editingId ? '✏️ Редактирование товара' : '➕ Добавить новый товар'}</h3>
                  <form className="product-form" onSubmit={handleAddProduct}>
                    <div className="form-grid">
                      <div className="form-group">
                        <label>Название *</label>
                        <input 
                          type="text"
                          value={newProduct.name}
                          onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                          required
                          placeholder="Название товара"
                        />
                      </div>
                      <div className="form-group">
                        <label>Категория</label>
                        <select 
                          value={newProduct.category}
                          onChange={(e) => setNewProduct({...newProduct, category: e.target.value})}
                        >
                          <option value="steam">💳 Steam</option>
                          <option value="games">🎮 Игры</option>
                          <option value="items">⚔️ Предметы</option>
                          <option value="moba">👹 MOBA</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Цена (₽) *</label>
                        <input 
                          type="number"
                          value={newProduct.price}
                          onChange={(e) => setNewProduct({...newProduct, price: parseInt(e.target.value) || 0})}
                          required
                          min="0"
                        />
                      </div>
                      <div className="form-group">
                        <label>Количество</label>
                        <input 
                          type="number"
                          value={newProduct.stock}
                          onChange={(e) => setNewProduct({...newProduct, stock: parseInt(e.target.value) || 0})}
                          min="0"
                        />
                      </div>
                      <div className="form-group">
                        <label>Бейдж</label>
                        <select 
                          value={newProduct.badge}
                          onChange={(e) => setNewProduct({...newProduct, badge: e.target.value})}
                        >
                          <option value="">Без бейджа</option>
                          <option value="popular">⭐ Популярное</option>
                          <option value="hit">🔥 Хит</option>
                          <option value="new">✨ Новое</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label>URL изображения</label>
                        <input 
                          type="url"
                          value={newProduct.image}
                          onChange={(e) => setNewProduct({...newProduct, image: e.target.value})}
                          placeholder="https://..."
                        />
                      </div>
                    </div>
                    <div className="form-group full">
                      <label>Описание</label>
                      <textarea 
                        value={newProduct.description}
                        onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
                        placeholder="Описание товара"
                        rows="3"
                      />
                    </div>
                    <div className="form-actions">
                      <button type="submit" className="btn-primary">
                        {editingId ? '✓ Сохранить' : '+ Добавить'}
                      </button>
                      {editingId && (
                        <button 
                          type="button" 
                          className="btn-secondary"
                          onClick={() => {
                            setEditingId(null);
                            setNewProduct({ name: '', category: 'steam', price: 0, description: '', stock: 0, image: '', badge: '' });
                          }}
                        >
                          Отмена
                        </button>
                      )}
                    </div>
                  </form>
                </div>

                {/* Поиск и фильтры */}
                <div className="products-toolbar">
                  <div className="search-box">
                    <input 
                      type="text"
                      placeholder="🔍 Поиск товаров..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <div className="toolbar-stats">
                    Всего: <strong>{filteredProducts.length}</strong> товаров
                  </div>
                </div>

                {/* Таблица товаров */}
                <div className="products-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Товар</th>
                        <th>Категория</th>
                        <th>Цена</th>
                        <th>Остаток</th>
                        <th>Рейтинг</th>
                        <th>Действия</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProducts.map(product => (
                        <tr key={product.id}>
                          <td className="id-cell">#{product.id}</td>
                          <td className="product-cell">
                            <div className="product-info">
                              {product.badge && <span className={`mini-badge badge-${product.badge}`}>{product.badge}</span>}
                              <span className="product-name">{product.name}</span>
                            </div>
                          </td>
                          <td>
                            <span className="category-tag">
                              {categoryIcons[product.category]} {product.category}
                            </span>
                          </td>
                          <td className="price-cell">{product.price} ₽</td>
                          <td className={`stock-cell ${(product.stock || 0) < 10 ? 'low' : ''}`}>
                            {product.stock || '∞'}
                          </td>
                          <td className="rating-cell">⭐ {product.rating || 0}</td>
                          <td className="actions-cell">
                            <button className="btn-icon edit" onClick={() => handleEditProduct(product)} title="Редактировать">✏️</button>
                            <button className="btn-icon delete" onClick={() => handleDeleteProduct(product.id)} title="Удалить">🗑️</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ORDERS */}
            {activeTab === 'orders' && (
              <div className="orders-content">
                <div className="orders-stats">
                  <div className="order-stat">
                    <span className="os-value">{stats.completedOrders}</span>
                    <span className="os-label">Выполнено</span>
                  </div>
                  <div className="order-stat pending">
                    <span className="os-value">{stats.pendingOrders}</span>
                    <span className="os-label">В обработке</span>
                  </div>
                  <div className="order-stat">
                    <span className="os-value">{stats.totalRevenue.toLocaleString()} ₽</span>
                    <span className="os-label">Общая сумма</span>
                  </div>
                </div>

                <div className="orders-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>ID Заказа</th>
                        <th>Клиент</th>
                        <th>Товары</th>
                        <th>Сумма</th>
                        <th>Статус</th>
                        <th>Дата</th>
                        <th>Действия</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mockOrders.map(order => (
                        <tr key={order.id} className={`order-row status-${order.status}`}>
                          <td className="order-id-cell">
                            <strong>{order.id}</strong>
                          </td>
                          <td className="customer-cell">
                            <div className="customer-info">
                              <span className="customer-name">{order.username}</span>
                              <span className="customer-email">{order.customer}</span>
                            </div>
                          </td>
                          <td className="products-cell">
                            {order.products.join(', ')}
                          </td>
                          <td className="amount-cell">
                            <strong>{order.total} ₽</strong>
                          </td>
                          <td>
                            <span className={`status-badge status-${order.status}`}>
                              {order.status === 'completed' && '✓ Выполнен'}
                              {order.status === 'processing' && '⏳ В обработке'}
                              {order.status === 'cancelled' && '✕ Отменён'}
                            </span>
                          </td>
                          <td className="date-cell">{order.date}</td>
                          <td className="actions-cell">
                            <button
                              className="btn-icon"
                              title="Подробнее"
                              onClick={() => showNotification(`Заказ ${order.id}: ${order.products.join(', ')} — ${order.total} ₽`)}
                            >
                              👁️
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* STEAM TOPUPS */}
            {activeTab === 'steam' && (
              <div className="steam-content">
                <div className="steam-stats">
                  <div className="steam-stat">
                    <span className="ss-icon">💳</span>
                    <span className="ss-value">{steamTopups.length}</span>
                    <span className="ss-label">Всего пополнений</span>
                  </div>
                  <div className="steam-stat">
                    <span className="ss-icon">💰</span>
                    <span className="ss-value">{steamTopups.reduce((s, t) => s + t.amount, 0).toLocaleString()} ₽</span>
                    <span className="ss-label">Сумма пополнений</span>
                  </div>
                  <div className="steam-stat highlight">
                    <span className="ss-icon">📈</span>
                    <span className="ss-value">{stats.steamRevenue.toLocaleString()} ₽</span>
                    <span className="ss-label">Наша комиссия</span>
                  </div>
                </div>

                <div className="steam-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Steam логин</th>
                        <th>Сумма</th>
                        <th>Комиссия</th>
                        <th>Статус</th>
                        <th>Дата</th>
                      </tr>
                    </thead>
                    <tbody>
                      {steamTopups.map(topup => (
                        <tr key={topup.id}>
                          <td>{topup.id}</td>
                          <td className="login-cell"><code>{topup.login}</code></td>
                          <td className="amount-cell">{topup.amount} ₽</td>
                          <td className="commission-cell">+{topup.commission} ₽</td>
                          <td>
                            <span className={`status-badge status-${topup.status}`}>
                              {topup.status === 'completed' ? '✓ Выполнено' : '⏳ В процессе'}
                            </span>
                          </td>
                          <td className="date-cell">{topup.date}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* USERS */}
            {activeTab === 'users' && (
              <div className="users-content">
                <div className="users-stats">
                  <div className="user-stat">
                    <span className="us-value">{stats.totalUsers}</span>
                    <span className="us-label">Всего</span>
                  </div>
                  <div className="user-stat">
                    <span className="us-value">{stats.activeUsers}</span>
                    <span className="us-label">Активных</span>
                  </div>
                  <div className="user-stat vip">
                    <span className="us-value">{stats.vipUsers}</span>
                    <span className="us-label">VIP</span>
                  </div>
                </div>

                <div className="users-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Пользователь</th>
                        <th>Email</th>
                        <th>Роль</th>
                        <th>Заказов</th>
                        <th>Потрачено</th>
                        <th>Статус</th>
                        <th>Регистрация</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mockUsers.map(u => (
                        <tr key={u.id} className={`user-row ${u.status}`}>
                          <td>#{u.id}</td>
                          <td className="username-cell">
                            <strong>{u.username}</strong>
                            {u.status === 'vip' && <span className="vip-badge">VIP</span>}
                          </td>
                          <td>{u.email}</td>
                          <td>
                            <span className={`role-badge role-${u.role}`}>
                              {u.role === 'admin' ? '👑 Admin' : '👤 User'}
                            </span>
                          </td>
                          <td className="orders-cell">{u.orders}</td>
                          <td className="spent-cell">{u.spent.toLocaleString()} ₽</td>
                          <td>
                            <span className={`status-tag status-${u.status}`}>
                              {u.status === 'active' && '🟢 Активен'}
                              {u.status === 'vip' && '⭐ VIP'}
                              {u.status === 'blocked' && '🔴 Заблокирован'}
                            </span>
                          </td>
                          <td className="date-cell">{u.registered}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ANALYTICS */}
            {activeTab === 'analytics' && (
              <div className="analytics-content">
                <div className="analytics-grid">
                  <div className="analytics-card">
                    <h3>📈 Выручка по дням</h3>
                    <div className="chart-placeholder">
                      <div className="bar-chart">
                        {[65, 45, 80, 55, 90, 75, 85].map((h, i) => (
                          <div key={i} className="bar" style={{ height: `${h}%` }}>
                            <span className="bar-label">{['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'][i]}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="analytics-card">
                    <h3>🎯 Категории продаж</h3>
                    <div className="category-stats">
                      <div className="cat-stat">
                        <span className="cat-name">💳 Steam</span>
                        <div className="cat-bar"><div className="cat-fill" style={{ width: '75%' }}></div></div>
                        <span className="cat-percent">75%</span>
                      </div>
                      <div className="cat-stat">
                        <span className="cat-name">🎮 Игры</span>
                        <div className="cat-bar"><div className="cat-fill" style={{ width: '45%' }}></div></div>
                        <span className="cat-percent">45%</span>
                      </div>
                      <div className="cat-stat">
                        <span className="cat-name">⚔️ Предметы</span>
                        <div className="cat-bar"><div className="cat-fill" style={{ width: '60%' }}></div></div>
                        <span className="cat-percent">60%</span>
                      </div>
                      <div className="cat-stat">
                        <span className="cat-name">👹 MOBA</span>
                        <div className="cat-bar"><div className="cat-fill" style={{ width: '30%' }}></div></div>
                        <span className="cat-percent">30%</span>
                      </div>
                    </div>
                  </div>
                  <div className="analytics-card full-width">
                    <h3>📊 Ключевые метрики</h3>
                    <div className="metrics-grid">
                      <div className="metric">
                        <span className="metric-label">Конверсия</span>
                        <span className="metric-value">{stats.conversionRate}%</span>
                      </div>
                      <div className="metric">
                        <span className="metric-label">Средний чек</span>
                        <span className="metric-value">{stats.avgOrderValue} ₽</span>
                      </div>
                      <div className="metric">
                        <span className="metric-label">Возвраты</span>
                        <span className="metric-value">0.8%</span>
                      </div>
                      <div className="metric">
                        <span className="metric-label">Повторные покупки</span>
                        <span className="metric-value">34%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SETTINGS */}
            {activeTab === 'settings' && (
              <div className="settings-content">
                <div className="settings-section">
                  <h3>🏪 Основные настройки</h3>
                  <div className="settings-form">
                    <div className="form-group">
                      <label>Название магазина</label>
                      <input type="text" defaultValue="Nova Shop" />
                    </div>
                    <div className="form-group">
                      <label>Email поддержки</label>
                      <input type="email" defaultValue="support@novashop.ru" />
                    </div>
                    <div className="form-group">
                      <label>Telegram канал</label>
                      <input type="text" defaultValue="@NovaShopOfficial" />
                    </div>
                  </div>
                </div>

                <div className="settings-section">
                  <h3>💰 Финансы</h3>
                  <div className="settings-form">
                    <div className="form-group">
                      <label>Комиссия Steam (%)</label>
                      <input type="number" defaultValue="5" min="0" max="100" />
                    </div>
                    <div className="form-group">
                      <label>Минимальная сумма заказа (₽)</label>
                      <input type="number" defaultValue="100" min="0" />
                    </div>
                  </div>
                </div>

                <div className="settings-section">
                  <h3>🔔 Уведомления</h3>
                  <div className="settings-toggles">
                    <label className="toggle-item">
                      <input type="checkbox" defaultChecked />
                      <span className="toggle-label">Email о новых заказах</span>
                    </label>
                    <label className="toggle-item">
                      <input type="checkbox" defaultChecked />
                      <span className="toggle-label">Telegram уведомления</span>
                    </label>
                    <label className="toggle-item">
                      <input type="checkbox" />
                      <span className="toggle-label">Уведомления о низком остатке</span>
                    </label>
                  </div>
                </div>

                <button className="btn-primary btn-save" onClick={() => showNotification('Настройки сохранены')}>
                  💾 Сохранить настройки
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default AdminPanel;
