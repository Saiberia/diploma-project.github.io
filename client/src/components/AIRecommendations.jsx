import { useState, useEffect } from 'react';
import '../styles/AIRecommendations.css';

function AIRecommendations() {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Имитируем вызов AI сервиса
    setTimeout(() => {
      const recs = [
        {
          id: 1,
          name: 'Steam Wallet 1000 ₽',
          reason: 'Самый популярный товар этого месяца',
          price: 1000,
          icon: '🎮',
          confidence: 98,
          purchases: 2547
        },
        {
          id: 2,
          name: 'Valorant Battle Pass',
          reason: 'Рекомендуем для любителей шутеров',
          price: 1099,
          icon: '🎯',
          confidence: 95,
          purchases: 1893
        },
        {
          id: 3,
          name: 'Dota 2 Battle Pass',
          reason: 'Актуально в текущем сезоне',
          price: 2799,
          icon: '⚔️',
          confidence: 92,
          purchases: 1645
        },
        {
          id: 4,
          name: 'CS2 Prime Status',
          reason: 'Рекомендуют игроки с похожим профилем',
          price: 799,
          icon: '💎',
          confidence: 89,
          purchases: 1234
        }
      ];
      setRecommendations(recs);
      setLoading(false);
    }, 500);
  }, []);

  if (loading) {
    return (
      <div className="ai-recommendations">
        <div className="rec-header">
          <h3>🤖 AI Рекомендации</h3>
        </div>
        <div className="loading-pulse">Загружаем рекомендации...</div>
      </div>
    );
  }

  return (
    <div className="ai-recommendations">
      <div className="rec-header">
        <h3>🤖 AI Рекомендации для вас</h3>
        <span className="rec-badge">На основе анализа 50K+ заказов</span>
      </div>
      
      <div className="recommendations-grid">
        {recommendations.map(rec => (
          <div key={rec.id} className="rec-card">
            <div className="rec-confidence">
              <div className="confidence-bar">
                <div className="confidence-fill" style={{ width: rec.confidence + '%' }}></div>
              </div>
              <span className="confidence-text">{rec.confidence}% совпадение</span>
            </div>
            
            <div className="rec-icon">{rec.icon}</div>
            
            <h4 className="rec-name">{rec.name}</h4>
            
            <p className="rec-reason">💡 {rec.reason}</p>
            
            <div className="rec-stats">
              <span className="rec-stat">
                👥 {rec.purchases.toLocaleString('ru-RU')} покупок
              </span>
            </div>
            
            <div className="rec-price">{rec.price} ₽</div>
            
            <button className="btn-add-to-cart">
              Добавить в корзину
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AIRecommendations;
