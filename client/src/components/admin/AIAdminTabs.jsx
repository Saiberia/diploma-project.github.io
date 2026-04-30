/**
 * AI-вкладки админ-панели Nova Shop.
 *
 * Семь компонентов, каждый рендерит одну вкладку:
 *   Frontend Intelligence (тема пользователя):
 *     1. AIDashboardTab        — сводный экран всех AI-модулей
 *     2. UserBehaviorTab       — профили пользователей, поиск похожих
 *     3. SearchAnalyticsTab    — топ запросов, zero-result, intents
 *     4. ChatAnalyticsTab      — топ интентов чатбота, sentiment
 *     5. RecMetricsTab         — Precision/Recall/NDCG/MRR + α-sweep
 *
 *   Backend Intelligence (тема друга):
 *     6. FraudMonitorTab       — лог заблокированных транзакций + ручная проверка
 *     7. DemandForecastTab     — прогноз спроса по выбранному товару
 *     8. DynamicPricingTab     — таблица AI-цен + калькулятор
 *     9. InventoryAITab        — алерты stockout + рекомендации перезаказа
 *    10. OrderQueueTab         — очередь заказов с AI-приоритизацией
 */

import { useEffect, useState, useMemo } from 'react';
import { aiAPI, ordersAPI } from '../../services/api';
import '../../styles/AIAdminTabs.css';

/* ─────────────────────────────────────────────────────────────────────────
   1. AI DASHBOARD — сводный экран (видно сразу всё хозяйство)
   ───────────────────────────────────────────────────────────────────────── */

