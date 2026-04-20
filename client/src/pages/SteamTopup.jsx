import { useState } from 'react';
import { Link } from 'react-router-dom';

function SteamTopup({ user }) {
  const [steamLogin, setSteamLogin] = useState('');
  const [amount, setAmount] = useState(500);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [email, setEmail] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState(1);
  const [orderCreated, setOrderCreated] = useState(false);
  const [orderId, setOrderId] = useState(null);
  const [showLoginHelp, setShowLoginHelp] = useState(false);

  // Комиссии (примерные)
  const COMMISSION = 0.15; // 15% комиссия сервиса
  const BANK_FEE = 0.02; // 2% банковские издержки

  const paymentMethods = [
    { id: 'card', name: 'Банковская карта', icon: '💳', fee: 0.02 },
    { id: 'sbp', name: 'СБП', icon: '🏦', fee: 0.01 },
    { id: 'yoomoney', name: 'ЮMoney', icon: '💰', fee: 0.03 }
  ];

  const presetAmounts = [100, 250, 500, 1000, 2000, 5000];

  // Расчёт итоговой суммы
  const selectedMethod = paymentMethods.find(m => m.id === paymentMethod);
  const serviceFee = Math.round(amount * COMMISSION);
  const bankFee = Math.round(amount * (selectedMethod?.fee || 0));
  const totalAmount = amount + serviceFee + bankFee;

  const validateSteamLogin = (login) => {
    // Логин Steam: минимум 3 символа, только латиница, цифры и _
    return /^[a-zA-Z0-9_]{3,32}$/.test(login);
  };

  const handleNext = () => {
    if (step === 1) {
      if (!steamLogin) {
        alert('Введите логин Steam');
        return;
      }
      if (!validateSteamLogin(steamLogin)) {
        alert('Логин Steam должен содержать 3-32 символа (латиница, цифры, _)');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (amount < 30) {
        alert('Минимальная сумма пополнения: 30 ₽');
        return;
      }
      if (amount > 15000) {
        alert('Максимальная сумма пополнения: 15 000 ₽');
        return;
      }
      setStep(3);
    }
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handleCreateOrder = async () => {
    setIsProcessing(true);

    // Имитация создания заказа
    await new Promise(resolve => setTimeout(resolve, 1500));

    const newOrderId = 'NS' + Date.now().toString(36).toUpperCase();
    setOrderId(newOrderId);
    setOrderCreated(true);
    setIsProcessing(false);
  };

  // Если заказ создан
  if (orderCreated) {
    return (
      <div className="steam-topup-page">
        <div className="topup-container">
          <div className="order-success">
            <div className="success-icon">✅</div>
            <h1>Заказ создан!</h1>
            <p className="order-id">Номер заказа: <strong>{orderId}</strong></p>

            <div className="order-summary-card">
              <div className="summary-row">
                <span>Аккаунт Steam:</span>
                <span className="value">{steamLogin}</span>
              </div>
              <div className="summary-row">
                <span>Сумма пополнения:</span>
                <span className="value">{amount} ₽</span>
              </div>
              <div className="summary-row total">
                <span>К оплате:</span>
                <span className="value">{totalAmount} ₽</span>
              </div>
            </div>

            <div className="payment-redirect">
              <p>Сейчас вы будете перенаправлены на страницу оплаты...</p>
              <div className="redirect-loader"></div>
            </div>

            <div className="order-info">
              <h3>📋 Что будет дальше:</h3>
              <ol>
                <li>Оплатите заказ любым удобным способом</li>
                <li>После оплаты деньги автоматически поступят на ваш Steam аккаунт</li>
                <li>Вы получите уведомление о зачислении</li>
              </ol>
            </div>

            <div className="order-actions">
              <button className="btn-primary btn-pay">
                💳 Оплатить {totalAmount} ₽
              </button>
              <Link to="/catalog" className="btn-secondary">
                ← Вернуться в каталог
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="steam-topup-page">
      <div className="topup-container">
        {/* Header */}
        <div className="topup-header">
          <Link to="/catalog" className="back-link">← Назад</Link>
          <h1>💳 Пополнение Steam</h1>
          <p>Моментальное пополнение баланса вашего аккаунта</p>
        </div>

        {/* Progress */}
        <div className="progress-steps">
          <div className={`step ${step >= 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}>
            <span className="step-number">1</span>
            <span className="step-text">Аккаунт</span>
          </div>
          <div className="step-line"></div>
          <div className={`step ${step >= 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}>
            <span className="step-number">2</span>
            <span className="step-text">Сумма</span>
          </div>
          <div className="step-line"></div>
          <div className={`step ${step >= 3 ? 'active' : ''}`}>
            <span className="step-number">3</span>
            <span className="step-text">Оплата</span>
          </div>
        </div>

        {/* Step 1: Steam Login */}
        {step === 1 && (
          <div className="topup-step">
            <div className="step-card">
              <h2>Введите логин Steam</h2>
              <p className="step-desc">Это логин, который вы используете для входа в Steam (не email и не никнейм)</p>

              <div className="form-group">
                <label>Логин Steam</label>
                <div className="input-with-icon">
                  <span className="input-icon">🎮</span>
                  <input
                    type="text"
                    value={steamLogin}
                    onChange={(e) => setSteamLogin(e.target.value)}
                    placeholder="Например: gamer2025"
                    autoFocus
                  />
                </div>
                {steamLogin && !validateSteamLogin(steamLogin) && (
                  <span className="input-error">Только латиница, цифры и _ (3-32 символа)</span>
                )}
              </div>

              <button 
                className="btn-help"
                onClick={() => setShowLoginHelp(!showLoginHelp)}
              >
                ❓ Где взять логин?
              </button>

              {showLoginHelp && (
                <div className="help-box">
                  <h4>Как найти свой логин Steam:</h4>
                  <ol>
                    <li>Откройте приложение Steam</li>
                    <li>Нажмите на своё имя в правом верхнем углу</li>
                    <li>Выберите "Об аккаунте"</li>
                    <li>Логин указан в строке "Имя аккаунта"</li>
                  </ol>
                  <div className="help-warning">
                    ⚠️ <strong>Внимание:</strong> Логин — это НЕ ваш ник в играх и НЕ email!
                  </div>
                </div>
              )}

              <div className="warning-box">
                <span className="warning-icon">⚠️</span>
                <p>Если аккаунт ранее не пополнялся, может произойти смена региона. Чтобы сохранить регион, добавьте любую бесплатную игру в библиотеку с российского IP перед пополнением.</p>
              </div>
            </div>

            <button 
              className="btn-next"
              onClick={handleNext}
              disabled={!steamLogin || !validateSteamLogin(steamLogin)}
            >
              Продолжить →
            </button>
          </div>
        )}

        {/* Step 2: Amount */}
        {step === 2 && (
          <div className="topup-step">
            <div className="step-card">
              <h2>Выберите сумму пополнения</h2>
              <p className="step-desc">Аккаунт: <strong>{steamLogin}</strong></p>

              <div className="amount-presets">
                {presetAmounts.map(preset => (
                  <button
                    key={preset}
                    className={`preset-btn ${amount === preset ? 'active' : ''}`}
                    onClick={() => setAmount(preset)}
                  >
                    {preset} ₽
                  </button>
                ))}
              </div>

              <div className="form-group">
                <label>Или введите свою сумму</label>
                <div className="input-with-suffix">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(parseInt(e.target.value) || 0)}
                    min="30"
                    max="15000"
                  />
                  <span className="input-suffix">₽</span>
                </div>
                <span className="input-hint">Мин: 30 ₽ • Макс: 15 000 ₽</span>
              </div>
            </div>

            <div className="step-buttons">
              <button className="btn-back" onClick={handleBack}>← Назад</button>
              <button 
                className="btn-next"
                onClick={handleNext}
                disabled={amount < 30 || amount > 15000}
              >
                Продолжить →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Payment */}
        {step === 3 && (
          <div className="topup-step">
            <div className="step-card">
              <h2>Способ оплаты</h2>

              <div className="payment-methods">
                {paymentMethods.map(method => (
                  <label 
                    key={method.id}
                    className={`payment-method ${paymentMethod === method.id ? 'selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      value={method.id}
                      checked={paymentMethod === method.id}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                    />
                    <span className="method-icon">{method.icon}</span>
                    <span className="method-name">{method.name}</span>
                    <span className="method-fee">+{(method.fee * 100).toFixed(0)}%</span>
                  </label>
                ))}
              </div>

              <div className="form-group">
                <label>Email для чека (необязательно)</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                />
              </div>
            </div>

            {/* Summary */}
            <div className="payment-summary">
              <h3>Детали заказа</h3>
              <div className="summary-row">
                <span>Аккаунт Steam:</span>
                <span>{steamLogin}</span>
              </div>
              <div className="summary-row">
                <span>На баланс поступит:</span>
                <span className="highlight">~{amount} ₽</span>
              </div>
              <div className="summary-divider"></div>
              <div className="summary-row">
                <span>Комиссия сервиса:</span>
                <span>{serviceFee} ₽</span>
              </div>
              <div className="summary-row">
                <span>Банковские издержки:</span>
                <span>{bankFee} ₽</span>
              </div>
              <div className="summary-divider"></div>
              <div className="summary-row total">
                <span>Итого к оплате:</span>
                <span>{totalAmount} ₽</span>
              </div>
              <p className="summary-note">
                * Сумма зачисления может отличаться до 3% из-за курсовой разницы
              </p>
            </div>

            <div className="step-buttons">
              <button className="btn-back" onClick={handleBack}>← Назад</button>
              <button 
                className="btn-pay-main"
                onClick={handleCreateOrder}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <span className="btn-loader"></span>
                    Создание заказа...
                  </>
                ) : (
                  <>💳 Оплатить {totalAmount} ₽</>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Features */}
        <div className="topup-features">
          <div className="feature">
            <span className="feature-icon">⚡</span>
            <div>
              <h4>Моментально</h4>
              <p>Зачисление за 1-5 минут</p>
            </div>
          </div>
          <div className="feature">
            <span className="feature-icon">🔒</span>
            <div>
              <h4>Безопасно</h4>
              <p>Защищённые платежи</p>
            </div>
          </div>
          <div className="feature">
            <span className="feature-icon">💬</span>
            <div>
              <h4>Поддержка 24/7</h4>
              <p>Всегда на связи</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SteamTopup;
