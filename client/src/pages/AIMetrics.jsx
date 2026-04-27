import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import '../styles/AIMetrics.css';

const ALGORITHM_LABELS = {
  content:       'Content-Based (TF-IDF)',
  collaborative: 'Item-Item Collaborative Filtering',
  hybrid:        'Hybrid (CB + CF)'
};

const METRIC_LABELS = {
  precision: 'Precision',
  recall:    'Recall',
  ndcg:      'NDCG',
  mrr:       'MRR'
};

function fmt(v) {
  if (v == null) return '—';
  return (v * 100).toFixed(2) + '%';
}

function MetricBar({ value, max = 1, color }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className="metric-bar">
      <div
        className="metric-bar-fill"
        style={{ width: pct + '%', background: color }}
      />
    </div>
  );
}

export default function AIMetrics({ user }) {
  const [data, setData]     = useState(null);
  const [sweep, setSweep]   = useState(null);
  const [loading, setLoad]  = useState(false);
  const [error, setError]   = useState(null);
  const [alpha, setAlpha]   = useState(0.5);
  const [numUsers, setUsers] = useState(30);

  if (!user || user.role !== 'admin') return <Navigate to="/profile" replace />;

  const load = async () => {
    setLoad(true);
    setError(null);
    try {
      const [r1, r2] = await Promise.all([
        fetch(`/api/ai/metrics?ks=3,5,10&alpha=${alpha}&users=${numUsers}`).then(r => r.json()),
        fetch(`/api/ai/metrics/alpha-sweep?k=5`).then(r => r.json())
      ]);
      if (r1.error) throw new Error(r1.error);
      setData(r1);
      setSweep(r2);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoad(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const algorithms = data ? Object.keys(data.results) : [];
  const ks = data ? data.methodology.ks : [];

  const winnerByMetric = (k, metric) => {
    if (!data) return null;
    let best = null;
    let bestVal = -Infinity;
    for (const algo of algorithms) {
      const v = data.results[algo].metrics[`@${k}`][metric];
      if (v > bestVal) { bestVal = v; best = algo; }
    }
    return best;
  };

  return (
    <div className="ai-metrics-page">
      <div className="ai-metrics-header">
        <div>
          <h1>📐 Метрики качества рекомендаций</h1>
          <p className="ai-metrics-subtitle">
            Offline-оценка алгоритмов на синтетическом held-out наборе.
          </p>
        </div>
        <Link to="/admin" className="back-link">← Админ-панель</Link>
      </div>

      <div className="ai-metrics-controls">
        <label>
          α (вес content-based в гибриде):
          <input
            type="range" min="0" max="1" step="0.1"
            value={alpha}
            onChange={e => setAlpha(parseFloat(e.target.value))}
          />
          <span className="alpha-value">{alpha.toFixed(1)}</span>
        </label>
        <label>
          Пользователей в тестовом наборе:
          <input
            type="number" min="10" max="200" step="10"
            value={numUsers}
            onChange={e => setUsers(parseInt(e.target.value) || 30)}
          />
        </label>
        <button onClick={load} disabled={loading} className="btn-run">
          {loading ? 'Считаю…' : '🔄 Запустить оценку'}
        </button>
      </div>

      {error && <div className="ai-metrics-error">⚠️ Ошибка: {error}</div>}

      {data && (
        <>
          <div className="methodology-box">
            <h3>Методология</h3>
            <ul>
              <li>
                <b>Тестовый набор:</b> {data.methodology.evalUsersTotal} синтетических
                пользователей (seed={data.methodology.seed}), не входящих
                в обучающую матрицу CF (seed={data.methodology.cfTrainingSeed}).
              </li>
              <li>
                <b>Стратегия:</b> для каждого пользователя {Math.round(data.methodology.testRatio * 100)}%
                товаров скрывается (test), остальные используются как история (train).
                Алгоритм ранжирует все товары не из train, top-K сравниваем с test.
              </li>
              <li>
                <b>Метрики:</b> Precision@k = TP/k, Recall@k = TP/|test|,
                NDCG@k = DCG/IDCG, MRR = средний обратный ранг.
              </li>
              <li><b>Срезы k:</b> {ks.join(', ')}</li>
              <li><b>α гибрида:</b> {data.alpha}</li>
            </ul>
          </div>

          {ks.map(k => (
            <div key={k} className="metrics-table-block">
              <h2>Top-{k}</h2>
              <table className="metrics-table">
                <thead>
                  <tr>
                    <th>Алгоритм</th>
                    {Object.keys(METRIC_LABELS).map(m => (
                      <th key={m}>{METRIC_LABELS[m]}@{k}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {algorithms.map(algo => {
                    const m = data.results[algo].metrics[`@${k}`];
                    return (
                      <tr key={algo}>
                        <td className="algo-name">{ALGORITHM_LABELS[algo] || algo}</td>
                        {Object.keys(METRIC_LABELS).map(metric => {
                          const isBest = winnerByMetric(k, metric) === algo;
                          return (
                            <td key={metric} className={isBest ? 'cell-best' : ''}>
                              <div className="cell-value">{fmt(m[metric])}</div>
                              <MetricBar
                                value={m[metric]}
                                color={isBest ? 'var(--primary)' : 'rgba(255,255,255,0.4)'}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}

          {sweep && (
            <div className="alpha-sweep-block">
              <h2>Кривая α для гибрида (Top-{sweep.ks[0]})</h2>
              <p className="sweep-hint">
                α = 0 → чистый CF; α = 1 → чистый CB. Видно, какая комбинация даёт
                максимум метрик на этом наборе.
              </p>
              <table className="metrics-table sweep-table">
                <thead>
                  <tr>
                    <th>α</th>
                    <th>Precision@{sweep.ks[0]}</th>
                    <th>Recall@{sweep.ks[0]}</th>
                    <th>NDCG@{sweep.ks[0]}</th>
                    <th>MRR</th>
                  </tr>
                </thead>
                <tbody>
                  {sweep.sweep.map(row => {
                    const m = row.metrics[`@${sweep.ks[0]}`];
                    return (
                      <tr key={row.alpha}>
                        <td><b>{row.alpha.toFixed(1)}</b></td>
                        <td>{fmt(m.precision)} <MetricBar value={m.precision} /></td>
                        <td>{fmt(m.recall)} <MetricBar value={m.recall} /></td>
                        <td>{fmt(m.ndcg)} <MetricBar value={m.ndcg} /></td>
                        <td>{fmt(m.mrr)} <MetricBar value={m.mrr} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="metrics-footer">
            Отчёт сгенерирован: {new Date(data.generatedAt).toLocaleString('ru-RU')}
          </div>
        </>
      )}
    </div>
  );
}