export function AIDashboardTab() {
  const [analytics, setAnalytics] = useState(null);
  const [inventorySummary, setInventorySummary] = useState(null);
  const [searchAnalytics, setSearchAnalytics] = useState(null);
  const [chatAnalytics, setChatAnalytics] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([
      aiAPI.getAnalytics().then(r => r.data),
      aiAPI.getInventoryAlerts().then(r => r.data.summary).catch(() => null),
      aiAPI.getSearchAnalytics().then(r => r.data).catch(() => null),
      aiAPI.getChatAnalytics().then(r => r.data).catch(() => null)
    ])
      .then(([a, inv, srch, ch]) => {
        setAnalytics(a);
        setInventorySummary(inv);
        setSearchAnalytics(srch);
        setChatAnalytics(ch);
      })
      .catch(e => setError(e.message));
  }, []);

  if (error) return <div className="ai-error">Ошибка загрузки: {error}</div>;
  if (!analytics) return <div className="ai-loading">Загрузка AI-статистики…</div>;

  const q = analytics.qualityMetrics || {};

  return (
    <div className="ai-dashboard">
      <div className="ai-section-title">
        <h2>🧠 AI Engine — общий статус</h2>
        <span className="ai-tag">live</span>
      </div>

      {/* Карточки модулей */}
      <div className="ai-modules-grid">
        <ModuleCard
          icon="🎯"
          title="Рекомендации"
          subtitle={analytics.models.recommendation.algorithms.join(' · ')}
          version={analytics.models.recommendation.version}
          metric={q.hybrid?.precision != null
            ? `P@5 = ${(q.hybrid.precision * 100).toFixed(1)}%`
            : null}
          color="indigo"
        />
        <ModuleCard
          icon="🔍"
          title="Поиск (BM25)"
          subtitle={analytics.models.search.method}
          version={analytics.models.search.version}
          metric={searchAnalytics
            ? `${searchAnalytics.total} запр., ${searchAnalytics.avgProcessingMs} ms`
            : null}
          color="blue"
        />
        <ModuleCard
          icon="💬"
          title="Чат-бот"
          subtitle={analytics.models.chatbot.method}
          version={analytics.models.chatbot.version}
          metric={chatAnalytics
            ? `${chatAnalytics.total} диалогов, conf ${chatAnalytics.avgConfidence}`
            : null}
          color="violet"
        />
        <ModuleCard
          icon="🛡️"
          title="Антифрод"
          subtitle={`${analytics.models.fraud.heuristics} эвристик`}
          version={analytics.models.fraud.version}
          metric={`${analytics.logs.flaggedTransactions} заблокировано`}
          color="rose"
        />
        <ModuleCard
          icon="📈"
          title="Прогноз спроса"
          subtitle={analytics.models.demand.method}
          version={analytics.models.demand.version}
          metric={null}
          color="emerald"
        />
        <ModuleCard
          icon="💰"
          title="Динам. цены"
          subtitle={`${analytics.models.pricing.factors} факторов`}
          version={analytics.models.pricing.version}
          metric="±30% capping"
          color="amber"
        />
        <ModuleCard
          icon="📦"
          title="Inventory AI"
          subtitle="ROP + EOQ + safety stock"
          version="1.0"
          metric={inventorySummary
            ? `${inventorySummary.reorderNeeded} к перезаказу`
            : null}
          color="cyan"
        />
        <ModuleCard
          icon="⚡"
          title="Приоритизация"
          subtitle="Loyalty × Amount × Wait × Risk"
          version="1.0"
          metric={null}
          color="orange"
        />
      </div>

      {/* Поведение */}
      <div className="ai-section-title">
        <h2>👥 Поведение пользователей</h2>
      </div>
      <div className="ai-stats-row">
        <Stat label="Уникальных юзеров" value={analytics.totalUsers} />
        <Stat label="Активны за час" value={analytics.activeUsers} accent="emerald" />
        <Stat label="Действий записано" value={analytics.totalTrackedActions} />
        <Stat label="Логов поиска" value={analytics.logs.search} />
        <Stat label="Логов чата" value={analytics.logs.chat} />
        <Stat label="Логов рекомендаций" value={analytics.logs.reco} />
      </div>

      {/* Качество рекомендаций */}
      {q.hybrid && (
        <>
          <div className="ai-section-title">
            <h2>📐 Качество рекомендаций @5</h2>
            <span className="ai-tag-secondary">offline-метрики, hold-out 30%</span>
          </div>
          <div className="ai-quality-table">
            <table>
              <thead>
                <tr>
                  <th>Алгоритм</th>
                  <th>Precision</th>
                  <th>Recall</th>
                  <th>NDCG</th>
                  <th>MRR</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(q).map(([algo, m]) => (
                  <tr key={algo}>
                    <td><strong>{algo}</strong></td>
                    <td>{(m.precision * 100).toFixed(1)}%</td>
                    <td>{(m.recall * 100).toFixed(1)}%</td>
                    <td>{(m.ndcg * 100).toFixed(1)}%</td>
                    <td>{(m.mrr * 100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function ModuleCard({ icon, title, subtitle, version, metric, color }) {
  return (
    <div className={`ai-module-card ai-color-${color}`}>
      <div className="ai-module-icon">{icon}</div>
      <div className="ai-module-info">
        <div className="ai-module-head">
          <strong>{title}</strong>
          <span className="ai-module-version">v{version}</span>
        </div>
        <div className="ai-module-sub">{subtitle}</div>
        {metric && <div className="ai-module-metric">{metric}</div>}
      </div>
    </div>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div className={`ai-stat ${accent ? 'ai-stat-' + accent : ''}`}>
      <span className="ai-stat-value">{value}</span>
      <span className="ai-stat-label">{label}</span>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   2. USER BEHAVIOR — профили поведения, похожие пользователи
   ───────────────────────────────────────────────────────────────────────── */

export function UserBehaviorTab() {
  const [profiles, setProfiles] = useState([]);
  const [selected, setSelected] = useState(null);
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    aiAPI.getUsers(50).then(r => {
      setProfiles(r.data.profiles || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selected) return;
    aiAPI.getUser(selected).then(r => setDetails(r.data)).catch(() => setDetails(null));
  }, [selected]);

  if (loading) return <div className="ai-loading">Загрузка профилей…</div>;

  if (!profiles.length) {
    return (
      <div className="ai-empty-state">
        <h3>📭 Пока нет данных о поведении</h3>
        <p>Профили появятся, когда пользователи начнут просматривать товары.</p>
        <p>Откройте сайт в другой вкладке, посмотрите несколько товаров — данные подтянутся.</p>
      </div>
    );
  }

  return (
    <div className="ai-behavior">
      <div className="ai-behavior-layout">
        <aside className="ai-behavior-list">
          <h3>Топ-50 по активности</h3>
          {profiles.map(p => (
            <button
              key={p.userId}
              className={`ai-user-row ${selected === p.userId ? 'active' : ''}`}
              onClick={() => setSelected(p.userId)}
            >
              <div className="ai-user-row-id">{p.userId}</div>
              <div className="ai-user-row-stats">
                <span>👁 {p.views}</span>
                <span>💳 {p.purchases}</span>
                <span>⭐ {p.loyaltyScore}</span>
              </div>
              {p.topCategory && <span className="ai-user-row-cat">{p.topCategory}</span>}
            </button>
          ))}
        </aside>

        <main className="ai-behavior-detail">
          {!selected && <div className="ai-empty">Выберите пользователя слева</div>}
          {selected && !details && <div className="ai-loading">Загрузка профиля…</div>}
          {details && (
            <>
              <h2>👤 {details.userId}</h2>
              <div className="ai-stats-row">
                <Stat label="Loyalty Score" value={Math.round(details.preferences.loyaltyScore || 0)} accent="emerald" />
                <Stat label="Просмотров" value={details.history.views.length} />
                <Stat label="Покупок" value={details.history.purchases.length} />
                <Stat label="Поисков" value={details.history.searches.length} />
                <Stat label="Средний чек" value={`${Math.round(details.preferences.avgOrderValue || 0)} ₽`} />
                <Stat label="Похожих юзеров" value={details.similarUsers.length} />
              </div>

              {Object.keys(details.preferences.favoriteCategories || {}).length > 0 && (
                <section>
                  <h3>🏷 Любимые категории</h3>
                  <div className="ai-bars">
                    {Object.entries(details.preferences.favoriteCategories)
                      .sort((a, b) => b[1] - a[1])
                      .map(([cat, count]) => (
                        <div key={cat} className="ai-bar-row">
                          <span className="ai-bar-label">{cat}</span>
                          <div className="ai-bar"><div className="ai-bar-fill" style={{ width: `${Math.min(100, count * 10)}%` }} /></div>
                          <span className="ai-bar-count">{count}</span>
                        </div>
                      ))}
                  </div>
                </section>
              )}

              {details.similarUsers.length > 0 && (
                <section>
                  <h3>🤝 Похожие пользователи (Jaccard по категориям)</h3>
                  <div className="ai-similar-list">
                    {details.similarUsers.map(s => (
                      <div key={s.userId} className="ai-similar">
                        <span>{s.userId}</span>
                        <span className="ai-similarity">sim = {s.similarity}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <section>
                <h3>📜 Последние просмотры</h3>
                <ul className="ai-history-list">
                  {details.history.views.slice(-10).reverse().map((v, i) => (
                    <li key={i}>
                      <span className="ai-history-time">{new Date(v.timestamp).toLocaleString()}</span>
                      product #{v.productId}
                      {v.category && <em> · {v.category}</em>}
                    </li>
                  ))}
                  {details.history.views.length === 0 && <li className="ai-empty-row">Просмотров пока нет</li>}
                </ul>
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   3. SEARCH ANALYTICS — топ запросов, zero-result, intents
   ───────────────────────────────────────────────────────────────────────── */

export function SearchAnalyticsTab() {
  const [data, setData] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  useEffect(() => {
    aiAPI.getSearchAnalytics().then(r => setData(r.data));
  }, [refreshKey]);
  useEffect(() => {
    const t = setInterval(() => setRefreshKey(k => k + 1), 5000);
    return () => clearInterval(t);
  }, []);
  if (!data) return <div className="ai-loading">Загрузка…</div>;
  if (!data.total) {
    return (
      <div className="ai-empty-state">
        <h3>📭 Поисковых запросов ещё не было</h3>
        <p>Откройте главную и попробуйте поиск — здесь появятся топ запросов, intent-распределение и среднее время BM25.</p>
        <button onClick={() => setRefreshKey(k => k + 1)} className="btn-link">↻ Обновить</button>
      </div>
    );
  }

  return (
    <div className="ai-search-analytics">
      <div className="ai-section-title" style={{ marginTop: 0 }}>
        <h2>🔍 Search Analytics</h2>
        <button onClick={() => setRefreshKey(k => k + 1)} className="btn-link">↻ Обновить</button>
      </div>
      <div className="ai-stats-row">
        <Stat label="Всего запросов" value={data.total} />
        <Stat label="Avg время BM25" value={`${data.avgProcessingMs} ms`} accent="emerald" />
        <Stat label="Zero-result" value={data.zeroResultQueries.length} accent="rose" />
        <Stat label="Уникальных intents" value={Object.keys(data.intents).length} />
      </div>

      <div className="ai-two-col">
        <section>
          <h3>🔥 Топ-15 запросов</h3>
          <table className="ai-rank-table">
            <tbody>
              {data.topQueries.map((q, i) => (
                <tr key={q.query}>
                  <td className="rank">#{i + 1}</td>
                  <td className="query"><code>{q.query}</code></td>
                  <td className="count">{q.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section>
          <h3>❗ Запросы без результатов</h3>
          {data.zeroResultQueries.length === 0
            ? <p className="ai-empty">Все запросы что-то находят — отлично.</p>
            : (
              <table className="ai-rank-table">
                <tbody>
                  {data.zeroResultQueries.map((q, i) => (
                    <tr key={q.query}>
                      <td className="rank">#{i + 1}</td>
                      <td className="query"><code>{q.query}</code></td>
                      <td className="count zero">{q.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          <p className="ai-hint">💡 Эти запросы — кандидаты на новые товары/синонимы в словаре алиасов.</p>
        </section>
      </div>

      <section>
        <h3>🎯 Intent-распределение</h3>
        <div className="ai-bars">
          {Object.entries(data.intents)
            .sort((a, b) => b[1] - a[1])
            .map(([intent, count]) => {
              const pct = Math.round((count / data.total) * 100);
              return (
                <div key={intent} className="ai-bar-row">
                  <span className="ai-bar-label">{intent}</span>
                  <div className="ai-bar"><div className="ai-bar-fill" style={{ width: `${pct}%` }} /></div>
                  <span className="ai-bar-count">{count} ({pct}%)</span>
                </div>
              );
            })}
        </div>
      </section>

      <section>
        <h3>🕐 Последние 20 запросов</h3>
        <table className="ai-log-table">
          <thead>
            <tr><th>Время</th><th>Запрос</th><th>Intent</th><th>Найдено</th><th>BM25</th></tr>
          </thead>
          <tbody>
            {data.recent.map((e, i) => (
              <tr key={i} className={e.totalFound === 0 ? 'zero' : ''}>
                <td>{new Date(e.ts).toLocaleTimeString()}</td>
                <td><code>{e.query}</code></td>
                <td><span className="intent-tag">{e.intent}</span></td>
                <td>{e.totalFound}</td>
                <td>{e.processingMs} ms</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   4. CHAT ANALYTICS
   ───────────────────────────────────────────────────────────────────────── */

export function ChatAnalyticsTab() {
  const [data, setData] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  useEffect(() => {
    aiAPI.getChatAnalytics().then(r => setData(r.data));
  }, [refreshKey]);
  useEffect(() => {
    const t = setInterval(() => setRefreshKey(k => k + 1), 5000);
    return () => clearInterval(t);
  }, []);
  if (!data) return <div className="ai-loading">Загрузка…</div>;
  if (!data.total) {
    return (
      <div className="ai-empty-state">
        <h3>📭 Диалогов с чат-ботом пока не было</h3>
        <p>Откройте чат-бот в правом нижнем углу сайта — статистика по intents, sentiment и confidence появится здесь.</p>
        <button onClick={() => setRefreshKey(k => k + 1)} className="btn-link">↻ Обновить</button>
      </div>
    );
  }

  return (
    <div className="ai-chat-analytics">
      <div className="ai-section-title" style={{ marginTop: 0 }}>
        <h2>💬 Chat Analytics</h2>
        <button onClick={() => setRefreshKey(k => k + 1)} className="btn-link">↻ Обновить</button>
      </div>
      <div className="ai-stats-row">
        <Stat label="Всего сообщений" value={data.total} />
        <Stat label="Avg confidence" value={data.avgConfidence} accent="emerald" />
        <Stat label="Unknown" value={`${data.unknownRate != null ? Math.round(data.unknownRate * 100) : 0}%`} accent="rose" />
        <Stat label="Low conf" value={`${data.lowConfidenceRate != null ? Math.round(data.lowConfidenceRate * 100) : 0}%`} accent="amber" />
        <Stat label="Уникальных intents" value={Object.keys(data.intents).length} />
        <Stat label="Уникальных sentiments" value={Object.keys(data.sentiment).length} />
      </div>

      <div className="ai-two-col">
        <section>
          <h3>🎯 Топ-интенты</h3>
          <div className="ai-bars">
            {Object.entries(data.intents).map(([intent, count]) => {
              const pct = Math.round((count / data.total) * 100);
              return (
                <div key={intent} className="ai-bar-row">
                  <span className="ai-bar-label">{intent}</span>
                  <div className="ai-bar"><div className="ai-bar-fill" style={{ width: `${pct}%` }} /></div>
                  <span className="ai-bar-count">{count} ({pct}%)</span>
                </div>
              );
            })}
          </div>
        </section>

        <section>
          <h3>🎭 Sentiment</h3>
          <div className="ai-sentiment-pies">
            {Object.entries(data.sentiment).map(([s, c]) => (
              <div key={s} className={`ai-sentiment ai-sentiment-${s}`}>
                <span className="s-label">{s === 'positive' ? '😊' : s === 'negative' ? '😞' : '😐'} {s}</span>
                <span className="s-value">{c}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {data.topUnresolved && data.topUnresolved.length > 0 && (
        <section>
          <h3>🧩 Топ “непонятых” фраз (fallback)</h3>
          <table className="ai-rank-table">
            <tbody>
              {data.topUnresolved.map((x, i) => (
                <tr key={x.message}>
                  <td className="rank">#{i + 1}</td>
                  <td className="query"><code>{x.message}</code></td>
                  <td className="count zero">{x.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="ai-hint">💡 Это “корпус” для расширения примеров/синонимов и снижения unknown-rate.</p>
        </section>
      )}

      <section>
        <h3>🕐 Последние 20 сообщений</h3>
        <table className="ai-log-table">
          <thead>
            <tr><th>Время</th><th>Сообщение</th><th>Intent</th><th>Sentiment</th><th>Confidence</th></tr>
          </thead>
          <tbody>
            {data.recent.map((e, i) => (
              <tr key={i}>
                <td>{new Date(e.ts).toLocaleTimeString()}</td>
                <td className="msg-cell">{e.message}</td>
                <td><span className="intent-tag">{e.intent}</span></td>
                <td><span className={`sentiment-tag s-${e.sentiment}`}>{e.sentiment}</span></td>
                <td>{e.confidence != null ? e.confidence : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   5. RECOMMENDATION METRICS
   ───────────────────────────────────────────────────────────────────────── */

export function RecMetricsTab() {
  const [data, setData] = useState(null);
  const [sweep, setSweep] = useState(null);
  const [alpha, setAlpha] = useState(0.5);
  const [users, setUsers] = useState(30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [m, s] = await Promise.all([
        aiAPI.getMetrics({ ks: '3,5,10', alpha, users }).then(r => r.data),
        aiAPI.getAlphaSweep({ k: 5 }).then(r => r.data)
      ]);
      setData(m);
      setSweep(s);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  return (
    <div className="ai-metrics-tab">
      <div className="ai-metrics-controls">
        <label>α: <input type="range" min="0" max="1" step="0.1" value={alpha} onChange={e => setAlpha(parseFloat(e.target.value))} /> <strong>{alpha.toFixed(1)}</strong></label>
        <label>Users: <input type="number" min="10" max="100" value={users} onChange={e => setUsers(parseInt(e.target.value) || 30)} /></label>
        <button onClick={load} disabled={loading} className="btn-primary">{loading ? 'Считаем…' : 'Пересчитать'}</button>
      </div>

      {error && <div className="ai-error">Ошибка: {error}</div>}

      {data && (
        <>
          <div className="ai-section-title">
            <h2>📐 Метрики качества</h2>
            <span className="ai-tag-secondary">{data.methodology.evalUsersTotal} held-out юзеров</span>
          </div>

          {data.methodology.ks.map(k => (
            <div key={k} className="ai-metrics-block">
              <h3>@{k}</h3>
              <table className="ai-quality-table">
                <thead>
                  <tr><th>Алгоритм</th><th>Precision</th><th>Recall</th><th>NDCG</th><th>MRR</th></tr>
                </thead>
                <tbody>
                  {Object.entries(data.results).map(([algo, d]) => (
                    <tr key={algo}>
                      <td><strong>{algo}</strong></td>
                      <td>{(d.metrics[`@${k}`].precision * 100).toFixed(2)}%</td>
                      <td>{(d.metrics[`@${k}`].recall * 100).toFixed(2)}%</td>
                      <td>{(d.metrics[`@${k}`].ndcg * 100).toFixed(2)}%</td>
                      <td>{(d.metrics[`@${k}`].mrr * 100).toFixed(2)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </>
      )}

      {sweep && (
        <div className="ai-metrics-block">
          <h3>🎚 α-sweep (Precision@5)</h3>
          <div className="ai-sweep">
            {sweep.sweep.map(({ alpha: a, metrics }) => {
              const p = metrics['@5']?.precision || 0;
              return (
                <div key={a} className="ai-sweep-bar">
                  <div className="ai-sweep-fill" style={{ height: `${p * 200}px` }} />
                  <span className="ai-sweep-label">α={a}</span>
                  <span className="ai-sweep-value">{(p * 100).toFixed(1)}%</span>
                </div>
              );
            })}
          </div>
          <p className="ai-hint">α = 1 — чистый content-based; α = 0 — чистый CF; пик показывает оптимальный баланс.</p>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   6. FRAUD MONITOR
   ───────────────────────────────────────────────────────────────────────── */

export function FraudMonitorTab() {
  const [log, setLog] = useState([]);
  const [testForm, setTestForm] = useState({ userId: 'test_user', amount: 500, ipAddress: '127.0.0.1' });
  const [testResult, setTestResult] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    aiAPI.getFraudLog(50).then(r => setLog(r.data || []));
  }, [refreshKey]);

  const runCheck = async () => {
    try {
      const { data } = await aiAPI.verifyTransaction(testForm);
      setTestResult(data);
      setRefreshKey(k => k + 1);
    } catch (e) {
      setTestResult({ error: e.message });
    }
  };

  return (
    <div className="ai-fraud-monitor">
      <div className="ai-fraud-test">
        <h3>🧪 Проверить транзакцию вручную</h3>
        <div className="ai-fraud-form">
          <label>userId <input value={testForm.userId} onChange={e => setTestForm({ ...testForm, userId: e.target.value })} /></label>
          <label>amount <input type="number" value={testForm.amount} onChange={e => setTestForm({ ...testForm, amount: parseFloat(e.target.value) || 0 })} /></label>
          <label>IP <input value={testForm.ipAddress} onChange={e => setTestForm({ ...testForm, ipAddress: e.target.value })} /></label>
          <button onClick={runCheck} className="btn-primary">Проверить</button>
        </div>
        {testResult && (
          <div className={`ai-fraud-result fraud-${testResult.riskLevel}`}>
            {testResult.error
              ? `Ошибка: ${testResult.error}`
              : (
                <>
                  <strong>Risk: {testResult.riskScore}/100 ({testResult.riskLevel})</strong>
                  {testResult.blocked && <span className="blocked"> — ЗАБЛОКИРОВАНО</span>}
                  <div className="ai-fraud-triggers">
                    {(testResult.triggers || []).map((t, i) => <code key={i}>{t}</code>)}
                  </div>
                  <p>💡 {testResult.recommendation}</p>
                </>
              )
            }
          </div>
        )}
      </div>

      <div className="ai-section-title">
        <h2>🛡️ Лог заблокированных транзакций</h2>
        <button onClick={() => setRefreshKey(k => k + 1)} className="btn-link">↻ Обновить</button>
      </div>
      {log.length === 0
        ? <div className="ai-empty">Заблокированных транзакций пока нет.</div>
        : (
          <table className="ai-log-table">
            <thead>
              <tr><th>Время</th><th>txn ID</th><th>userId</th><th>amount</th><th>IP</th><th>risk</th><th>triggers</th></tr>
            </thead>
            <tbody>
              {log.map((e, i) => (
                <tr key={e.transactionId || i} className="zero">
                  <td>{new Date(e.checkedAt).toLocaleString()}</td>
                  <td><code>{e.transactionId}</code></td>
                  <td>{e.userId}</td>
                  <td>{e.amount} ₽</td>
                  <td>{e.ipAddress}</td>
                  <td><strong>{e.riskScore}</strong></td>
                  <td className="triggers-cell">
                    {(e.triggers || []).map((t, j) => <div key={j}><code>{t}</code></div>)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   7. DEMAND FORECAST
   ───────────────────────────────────────────────────────────────────────── */

export function DemandForecastTab({ products }) {
  const [productId, setProductId] = useState('steam-100');
  const [days, setDays] = useState(14);
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(true);
  const [holidayCalendar, setHolidayCalendar] = useState([]);

  const productOptions = useMemo(() => {
    const seeded = ['steam-100', 'steam-50', 'steam-20', 'valorant-bp', 'xbox-pass'];
    const real = products.map(p => ({ id: String(p.id), label: p.name }));
    return [
      ...seeded.map(id => ({ id, label: `[seed] ${id}` })),
      ...real
    ];
  }, [products]);

  const load = async () => {
    setLoading(true);
    try {
      const [{ data: f }, holidays] = await Promise.all([
        aiAPI.getDemandForecast(productId, days),
        aiAPI.getHolidayCalendar(Math.max(days, 60)).then(r => r.data.holidays).catch(() => [])
      ]);
      setForecast(f);
      setHolidayCalendar(holidays);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const maxVal = forecast?.forecast?.reduce((m, d) => Math.max(m, d.upperBound), 0) || 1;

  const upcomingHolidays = useMemo(() => {
    if (!holidayCalendar?.length) return [];
    const todayStr = new Date().toISOString().split('T')[0];
    return holidayCalendar.filter(h => h.date >= todayStr).slice(0, 8);
  }, [holidayCalendar]);

  return (
    <div className="ai-forecast-tab">
      <div className="ai-forecast-controls">
        <label>Товар:
          <select value={productId} onChange={e => setProductId(e.target.value)}>
            {productOptions.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </label>
        <label>Дней: <input type="number" min="3" max="60" value={days} onChange={e => setDays(parseInt(e.target.value) || 14)} /></label>
        <label className="toggle-checkbox">
          <input type="checkbox" checked={showHistory} onChange={e => setShowHistory(e.target.checked)} />
          <span>Показывать историю</span>
        </label>
        <button onClick={load} disabled={loading} className="btn-primary">{loading ? 'Считаем…' : 'Прогноз'}</button>
      </div>

      {forecast && (
        <>
          <div className="ai-stats-row">
            <Stat label="Точек данных" value={forecast.dataPoints} />
            <Stat label="Avg/день (прогноз)" value={forecast.summary.avgDaily} />
            <Stat label="Avg 7 дн (история)" value={forecast.summary.avg7DaySales} />
            <Stat label="Тренд" value={`${forecast.summary.trend} (×${forecast.summary.trendValue})`} accent={forecast.summary.trend === 'rising' ? 'emerald' : forecast.summary.trend === 'falling' ? 'rose' : ''} />
            <Stat label="Σ за горизонт" value={forecast.summary.totalPredicted} />
            <Stat label="Праздников впереди" value={forecast.holidays?.length || 0} accent={forecast.holidays?.length ? 'amber' : ''} />
          </div>

          <div className="ai-forecast-method">
            🧮 Формула: <code>{forecast.method || 'MA(7) × trend × weekday × holiday'}</code>
            <span className="ai-forecast-method-hint">avg7 = {forecast.summary.avg7DaySales} · trend = ×{forecast.summary.trendValue}</span>
          </div>

          {/* График — двойной: история + прогноз */}
          <div className="ai-forecast-chart-wrap">
            {showHistory && forecast.historyTail?.length > 0 && (
              <div className="ai-forecast-chart history">
                {forecast.historyTail.map((d, i) => {
                  const h = (d.quantity / maxVal) * 100;
                  return (
                    <div key={`h-${i}`} className="ai-forecast-bar history">
                      <div className="ai-forecast-main history" style={{ height: `${h}%` }} title={`${d.date}: ${d.quantity}`} />
                      <span className="ai-forecast-day">{d.date.slice(5)}</span>
                      <span className="ai-forecast-val">{d.quantity}</span>
                    </div>
                  );
                })}
                <div className="ai-forecast-divider" title="Граница: история ←|→ прогноз" />
              </div>
            )}
            <div className="ai-forecast-chart">
              {forecast.forecast.map((d, i) => {
                const h = (d.predictedDemand / maxVal) * 100;
                const upH = (d.upperBound / maxVal) * 100;
                const isHoliday = !!d.holiday;
                return (
                  <div key={i} className={`ai-forecast-bar ${isHoliday ? 'is-holiday' : ''} ${d.isWeekend ? 'is-weekend' : ''}`}>
                    {isHoliday && (
                      <span className="ai-forecast-holiday-marker" title={`${d.holiday.name} ×${d.holiday.multiplier}`}>
                        {d.holiday.icon}
                      </span>
                    )}
                    <div className="ai-forecast-upper" style={{ height: `${upH}%` }} title={`upper ${d.upperBound}`} />
                    <div className="ai-forecast-main"  style={{ height: `${h}%` }}   title={
                      `${d.date} (${d.dayName})\n` +
                      `predicted ${d.predictedDemand} · conf ${d.confidence}\n` +
                      `base ${d.factors.base} × trend ${d.factors.trend} × weekday ${d.factors.weekday} × holiday ${d.factors.holiday}` +
                      (d.holiday ? `\n🎉 ${d.holiday.name}` : '')
                    } />
                    <span className="ai-forecast-day">{d.dayName}</span>
                    <span className="ai-forecast-val">{d.predictedDemand}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="ai-forecast-legend">
            <span className="leg leg-history">▍ История</span>
            <span className="leg leg-forecast">▍ Прогноз</span>
            <span className="leg leg-weekend">▍ Выходной (×1.20–1.25)</span>
            <span className="leg leg-holiday">🎉 Праздник (см. иконку)</span>
          </div>

          {forecast.holidays?.length > 0 && (
            <section className="ai-forecast-holidays-detail">
              <h3>🗓 Праздники в горизонте прогноза</h3>
              <table className="ai-rank-table">
                <thead>
                  <tr><th>Дата</th><th>День</th><th>Событие</th><th>×demand</th></tr>
                </thead>
                <tbody>
                  {forecast.holidays.map(h => (
                    <tr key={h.date}>
                      <td><code>{h.date}</code></td>
                      <td>{h.dayName}</td>
                      <td>{h.icon} {h.name}</td>
                      <td className="num"><strong>×{h.multiplier.toFixed(2)}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {upcomingHolidays.length > 0 && upcomingHolidays.length !== (forecast.holidays?.length || 0) && (
            <section className="ai-forecast-holidays-detail">
              <h3>📅 Следующие праздники (за горизонтом текущего прогноза)</h3>
              <p className="ai-hint">Увеличьте «Дней» в фильтре, чтобы захватить эти даты в прогнозе.</p>
              <table className="ai-rank-table">
                <tbody>
                  {upcomingHolidays
                    .filter(h => !(forecast.holidays || []).find(fh => fh.date === h.date))
                    .map(h => (
                      <tr key={h.date}>
                        <td><code>{h.date}</code></td>
                        <td>{h.icon} {h.name}</td>
                        <td className="num">×{h.demandMultiplier.toFixed(2)} demand · ×{h.priceMultiplier.toFixed(2)} price</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </section>
          )}

          <div className="ai-forecast-recommend">
            💡 {forecast.summary.recommendation}
          </div>
        </>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   8. DYNAMIC PRICING
   ───────────────────────────────────────────────────────────────────────── */

export function DynamicPricingTab({ products }) {
  const [calc, setCalc] = useState({
    productId: products[0]?.id || 1,
    basePrice: products[0]?.price || 1000,
    demand: 50,
    inventory: 100,
    userTier: 'standard'
  });
  const [result, setResult] = useState(null);
  const [context, setContext] = useState(null);
  const [loading, setLoading] = useState(false);
  const [autoFromProduct, setAutoFromProduct] = useState(true);

  const loadContext = async (productId) => {
    try {
      const { data } = await aiAPI.getPricingContext(productId);
      setContext(data);
      return data;
    } catch {
      setContext(null);
      return null;
    }
  };

  const recalc = async (overrides = {}) => {
    setLoading(true);
    try {
      const params = { ...calc, ...overrides };
      const { data } = await aiAPI.calculatePrice({
        productId: params.productId,
        basePrice: params.basePrice,
        context: {
          demand: params.demand,
          inventory: params.inventory,
          userTier: params.userTier
        }
      });
      setResult(data);
    } finally {
      setLoading(false);
    }
  };

  // При смене товара — подгружаем реальный контекст (остаток+спрос)
  useEffect(() => {
    (async () => {
      const ctx = await loadContext(calc.productId);
      if (ctx && autoFromProduct) {
        const next = {
          ...calc,
          basePrice: ctx.basePrice ?? calc.basePrice,
          demand: ctx.demand,
          inventory: ctx.inventory
        };
        setCalc(next);
        await recalc(next);
      } else {
        await recalc();
      }
    })();
    /* eslint-disable-next-line */
  }, [calc.productId]);

  const handleProductChange = (id) => {
    const p = products.find(x => x.id === id);
    setCalc(prev => ({
      ...prev,
      productId: id,
      basePrice: p?.price ?? prev.basePrice
    }));
  };

  const handleAutoFill = async () => {
    setAutoFromProduct(true);
    const ctx = await loadContext(calc.productId);
    if (ctx) {
      const next = {
        ...calc,
        basePrice: ctx.basePrice ?? calc.basePrice,
        demand: ctx.demand,
        inventory: ctx.inventory
      };
      setCalc(next);
      await recalc(next);
    }
  };

  return (
    <div className="ai-pricing-tab">
      <div className="ai-pricing-form">
        <h3>💰 Калькулятор динамической цены</h3>
        <label>Товар:
          <select value={calc.productId} onChange={e => handleProductChange(parseInt(e.target.value))}>
            {products.slice(0, 30).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>

        <button type="button" onClick={handleAutoFill} className="btn-secondary" style={{ marginTop: '-.25rem' }}>
          🔄 Подставить реальные данные товара
        </button>

        <label>Базовая цена: <input type="number" value={calc.basePrice} onChange={e => { setAutoFromProduct(false); setCalc({ ...calc, basePrice: parseFloat(e.target.value) }); }} /> ₽</label>
        <label>Спрос (0-100):
          <input type="range" min="0" max="100" value={calc.demand} onChange={e => { setAutoFromProduct(false); setCalc({ ...calc, demand: parseInt(e.target.value) }); }} />
          <strong>{calc.demand}</strong>
        </label>
        <label>Запас (шт): <input type="number" value={calc.inventory} onChange={e => { setAutoFromProduct(false); setCalc({ ...calc, inventory: parseInt(e.target.value) }); }} /></label>
        <label>Tier клиента:
          <select value={calc.userTier} onChange={e => setCalc({ ...calc, userTier: e.target.value })}>
            <option value="standard">standard</option>
            <option value="silver">silver (-5%)</option>
            <option value="gold">gold (-8%)</option>
            <option value="platinum">platinum (-12%)</option>
            <option value="vip">vip (-15%)</option>
          </select>
        </label>
        <button onClick={() => recalc()} className="btn-primary" disabled={loading}>
          {loading ? 'Считаем…' : 'Пересчитать'}
        </button>

        {context && (
          <div className="ai-pricing-context">
            <strong>📊 Откуда берутся цифры:</strong>
            <ul>
              <li><b>Остаток:</b> {context.inventorySource}</li>
              <li><b>Спрос:</b> {context.demandSource}</li>
              <li><b>История:</b> {context.historyDays} дней продаж</li>
            </ul>
          </div>
        )}
      </div>

      {result && (
        <div className="ai-pricing-result">
          <div className="ai-price-display">
            <div className="ai-price-base">
              <span>Базовая</span>
              <strong>{result.basePrice} ₽</strong>
            </div>
            <span className="ai-price-arrow">→</span>
            <div className={`ai-price-final ${result.dynamicPrice < result.basePrice ? 'down' : result.dynamicPrice > result.basePrice ? 'up' : 'flat'}`}>
              <span>AI-цена</span>
              <strong>{result.dynamicPrice} ₽</strong>
              {result.discount > 0  && <span className="discount-badge">−{result.discount}%</span>}
              {result.surcharge > 0 && <span className="discount-badge surcharge">+{result.surcharge}%</span>}
            </div>
          </div>

          <div className="ai-price-reason">💡 {result.reason}</div>

          {result.capping?.applied && (
            <div className="ai-pricing-cap-warning">
              ⚠️ Композиция факторов дала <code>{result.capping.rawPrice} ₽</code>,
              но цена ограничена окном [{result.capping.floor}–{result.capping.ceiling}] ₽
              (политика ±30% от базы).
            </div>
          )}

          {result.breakdown && (
            <div className="ai-pricing-steps">
              <h4>🔬 Как считается под капотом — пошагово</h4>
              <p className="ai-pricing-formula-line">
                AI-цена = base × demand × inventory × seasonal × tier × time × weekend × competition
              </p>
              <table className="ai-pricing-steps-table">
                <thead>
                  <tr>
                    <th>Фактор</th>
                    <th>Вход</th>
                    <th>Что значит</th>
                    <th className="num">×</th>
                    <th className="num">До</th>
                    <th className="num">После</th>
                    <th className="num">Δ</th>
                  </tr>
                </thead>
                <tbody>
                  {result.breakdown.map(s => (
                    <tr key={s.key} className={s.multiplier > 1 ? 'mul-up' : s.multiplier < 1 ? 'mul-down' : ''}>
                      <td><span className="step-icon">{s.icon}</span> <strong>{s.title}</strong></td>
                      <td><code>{s.input}</code></td>
                      <td className="step-label">{s.label}<br/><span className="step-formula">{s.formula}</span></td>
                      <td className="num">{s.multiplier.toFixed(2)}</td>
                      <td className="num">{s.priceBefore} ₽</td>
                      <td className="num"><strong>{s.priceAfter} ₽</strong></td>
                      <td className={`num ${s.delta > 0 ? 'up' : s.delta < 0 ? 'down' : ''}`}>
                        {s.delta > 0 ? `+${s.delta}` : s.delta} ₽
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="ai-hint">Цена действует до {new Date(result.validUntil).toLocaleString('ru-RU')}.</p>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   9. INVENTORY AI
   ───────────────────────────────────────────────────────────────────────── */

export function InventoryAITab() {
  const [data, setData] = useState(null);

  useEffect(() => {
    aiAPI.getInventoryAlerts().then(r => setData(r.data));
  }, []);

  if (!data) return <div className="ai-loading">Загрузка inventory…</div>;

  const { alerts, summary } = data;

  return (
    <div className="ai-inventory-tab">
      <div className="ai-stats-row">
        <Stat label="SKU отслеживаем" value={summary.totalSku} />
        <Stat label="Critical" value={summary.counts.critical || 0} accent="rose" />
        <Stat label="High" value={summary.counts.high || 0} accent="rose" />
        <Stat label="Medium" value={summary.counts.medium || 0} accent="amber" />
        <Stat label="Low" value={summary.counts.low || 0} />
        <Stat label="Нужен перезаказ" value={summary.reorderNeeded} />
        <Stat label="Бюджет дозаказа" value={`${summary.estimatedReorderCost.toLocaleString()} ₽`} accent="emerald" />
      </div>

      <div className="ai-section-title">
        <h2>📦 Алерты по запасам</h2>
        <span className="ai-tag-secondary">ROP = avg×lead + 1.65σ√lead</span>
      </div>

      {alerts.length === 0
        ? <div className="ai-empty">Все товары в норме — алертов нет.</div>
        : (
          <table className="ai-inventory-table">
            <thead>
              <tr>
                <th>Уровень</th>
                <th>Товар</th>
                <th>Запас</th>
                <th>Avg/день</th>
                <th>Дней хватит</th>
                <th>Stockout</th>
                <th>ROP</th>
                <th>Заказать</th>
                <th>Safety</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map(a => (
                <tr key={a.productId} className={`alert-${a.alertLevel}`}>
                  <td><span className={`alert-badge alert-${a.alertLevel}`}>{a.alertLevel}</span></td>
                  <td>{a.productName}</td>
                  <td>{a.currentStock}</td>
                  <td>{a.avgDailyDemand}</td>
                  <td>{a.daysOfStock != null ? a.daysOfStock : '∞'}</td>
                  <td>{a.stockoutDate ? `${a.stockoutDate} (через ${a.stockoutDay} дн)` : '—'}</td>
                  <td>{a.reorderPoint}</td>
                  <td><strong>{a.shouldReorder ? a.recommendedQty : '—'}</strong></td>
                  <td>{a.safetyStock}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   10. ORDER QUEUE
   ───────────────────────────────────────────────────────────────────────── */

export function OrderQueueTab() {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await ordersAPI.getQueue();
      setQueue(data.queue || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [refreshKey]);
  useEffect(() => {
    const t = setInterval(() => setRefreshKey(k => k + 1), 5000);
    return () => clearInterval(t);
  }, []);

  if (loading) return <div className="ai-loading">Загрузка очереди…</div>;

  if (!queue.length) {
    return (
      <div className="ai-empty-state">
        <h3>📭 Очередь пуста</h3>
        <p>Оформите тестовый заказ через сайт — он появится здесь с AI-приоритетом.</p>
      </div>
    );
  }

  return (
    <div className="ai-queue-tab">
      <div className="ai-section-title">
        <h2>⚡ Очередь заказов с AI-приоритизацией</h2>
        <button onClick={() => setRefreshKey(k => k + 1)} className="btn-link">↻ Обновить</button>
      </div>
      <p className="ai-hint">
        priority = 0.30·loyalty + 0.20·amount + 0.15·digital + 0.20·waittime − 0.30·risk
      </p>
      <p className="ai-hint ai-hint-info">
        💡 Подсказка: эффект суммы виден лучше, если один заказ ~100–300₽, а второй ~2000–5000₽. Также приоритет растёт с ожиданием (waittime).
      </p>

      <table className="ai-queue-table">
        <thead>
          <tr>
            <th>Приоритет</th>
            <th>Order ID</th>
            <th>Юзер</th>
            <th>Товары</th>
            <th>Сумма</th>
            <th>Risk</th>
            <th>Возраст</th>
            <th>Причины</th>
            <th>Компоненты</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {queue.map(o => (
            <tr key={o.id} className={`priority-${o.priorityLevel}`}>
              <td>
                <span className={`priority-badge priority-${o.priorityLevel}`}>
                  {o.priority} · {o.priorityLevel}
                </span>
              </td>
              <td><code>{o.id}</code></td>
              <td>{o.userId}</td>
              <td>{(o.productNames || []).join(', ') || '—'}</td>
              <td>{o.totalPrice} ₽</td>
              <td><span className={`fraud-tag fraud-${o.fraudRisk}`}>{o.fraudRisk} ({o.fraudScore})</span></td>
              <td>{age(o.createdAt)}</td>
              <td>
                <ul className="reasons-list">
                  {(o.priorityReasons || []).map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              </td>
              <td className="priority-components-cell">
                {o.priorityComponents
                  ? `loy=${o.priorityComponents.loyalty} amt=${o.priorityComponents.amount} dig=${o.priorityComponents.digital} wait=${o.priorityComponents.waittime} risk=${o.priorityComponents.risk}`
                  : '—'}
              </td>
              <td><span className="status-tag">{o.status}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function age(ts) {
  const min = Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
  if (min < 1)  return 'только что';
  if (min < 60) return `${min} мин`;
  const h = Math.floor(min / 60);
  return `${h} ч ${min % 60} мин`;
}
