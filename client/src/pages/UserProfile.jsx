import { useState } from 'react';
import { Link } from 'react-router-dom';

function UserProfile({ user, onLogin, onLogout }) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    username: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const profileStats = {
    balance: 0,
    totalOrders: 3,
    totalSpent: 2450
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isRegistering) {
        if (formData.password !== formData.confirmPassword) {
          setError('Пароли не совпадают');
          setLoading(false);
          return;
        }
        if (formData.password.length < 6) {
          setError('Пароль минимум 6 символов');
          setLoading(false);
          return;
        }
        
        const newUser = {
          id: 'user_' + Math.random().toString(36).substr(2, 9),
          username: formData.username,
          email: formData.email,
          role: formData.email.includes('admin') ? 'admin' : 'user',
          createdAt: new Date().toISOString()
        };
        
        onLogin(newUser);
      } else {
        if (!formData.email || !formData.password) {
          setError('Введите email и пароль');
          setLoading(false);
          return;
        }

        const mockUser = {
          id: 'user_' + Math.random().toString(36).substr(2, 9),
          username: formData.email.split('@')[0],
          email: formData.email,
          role: formData.email.includes('admin') ? 'admin' : 'user',
          createdAt: new Date().toISOString()
        };
        
        onLogin(mockUser);
      }
    } catch (err) {
      setError('Ошибка. Попробуйте снова.');
    } finally {
      setLoading(false);
    }
  };

  // Авторизованный пользователь
  if (user) {
    return (
      <div className="profile-page">
        <div className="profile-container">
          {/* Header */}
          <div className="profile-header-card">
            <div className="profile-avatar">
              <span>{user.username?.charAt(0).toUpperCase() || 'U'}</span>
              <div className="avatar-status"></div>
            </div>
            <div className="profile-user-info">
              <h1>{user.username}</h1>
              <p>{user.email}</p>
              {user.role === 'admin' && (
                <span className="admin-badge">👑 Администратор</span>
              )}
            </div>
            <button onClick={onLogout} className="btn-logout">Выйти</button>
          </div>

          {/* Stats */}
          <div className="profile-stats-grid three-cols">
            <div className="stat-card">
              <span className="stat-value">{profileStats.balance} ₽</span>
              <span className="stat-label">Баланс</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{profileStats.totalOrders}</span>
              <span className="stat-label">Заказов</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{profileStats.totalSpent} ₽</span>
              <span className="stat-label">Потрачено</span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="profile-actions">
            <Link to="/steam-topup" className="profile-action-card highlight">
              <span className="action-icon">💳</span>
              <div className="action-content">
                <h3>Пополнить Steam</h3>
                <p>Моментальное пополнение баланса</p>
              </div>
              <span className="action-arrow">→</span>
            </Link>

            <Link to="/orders" className="profile-action-card">
              <span className="action-icon">📦</span>
              <div className="action-content">
                <h3>Мои заказы</h3>
                <p>История покупок</p>
              </div>
              <span className="action-arrow">→</span>
            </Link>

            <Link to="/catalog" className="profile-action-card">
              <span className="action-icon">🎮</span>
              <div className="action-content">
                <h3>Каталог</h3>
                <p>Игры, V-Bucks, Robux и др.</p>
              </div>
              <span className="action-arrow">→</span>
            </Link>
          </div>

          {/* Admin Section */}
          {user.role === 'admin' && (
            <div className="admin-section">
              <h2>⚙️ Администрирование</h2>
              <div className="admin-actions">
                <Link to="/admin" className="admin-action-card">
                  <span className="icon">📊</span>
                  <span>Панель управления</span>
                </Link>
                <Link to="/admin/settings" className="admin-action-card">
                  <span className="icon">⚡</span>
                  <span>Настройки</span>
                </Link>
              </div>
            </div>
          )}

          {/* Recent Activity */}
          <div className="profile-section">
            <h2>📜 Последняя активность</h2>
            <div className="activity-list">
              <div className="activity-item">
                <span className="activity-icon">💳</span>
                <div className="activity-content">
                  <p>Пополнение Steam 500 ₽</p>
                  <span className="activity-date">Сегодня, 14:32</span>
                </div>
                <span className="activity-status success">Выполнен</span>
              </div>
              <div className="activity-item">
                <span className="activity-icon">🎮</span>
                <div className="activity-content">
                  <p>V-Bucks 1000</p>
                  <span className="activity-date">Вчера, 19:15</span>
                </div>
                <span className="activity-status success">Выполнен</span>
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="profile-info-section">
            <h2>ℹ️ Информация</h2>
            <p>Войдите с email, содержащим "admin" для доступа к панели администратора.</p>
          </div>
        </div>
      </div>
    );
  }

  // Форма входа/регистрации
  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <div className="auth-logo">🎮</div>
          <h1>{isRegistering ? 'Регистрация' : 'Вход'}</h1>
          <p>{isRegistering ? 'Создайте аккаунт' : 'Войдите в аккаунт'}</p>
        </div>

        {error && (
          <div className="auth-error">
            {error}
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>
          {isRegistering && (
            <div className="form-group">
              <label>Имя пользователя</label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="Ваш никнейм"
                required
              />
            </div>
          )}

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="email@example.com"
              required
            />
          </div>

          <div className="form-group">
            <label>Пароль</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              required
            />
          </div>

          {isRegistering && (
            <div className="form-group">
              <label>Подтвердите пароль</label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="••••••••"
                required
              />
            </div>
          )}

          <button type="submit" className="btn-auth" disabled={loading}>
            {loading ? 'Загрузка...' : (isRegistering ? 'Зарегистрироваться' : 'Войти')}
          </button>
        </form>

        <div className="auth-divider">
          <span>или</span>
        </div>

        <button className="btn-telegram">
          📱 Войти через Telegram
        </button>

        <div className="auth-switch">
          {isRegistering ? (
            <p>Уже есть аккаунт? <button onClick={() => setIsRegistering(false)}>Войти</button></p>
          ) : (
            <p>Нет аккаунта? <button onClick={() => setIsRegistering(true)}>Зарегистрироваться</button></p>
          )}
        </div>

        <div className="auth-hint">
          <p>💡 Для заказа регистрация не обязательна!</p>
        </div>
      </div>
    </div>
  );
}

export default UserProfile;
