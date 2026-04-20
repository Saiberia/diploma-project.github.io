import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function AdminSettings({ user, onLogout }) {
  const navigate = useNavigate();
  const [settings, setSettings] = useState({
    telegramToken: localStorage.getItem('telegramToken') || '',
    telegramBotName: localStorage.getItem('telegramBotName') || '',
    discordToken: localStorage.getItem('discordToken') || '',
    discordClientId: localStorage.getItem('discordClientId') || '',
    steamApiKey: localStorage.getItem('steamApiKey') || '',
    commissionRate: parseFloat(localStorage.getItem('commissionRate') || '5'),
    minTransactionAmount: parseFloat(localStorage.getItem('minTransactionAmount') || '100'),
    maxTransactionAmount: parseFloat(localStorage.getItem('maxTransactionAmount') || '50000'),
  });

  const [editMode, setEditMode] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [testResults, setTestResults] = useState({});

  if (!user || user.role !== 'admin') {
    return (
      <div className="admin-access-denied">
        <h1>🚫 Доступ запрещен</h1>
        <p>У вас нет прав администратора</p>
        <button onClick={() => navigate('/')} className="btn-primary">Вернуться на главную</button>
      </div>
    );
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSettings({
      ...settings,
      [name]: isNaN(value) ? value : parseFloat(value)
    });
  };

  const handleSave = () => {
    // Save to localStorage
    Object.keys(settings).forEach(key => {
      localStorage.setItem(key, settings[key]);
    });
    setSaveMessage('✅ Настройки сохранены успешно!');
    setEditMode(false);
    setTimeout(() => setSaveMessage(''), 3000);
  };

  const handleTestTelegram = async () => {
    if (!settings.telegramToken) {
      setTestResults({ telegram: '❌ Токен не указан' });
      return;
    }

    try {
      const response = await fetch(`https://api.telegram.org/bot${settings.telegramToken}/getMe`);
      if (response.ok) {
        const data = await response.json();
        setTestResults({ 
          telegram: `✅ Подключено! Бот: @${data.result.username}`
        });
      } else {
        setTestResults({ telegram: '❌ Ошибка подключения к Telegram API' });
      }
    } catch (error) {
      setTestResults({ telegram: '❌ Ошибка сети' });
    }
  };

  const handleTestDiscord = async () => {
    if (!settings.discordToken) {
      setTestResults({ discord: '❌ Токен не указан' });
      return;
    }

    try {
      const response = await fetch('https://discord.com/api/v10/users/@me', {
        headers: {
          Authorization: `Bot ${settings.discordToken}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setTestResults({ 
          discord: `✅ Подключено! Пользователь: ${data.username}`
        });
      } else {
        setTestResults({ discord: '❌ Неверный токен Discord' });
      }
    } catch (error) {
      setTestResults({ discord: '❌ Ошибка сети' });
    }
  };

  const handleTestSteam = async () => {
    if (!settings.steamApiKey) {
      setTestResults({ steam: '❌ API ключ не указан' });
      return;
    }

    try {
      const response = await fetch(
        `https://api.steampowered.com/ISteamUser/ResolveVanityURL/v0001/?key=${settings.steamApiKey}&vanityurl=steam`
      );
      if (response.ok) {
        const data = await response.json();
        if (data.response.success === 1) {
          setTestResults({ 
            steam: '✅ API ключ работает!'
          });
        } else {
          setTestResults({ steam: '❌ Ошибка Steam API' });
        }
      }
    } catch (error) {
      setTestResults({ steam: '❌ Ошибка сети или неверный ключ' });
    }
  };

  return (
    <div className="admin-settings-page">
      <div className="admin-container">
        <div className="admin-header">
          <div>
            <h1>⚙️ Настройки администратора</h1>
            <p>Управление интеграциями и комиссиями</p>
          </div>
          <button onClick={() => navigate('/admin')} className="btn-secondary">
            ← Вернуться в админ-панель
          </button>
        </div>

        {saveMessage && <div className="success-message">{saveMessage}</div>}

        <div className="settings-grid">
          {/* Telegram Settings */}
          <section className="settings-section">
            <div className="section-header">
              <h2>🔵 Telegram</h2>
              <span className={`status ${testResults.telegram?.includes('✅') ? 'connected' : 'disconnected'}`}>
                {testResults.telegram?.includes('✅') ? '● Подключен' : '● Не подключен'}
              </span>
            </div>

            <div className="form-group">
              <label>Токен бота (Bot Token)</label>
              <input
                type="password"
                name="telegramToken"
                value={settings.telegramToken}
                onChange={handleChange}
                disabled={!editMode}
                placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
              />
            </div>

            <div className="form-group">
              <label>Имя бота (опционально)</label>
              <input
                type="text"
                name="telegramBotName"
                value={settings.telegramBotName}
                onChange={handleChange}
                disabled={!editMode}
                placeholder="Nova_Shop_Bot"
              />
            </div>

            <div className="settings-actions">
              <button onClick={handleTestTelegram} className="btn-test">
                🧪 Проверить подключение
              </button>
            </div>
            {testResults.telegram && <p className="test-result">{testResults.telegram}</p>}

            <div className="setting-info">
              <p>📖 <strong>Как получить токен:</strong></p>
              <ol>
                <li>Найдите @BotFather в Telegram</li>
                <li>Напишите /newbot и следуйте инструкциям</li>
                <li>Скопируйте полученный токен</li>
              </ol>
            </div>
          </section>

          {/* Discord Settings */}
          <section className="settings-section">
            <div className="section-header">
              <h2>🎮 Discord</h2>
              <span className={`status ${testResults.discord?.includes('✅') ? 'connected' : 'disconnected'}`}>
                {testResults.discord?.includes('✅') ? '● Подключен' : '● Не подключен'}
              </span>
            </div>

            <div className="form-group">
              <label>Токен бота (Bot Token)</label>
              <input
                type="password"
                name="discordToken"
                value={settings.discordToken}
                onChange={handleChange}
                disabled={!editMode}
                placeholder="OTk3NDY2MTAyNzA0MTk4MjA4.G1a2b3..."
              />
            </div>

            <div className="form-group">
              <label>Client ID</label>
              <input
                type="text"
                name="discordClientId"
                value={settings.discordClientId}
                onChange={handleChange}
                disabled={!editMode}
                placeholder="1234567890"
              />
            </div>

            <div className="settings-actions">
              <button onClick={handleTestDiscord} className="btn-test">
                🧪 Проверить подключение
              </button>
            </div>
            {testResults.discord && <p className="test-result">{testResults.discord}</p>}

            <div className="setting-info">
              <p>📖 <strong>Как получить токен:</strong></p>
              <ol>
                <li>Откройте Discord Developer Portal</li>
                <li>Создайте новое приложение</li>
                <li>Перейдите на вкладку "Bot"</li>
                <li>Нажмите "Reset Token" и скопируйте</li>
              </ol>
            </div>
          </section>

          {/* Steam Settings */}
          <section className="settings-section">
            <div className="section-header">
              <h2>💳 Steam API</h2>
              <span className={`status ${testResults.steam?.includes('✅') ? 'connected' : 'disconnected'}`}>
                {testResults.steam?.includes('✅') ? '● Подключен' : '● Не подключен'}
              </span>
            </div>

            <div className="form-group">
              <label>API Ключ</label>
              <input
                type="password"
                name="steamApiKey"
                value={settings.steamApiKey}
                onChange={handleChange}
                disabled={!editMode}
                placeholder="XXXXXXXXXXXXXXXXXXXXXXXX"
              />
            </div>

            <div className="settings-actions">
              <button onClick={handleTestSteam} className="btn-test">
                🧪 Проверить подключение
              </button>
            </div>
            {testResults.steam && <p className="test-result">{testResults.steam}</p>}

            <div className="setting-info">
              <p>📖 <strong>Как получить ключ:</strong></p>
              <ol>
                <li>Перейдите на <a href="https://steamcommunity.com/dev/apikey" target="_blank" rel="noopener noreferrer">steamcommunity.com/dev/apikey</a></li>
                <li>Войдите в аккаунт Steam</li>
                <li>Согласитесь с условиями</li>
                <li>Скопируйте ваш API ключ</li>
              </ol>
            </div>
          </section>

          {/* Commission Settings */}
          <section className="settings-section commission-section">
            <h2>💰 Комиссионная модель</h2>

            <div className="form-group">
              <label>Комиссия (%)</label>
              <div className="input-with-suffix">
                <input
                  type="number"
                  name="commissionRate"
                  value={settings.commissionRate}
                  onChange={handleChange}
                  disabled={!editMode}
                  min="0"
                  max="100"
                  step="0.1"
                />
                <span className="suffix">%</span>
              </div>
              <small>Сколько процентов от каждого пополнения Steam получит Nova Shop</small>
            </div>

            <div className="form-group">
              <label>Минимальная сумма</label>
              <div className="input-with-suffix">
                <input
                  type="number"
                  name="minTransactionAmount"
                  value={settings.minTransactionAmount}
                  onChange={handleChange}
                  disabled={!editMode}
                  min="0"
                  step="10"
                />
                <span className="suffix">₽</span>
              </div>
            </div>

            <div className="form-group">
              <label>Максимальная сумма</label>
              <div className="input-with-suffix">
                <input
                  type="number"
                  name="maxTransactionAmount"
                  value={settings.maxTransactionAmount}
                  onChange={handleChange}
                  disabled={!editMode}
                  min="0"
                  step="100"
                />
                <span className="suffix">₽</span>
              </div>
            </div>

            <div className="commission-example">
              <h3>📊 Пример расчета:</h3>
              <p>Пользователь пополняет Steam на <strong>1000₽</strong></p>
              <p>Комиссия Nova Shop: <strong>{(1000 * settings.commissionRate / 100).toFixed(2)}₽</strong> ({settings.commissionRate}%)</p>
            </div>
          </section>
        </div>

        <div className="settings-footer">
          {!editMode ? (
            <button onClick={() => setEditMode(true)} className="btn-primary large">
              ✏️ Редактировать
            </button>
          ) : (
            <div className="edit-actions">
              <button onClick={handleSave} className="btn-primary large">
                💾 Сохранить
              </button>
              <button onClick={() => setEditMode(false)} className="btn-secondary large">
                ✕ Отменить
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminSettings;
