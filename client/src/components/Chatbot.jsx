import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { aiAPI } from '../services/api';
import { planChatResponse, answerForLabel } from '../utils/chatbotCore';

/**
 * Nova Shop AI Chatbot (UI)
 *
 * The "brain" lives in utils/chatbotCore.js.
 * This component adds:
 *   - context between turns (last product)
 *   - retrieval (server search / recommendations)
 *   - logging for admin analytics
 */

// ───────────────────────────────────────────────────────────────────────────
// React компонент
// ───────────────────────────────────────────────────────────────────────────

function Chatbot({ user } = {}) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [ctx, setCtx] = useState({ lastProductKey: null });
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      text: '👋 Привет! Я AI-помощник Nova Shop.\n\nНапишите название игры или товара, и я помогу с покупкой!\n\nПримеры: Steam, V-Bucks, Robux, CS2…',
      time: new Date(),
      action: null
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 100);
  }, [isOpen]);

  const appendBot = (payload) => {
    const botMessage = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      type: 'bot',
      text: payload.text,
      time: new Date(),
      action: payload.action,
      actionText: payload.actionText,
      choices: payload.choices,
      cards: payload.cards
    };
    setMessages(prev => [...prev, botMessage]);
  };

  const runRetrieval = async (plan, rawText) => {
    if (!plan?.retrieval) return null;
    if (plan.retrieval.type === 'search') {
      const q = rawText;
      const { data } = await aiAPI.search(q, 5, user?.id);
      return {
        text: data.totalFound
          ? 'Вот что я нашёл в каталоге:'
          : 'По этому запросу ничего не нашёл. Попробуйте другое название или уточните жанр/платформу.',
        intent: 'retrieval:search',
        confidence: plan.confidence,
        cards: (data.results || []).slice(0, 5).map(p => ({
          id: p.id,
          title: p.name,
          subtitle: `${p.category}${p.genre ? ` · ${p.genre}` : ''}`,
          price: p.price
        }))
      };
    }
    if (plan.retrieval.type === 'recommend') {
      // Если знаем продукт из контекста — берём similar; иначе — personalized из истории.
      const key = plan.retrieval.productKey;
      if (key) {
        // маппим ключ → лучший запрос в search, затем берём top и выбираем первый как anchor
        const { data: s } = await aiAPI.search(key, 3, user?.id);
        const anchor = (s.results || [])[0];
        if (anchor?.id) {
          const { data: sim } = await aiAPI.getSimilar(anchor.id, { limit: 5, algorithm: 'content' });
          return {
            text: `Подобрал похожие варианты к «${anchor.name}»:`,
            intent: 'retrieval:recommend',
            confidence: plan.confidence,
            cards: (sim.recommendations || []).slice(0, 5).map(p => ({
              id: p.id,
              title: p.name,
              subtitle: p.reason || `${p.category}${p.genre ? ` · ${p.genre}` : ''}`,
              price: p.price
            }))
          };
        }
      }

      // Fallback: personalized
      let viewedIds = [];
      let purchasedIds = [];
      try { viewedIds = JSON.parse(localStorage.getItem('viewedProducts') || '[]'); } catch { /* ignore */ }
      try { purchasedIds = JSON.parse(localStorage.getItem('purchasedProducts') || '[]'); } catch { /* ignore */ }
      const { data } = await aiAPI.getPersonalized(viewedIds, purchasedIds, { limit: 5, algorithm: 'hybrid' });
      return {
        text: 'Подобрал рекомендации для вас:',
        intent: 'retrieval:recommend',
        confidence: plan.confidence,
        cards: (data.recommendations || []).slice(0, 5).map(p => ({
          id: p.id,
          title: p.name,
          subtitle: p.reason || `${p.category}${p.genre ? ` · ${p.genre}` : ''}`,
          price: p.price
        }))
      };
    }
    return null;
  };

  const sendQuery = async (text) => {
    const userMessage = { id: Date.now(), type: 'user', text, time: new Date() };
    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);
    const delay = Math.min(350 + text.length * 10, 900);
    await new Promise(r => setTimeout(r, delay));

    const plan = planChatResponse(text, ctx);
    // Update context if we detected a product
    if (plan?.entities?.productKey) {
      setCtx(prev => ({ ...prev, lastProductKey: plan.entities.productKey }));
    } else if (typeof plan?.intent === 'string' && plan.intent.startsWith('product:')) {
      setCtx(prev => ({ ...prev, lastProductKey: plan.intent.slice('product:'.length) }));
    }

    appendBot(plan);

    // If retrieval is needed, call backend and append cards
    if (plan.retrieval) {
      try {
        const retrieved = await runRetrieval(plan, text);
        if (retrieved) appendBot(retrieved);
      } catch {
        appendBot({
          text: 'Не смог получить данные из каталога прямо сейчас. Попробуйте ещё раз или откройте каталог.',
          action: '/catalog',
          actionText: 'Открыть каталог',
          intent: 'retrieval:error',
          confidence: 0
        });
      }
    }

    setIsTyping(false);

    // Log chat turn for admin analytics
    aiAPI.chat({
      message: text,
      intent: plan.intent,
      confidence: typeof plan.confidence === 'number' ? plan.confidence : null,
      userId: user?.id
    }).catch(() => {});
  };

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    sendQuery(text);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleAction = (action) => {
    if (/^https?:\/\//i.test(action)) {
      window.open(action, '_blank', 'noopener,noreferrer');
      return;
    }
    setIsOpen(false);
    navigate(action);
  };

  const handleChoice = (label) => {
    const ans = answerForLabel(label);
    if (!ans) return;
    appendBot({ text: ans.text, action: ans.action, actionText: ans.actionText, intent: label, confidence: 0.6 });
  };

  const handleCardClick = (productId, title) => {
    if (user?.id) {
      aiAPI.track(user.id, 'click', { productId }).catch(() => {});
    }
    setIsOpen(false);
    navigate(`/product/${productId}`);
    // Keep context for follow-up "похоже/дешевле"
    setCtx(prev => ({ ...prev, lastProductKey: title ? String(title).split(' ')[0].toLowerCase() : prev.lastProductKey }));
  };

  const quickActions = [
    { text: '💳 Пополнить Steam', query: 'пополнить стим' },
    { text: '🎮 Каталог',          query: 'открой каталог' },
    { text: '💰 Оплата',           query: 'способы оплаты' },
    { text: '❓ Как заказать',     query: 'как сделать заказ' }
  ];

  const formatTime = (date) =>
    date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

  const formatText = (text) =>
    text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>');

  return (
    <>
      <button
        className={`chatbot-toggle ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Открыть чат"
      >
        {isOpen ? '✕' : '💬'}
        {!isOpen && <span className="chatbot-badge">AI</span>}
      </button>

      {isOpen && (
        <div className="chatbot-window">
          <div className="chatbot-header">
            <div className="chatbot-header-info">
              <div className="chatbot-avatar">🤖</div>
              <div>
                <h3>Nova AI Помощник</h3>
                <span className="chatbot-status">
                  <span className="status-dot"></span>
                  Онлайн
                </span>
              </div>
            </div>
            <button className="chatbot-close" onClick={() => setIsOpen(false)}>✕</button>
          </div>

          <div className="chatbot-messages">
            {messages.map((msg) => (
              <div key={msg.id} className={`chatbot-message ${msg.type}`}>
                {msg.type === 'bot' && <div className="message-avatar">🤖</div>}
                <div className="message-content">
                  <div
                    className="message-text"
                    dangerouslySetInnerHTML={{ __html: formatText(msg.text) }}
                  />
                  {msg.choices && msg.choices.length > 0 && (
                    <div className="message-choices">
                      {msg.choices.map(c => (
                        <button
                          key={c.label}
                          className="message-choice-btn"
                          onClick={() => handleChoice(c.label)}
                        >
                          {c.title}
                        </button>
                      ))}
                    </div>
                  )}
                  {msg.action && (
                    <button
                      className="message-action-btn"
                      onClick={() => handleAction(msg.action)}
                    >
                      {msg.actionText || 'Перейти'} →
                    </button>
                  )}
                  {msg.cards && msg.cards.length > 0 && (
                    <div className="message-cards">
                      {msg.cards.map(c => (
                        <button
                          key={c.id}
                          className="message-card"
                          onClick={() => handleCardClick(c.id, c.title)}
                          title={c.subtitle || c.title}
                        >
                          <div className="mc-title">{c.title}</div>
                          {c.subtitle && <div className="mc-sub">{c.subtitle}</div>}
                          <div className="mc-price">{c.price === 0 ? 'Бесплатно' : `${c.price} ₽`}</div>
                        </button>
                      ))}
                    </div>
                  )}
                  <span className="message-time">{formatTime(msg.time)}</span>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="chatbot-message bot">
                <div className="message-avatar">🤖</div>
                <div className="message-content">
                  <div className="typing-indicator">
                    <span></span><span></span><span></span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {messages.length <= 2 && (
            <div className="chatbot-quick-actions">
              {quickActions.map((action, idx) => (
                <button
                  key={idx}
                  onClick={() => sendQuery(action.query)}
                  className="quick-action-btn"
                >
                  {action.text}
                </button>
              ))}
            </div>
          )}

          <div className="chatbot-input-area">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Напишите сообщение..."
              rows="1"
            />
            <button
              className="chatbot-send"
              onClick={handleSend}
              disabled={!input.trim()}
            >
              ➤
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default Chatbot;
