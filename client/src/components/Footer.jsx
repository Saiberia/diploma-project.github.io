import { useState } from 'react';

function Footer() {
  const [activeModal, setActiveModal] = useState(null);

  const openModal = (type) => {
    setActiveModal(type);
    document.body.style.overflow = 'hidden';
  };

  const closeModal = () => {
    setActiveModal(null);
    document.body.style.overflow = '';
  };

  // Правовые документы
  const legalDocs = {
    terms: {
      title: 'Условия использования',
      icon: '📜',
      content: `
        <h2>📜 Условия использования Nova Shop</h2>
        <p class="legal-updated">Последнее обновление: 12 января 2026 г.</p>
        
        <h3>1. Общие положения</h3>
        <p>1.1. Настоящие Условия использования (далее — «Условия») регулируют отношения между Nova Shop (далее — «Сервис», «мы», «нас») и пользователем интернет-ресурса nova-shop.ru (далее — «Пользователь», «вы»).</p>
        <p>1.2. Использование Сервиса означает полное и безоговорочное согласие Пользователя с настоящими Условиями.</p>
        <p>1.3. Администрация Сервиса оставляет за собой право изменять Условия без предварительного уведомления. Актуальная версия всегда доступна на сайте.</p>
        
        <h3>2. Регистрация и учётная запись</h3>
        <p>2.1. Для совершения покупок регистрация не требуется, но рекомендуется для удобства отслеживания заказов.</p>
        <p>2.2. При регистрации Пользователь обязуется предоставить достоверную информацию.</p>
        <p>2.3. Пользователь несёт ответственность за сохранность своих учётных данных.</p>
        <p>2.4. Один пользователь может иметь только одну учётную запись.</p>
        
        <h3>3. Товары и услуги</h3>
        <p>3.1. Nova Shop предоставляет услуги по продаже цифровых товаров: игровые ключи, внутриигровая валюта, пополнение кошельков игровых платформ.</p>
        <p>3.2. Все товары являются цифровыми и доставляются электронным способом.</p>
        <p>3.3. Мы гарантируем работоспособность всех продаваемых товаров на момент доставки.</p>
        <p>3.4. Сроки доставки: моментально — 5 минут для автоматических товаров, до 24 часов для товаров, требующих ручной обработки.</p>
        
        <h3>4. Оплата</h3>
        <p>4.1. Оплата осуществляется через защищённые платёжные системы: банковские карты, СБП, электронные кошельки.</p>
        <p>4.2. Все цены указаны в российских рублях с учётом всех налогов и комиссий.</p>
        <p>4.3. После оплаты Пользователь получает электронный чек на указанный email.</p>
        
        <h3>5. Ограничения</h3>
        <p>5.1. Запрещается использование Сервиса для противоправных действий.</p>
        <p>5.2. Запрещается перепродажа приобретённых товаров без согласия Администрации.</p>
        <p>5.3. Запрещается использование автоматизированных средств для взаимодействия с Сервисом.</p>
        
        <h3>6. Возрастные ограничения</h3>
        <p>6.1. Пользоваться Сервисом могут лица, достигшие 14 лет.</p>
        <p>6.2. Лица от 14 до 18 лет должны получить согласие родителей или законных представителей.</p>
        
        <h3>7. Ответственность</h3>
        <p>7.1. Сервис не несёт ответственности за блокировку аккаунтов игровых платформ по причинам, не связанным с приобретённым товаром.</p>
        <p>7.2. Максимальная ответственность Сервиса ограничена стоимостью приобретённого товара.</p>
        
        <h3>8. Контакты</h3>
        <p>По всем вопросам: support@nova-shop.ru</p>
        <p>Телефон поддержки: 8-800-XXX-XX-XX (бесплатно по РФ)</p>
      `
    },
    privacy: {
      title: 'Политика конфиденциальности',
      icon: '🔒',
      content: `
        <h2>🔒 Политика конфиденциальности</h2>
        <p class="legal-updated">Последнее обновление: 12 января 2026 г.</p>
        
        <h3>1. Сбор информации</h3>
        <p>1.1. Мы собираем следующую информацию:</p>
        <ul>
          <li><strong>Контактные данные:</strong> email, номер телефона (при указании)</li>
          <li><strong>Платёжные данные:</strong> обрабатываются защищёнными платёжными системами, мы не храним данные карт</li>
          <li><strong>Данные устройства:</strong> IP-адрес, тип браузера, операционная система</li>
          <li><strong>Данные о поведении:</strong> просмотренные товары, история покупок</li>
        </ul>
        
        <h3>2. Использование информации</h3>
        <p>2.1. Собранные данные используются для:</p>
        <ul>
          <li>Обработки и доставки заказов</li>
          <li>Связи с пользователем по вопросам заказов</li>
          <li>Улучшения качества сервиса</li>
          <li>Персонализации рекомендаций (AI-алгоритмы)</li>
          <li>Предотвращения мошенничества</li>
          <li>Выполнения требований законодательства</li>
        </ul>
        
        <h3>3. AI и персонализация</h3>
        <p>3.1. Мы используем искусственный интеллект для:</p>
        <ul>
          <li>Персонализированных рекомендаций товаров</li>
          <li>Умного поиска и подсказок</li>
          <li>Чат-бота поддержки</li>
          <li>Определения оптимальных цен</li>
        </ul>
        <p>3.2. Вы можете отказаться от персонализации в настройках аккаунта.</p>
        
        <h3>4. Защита данных</h3>
        <p>4.1. Все данные передаются по защищённому соединению (HTTPS/TLS).</p>
        <p>4.2. Пароли хранятся в зашифрованном виде.</p>
        <p>4.3. Доступ к персональным данным имеют только уполномоченные сотрудники.</p>
        <p>4.4. Мы соблюдаем требования Федерального закона №152-ФЗ «О персональных данных».</p>
        
        <h3>5. Cookies</h3>
        <p>5.1. Сайт использует cookies для:</p>
        <ul>
          <li>Авторизации пользователей</li>
          <li>Сохранения корзины</li>
          <li>Аналитики посещаемости</li>
          <li>Персонализации контента</li>
        </ul>
        
        <h3>6. Передача данных третьим лицам</h3>
        <p>6.1. Мы не продаём персональные данные.</p>
        <p>6.2. Данные могут передаваться:</p>
        <ul>
          <li>Платёжным системам для обработки оплаты</li>
          <li>Государственным органам по законному запросу</li>
        </ul>
        
        <h3>7. Права пользователя</h3>
        <p>7.1. Вы имеете право:</p>
        <ul>
          <li>Запросить информацию о хранимых данных</li>
          <li>Исправить неточные данные</li>
          <li>Удалить свои данные (право на забвение)</li>
          <li>Отозвать согласие на обработку</li>
        </ul>
        
        <h3>8. Контакты DPO</h3>
        <p>Ответственный за защиту данных: dpo@nova-shop.ru</p>
      `
    },
    cookies: {
      title: 'Политика использования cookies',
      icon: '🍪',
      content: `
        <h2>🍪 Политика использования cookies</h2>
        <p class="legal-updated">Последнее обновление: 12 января 2026 г.</p>
        
        <h3>1. Что такое cookies?</h3>
        <p>Cookies — это небольшие текстовые файлы, которые сохраняются на вашем устройстве при посещении сайта.</p>
        
        <h3>2. Какие cookies мы используем</h3>
        
        <h4>2.1. Необходимые cookies</h4>
        <p>Обеспечивают базовую функциональность сайта:</p>
        <ul>
          <li><strong>session_id</strong> — идентификатор сессии</li>
          <li><strong>cart</strong> — содержимое корзины</li>
          <li><strong>auth_token</strong> — токен авторизации</li>
        </ul>
        
        <h4>2.2. Функциональные cookies</h4>
        <p>Запоминают ваши предпочтения:</p>
        <ul>
          <li><strong>theme</strong> — выбранная тема оформления</li>
          <li><strong>language</strong> — язык интерфейса</li>
          <li><strong>recent_views</strong> — недавно просмотренные товары</li>
        </ul>
        
        <h4>2.3. Аналитические cookies</h4>
        <p>Помогают улучшать сервис:</p>
        <ul>
          <li><strong>_ga, _gid</strong> — Google Analytics</li>
          <li><strong>_ym_uid</strong> — Яндекс.Метрика</li>
        </ul>
        
        <h3>3. Срок хранения</h3>
        <ul>
          <li>Сессионные cookies: до закрытия браузера</li>
          <li>Постоянные cookies: до 1 года</li>
          <li>Аналитические: до 2 лет</li>
        </ul>
        
        <h3>4. Управление cookies</h3>
        <p>Вы можете отключить cookies в настройках браузера. Это может повлиять на функциональность сайта:</p>
        <ul>
          <li>Корзина не будет сохраняться</li>
          <li>Потребуется повторная авторизация</li>
          <li>Персонализация будет недоступна</li>
        </ul>
        
        <h3>5. Согласие</h3>
        <p>Продолжая пользоваться сайтом, вы соглашаетесь с использованием cookies.</p>
      `
    },
    refunds: {
      title: 'Политика возврата',
      icon: '💸',
      content: `
        <h2>💸 Политика возврата средств</h2>
        <p class="legal-updated">Последнее обновление: 12 января 2026 г.</p>
        
        <h3>1. Общие условия</h3>
        <p>1.1. Все товары Nova Shop являются цифровыми и доставляются электронным способом.</p>
        <p>1.2. Согласно ст. 26.1 Закона о защите прав потребителей, возврат цифровых товаров надлежащего качества не предусмотрен.</p>
        
        <h3>2. Когда возврат возможен</h3>
        <p>Возврат средств осуществляется в следующих случаях:</p>
        <ul>
          <li><strong>Товар не доставлен</strong> в течение заявленного срока</li>
          <li><strong>Ключ/код недействителен</strong> — уже был использован ранее</li>
          <li><strong>Технические неполадки</strong> на стороне сервиса, препятствующие получению товара</li>
          <li><strong>Ошибка в товаре</strong> — получен товар, отличающийся от заказанного</li>
        </ul>
        
        <h3>3. Процесс возврата</h3>
        <ol>
          <li>Обратитесь в поддержку через чат или email: support@nova-shop.ru</li>
          <li>Укажите номер заказа и опишите проблему</li>
          <li>Предоставьте подтверждение (скриншоты ошибок)</li>
          <li>Ожидайте решения в течение 24-48 часов</li>
        </ol>
        
        <h3>4. Сроки возврата</h3>
        <ul>
          <li>Рассмотрение заявки: до 48 часов</li>
          <li>Возврат на карту: 3-10 рабочих дней (зависит от банка)</li>
          <li>Возврат на электронный кошелёк: 1-3 рабочих дня</li>
          <li>Возврат на баланс Nova Shop: моментально</li>
        </ul>
        
        <h3>5. Когда возврат НЕ осуществляется</h3>
        <ul>
          <li>Товар успешно доставлен и активирован</li>
          <li>Прошло более 14 дней с момента покупки</li>
          <li>Ключ был заблокирован издателем по причинам, не связанным с нами</li>
          <li>Пользователь нарушил условия использования</li>
        </ul>
        
        <h3>6. Частичный возврат</h3>
        <p>В некоторых случаях возможен частичный возврат или замена товара:</p>
        <ul>
          <li>Если часть заказа доставлена корректно</li>
          <li>Если товар можно заменить на аналогичный</li>
        </ul>
        
        <h3>7. Спорные ситуации</h3>
        <p>При спорах мы опираемся на логи системы, переписку и предоставленные доказательства. Решение принимается в пользу добросовестной стороны.</p>
        
        <h3>8. Контакты</h3>
        <p>Поддержка: support@nova-shop.ru</p>
        <p>Горячая линия: 8-800-XXX-XX-XX</p>
      `
    }
  };

  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-section">
          <h3>🎮 Nova Shop</h3>
          <p style={{ fontSize: '0.9rem', marginBottom: '1rem', color: 'var(--text-muted)' }}>
            Игровой маркетплейс нового поколения с AI технологиями.
          </p>
          <div className="footer-socials">
            <a href="https://t.me/nu_support_bot" className="social-link" title="Поддержка" target="_blank" rel="noopener noreferrer">📱</a>
            <a href="https://t.me/nova_union_bot" className="social-link" title="VPN бот" target="_blank" rel="noopener noreferrer">🛡️</a>
            <a href="https://youtube.com" className="social-link" title="YouTube" target="_blank" rel="noopener noreferrer">▶️</a>
            <a href="https://discord.gg" className="social-link" title="Discord" target="_blank" rel="noopener noreferrer">🎧</a>
          </div>
        </div>

        <div className="footer-section">
          <h3>Каталог</h3>
          <ul>
            <li><a href="/catalog?category=games">Игры</a></li>
            <li><a href="/catalog?category=items">Предметы</a></li>
            <li><a href="/steam-topup">Steam</a></li>
            <li><a href="/deals">Акции</a></li>
          </ul>
        </div>

        <div className="footer-section">
          <h3>Поддержка</h3>
          <ul>
            <li><a href="https://t.me/nu_support_bot" target="_blank" rel="noopener noreferrer">📱 Telegram поддержка</a></li>
            <li><a href="mailto:support@nova-shop.ru">✉️ Email</a></li>
            <li><a href="https://t.me/nu_support_bot" target="_blank" rel="noopener noreferrer">❓ FAQ</a></li>
            <li><a href="https://t.me/nu_support_bot" target="_blank" rel="noopener noreferrer">📊 Статус</a></li>
          </ul>
        </div>

        <div className="footer-section">
          <h3>VPN Сервис</h3>
          <ul>
            <li>
              <a href="https://t.me/nova_union_bot" target="_blank" rel="noopener noreferrer" className="footer-vpn-link">
                🛡️ @nova_union_bot
              </a>
            </li>
            <li><span className="footer-vpn-feature">✓ Обход блокировок</span></li>
            <li><span className="footer-vpn-feature">✓ Высокая скорость</span></li>
            <li><span className="footer-vpn-feature">✓ 24/7 поддержка</span></li>
          </ul>
        </div>

        <div className="footer-section">
          <h3>Правовые</h3>
          <ul>
            <li>
              <button className="footer-legal-btn" onClick={() => openModal('terms')}>
                📜 Условия использования
              </button>
            </li>
            <li>
              <button className="footer-legal-btn" onClick={() => openModal('privacy')}>
                🔒 Конфиденциальность
              </button>
            </li>
            <li>
              <button className="footer-legal-btn" onClick={() => openModal('cookies')}>
                🍪 Cookies
              </button>
            </li>
            <li>
              <button className="footer-legal-btn" onClick={() => openModal('refunds')}>
                💸 Возврат
              </button>
            </li>
          </ul>
        </div>
      </div>

      {/* Баннер Telegram как на yepshop */}
      <div className="footer-telegram-banner">
        <a href="https://t.me/nu_support_bot" target="_blank" rel="noopener noreferrer" className="telegram-banner-link">
          <span className="telegram-banner-icon">📱</span>
          <div className="telegram-banner-text">
            <span className="telegram-banner-title">Мы в Телеграме</span>
            <span className="telegram-banner-desc">Поддержка и покупки прямо в мессенджере</span>
          </div>
          <span className="telegram-banner-arrow">→</span>
        </a>
      </div>

      <div className="footer-bottom">
        <div className="footer-bottom-content">
          <p>© 2024-2026 Nova Shop. Все права защищены.</p>
          <div className="footer-badges">
            <span className="footer-badge">🔒 Безопасные платежи</span>
            <span className="footer-badge">⚡ Мгновенная доставка</span>
            <span className="footer-badge">🤖 AI-powered</span>
          </div>
        </div>
      </div>

      {/* Модальное окно правовых документов */}
      {activeModal && (
        <div className="legal-modal-overlay" onClick={closeModal}>
          <div className="legal-modal" onClick={(e) => e.stopPropagation()}>
            <button className="legal-modal-close" onClick={closeModal}>✕</button>
            <div 
              className="legal-modal-content"
              dangerouslySetInnerHTML={{ __html: legalDocs[activeModal].content }}
            />
          </div>
        </div>
      )}
    </footer>
  );
}

export default Footer;
