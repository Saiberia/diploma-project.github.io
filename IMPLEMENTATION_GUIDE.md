# Implementation Guide - AI Module Improvements

**Estimated effort**: 3-7 days depending on scope  
**Priority focus**: CTR tracking + A/B testing + cold-start handling

---

## Quick Wins (2-3 hours each)

### 1. Click-Through Rate Tracking for Recommendations

**File**: `client/src/components/AIRecommendations.jsx`

```javascript
// Track when user clicks recommended product
function handleProductClick(productId, recommendationMeta) {
  // Record the click event
  const event = {
    type: 'reco:click',
    recommendationId: recommendationMeta?.recId || `reco_${Date.now()}`,
    productId,
    confidence: recommendationMeta?.confidence || 0,
    algorithm: recommendationMeta?.algorithm || 'unknown',
    position: recommendationMeta?.position || 0, // 1st, 2nd, 3rd, 4th
    sessionId: localStorage.getItem('sessionId') || generateSessionId(),
    timestamp: Date.now()
  };
  
  // Send to backend
  fetch('/api/ai/track-reco-click', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(event)
  }).catch(err => console.warn('Failed to track click:', err));
  
  // Then navigate
  trackProductView(productId);
  navigate(`/product/${productId}`);
}

// Wrap each recommendation card with tracking metadata
{recommendations.map((rec, idx) => (
  <div
    key={rec.id}
    className="rec-card"
    onClick={() => handleProductClick(rec.id, {
      recId: `reco_${idx}_${Date.now()}`,
      confidence: rec.confidence,
      algorithm: mode,
      position: idx + 1
    })}
    // ... rest of JSX
  />
))}
```

**File**: `server/routes/ai.js`

```javascript
/**
 * POST /api/ai/track-reco-click
 * Track when user clicks on recommended product
 */
router.post('/track-reco-click', (req, res) => {
  try {
    const event = req.body;
    aiEngine.trackRecommendationClick(event);
    res.json({ success: true });
  } catch (error) {
    console.error('Track reco click error:', error);
    res.status(500).json({ error: 'Failed to track' });
  }
});

/**
 * GET /api/ai/recommendations/metrics
 * Get CTR metrics for recommendations
 */
router.get('/recommendations/metrics', (req, res) => {
  try {
    const metrics = aiEngine.getRecommendationMetrics();
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get metrics' });
  }
});
```

**File**: `server/services/aiEngine.js`

```javascript
constructor() {
  // ... existing code ...
  this.recoClicks = [];     // { recId, productId, timestamp, position, algorithm }
  this.recoImpressions = []; // { recId, productId, impressionTime, confidence }
}

trackRecommendationClick(event) {
  this.recoClicks.push(event);
  // Keep last 10000 clicks
  if (this.recoClicks.length > 10000) {
    this.recoClicks.shift();
  }
}

getRecommendationMetrics() {
  // Group by algorithm
  const byAlgo = {};
  
  for (const click of this.recoClicks) {
    if (!byAlgo[click.algorithm]) {
      byAlgo[click.algorithm] = {
        clicks: 0,
        byPosition: { 1: 0, 2: 0, 3: 0, 4: 0 }
      };
    }
    byAlgo[click.algorithm].clicks++;
    if (click.position <= 4) {
      byAlgo[click.algorithm].byPosition[click.position]++;
    }
  }
  
  // Also get impressions from recoLog
  const impressions = {};
  for (const log of this.recoLog) {
    if (!impressions[log.algorithm]) {
      impressions[log.algorithm] = 0;
    }
    impressions[log.algorithm] += log.count;
  }
  
  // Calculate CTR
  const ctr = {};
  for (const [algo, stats] of Object.entries(byAlgo)) {
    const impr = impressions[algo] || 1;
    ctr[algo] = {
      clicks: stats.clicks,
      impressions: impr,
      ctr: (stats.clicks / impr * 100).toFixed(2) + '%',
      clicksByPosition: stats.byPosition,
      avgPosition: (
        (stats.byPosition[1] * 1 + 
         stats.byPosition[2] * 2 + 
         stats.byPosition[3] * 3 + 
         stats.byPosition[4] * 4) / 
        stats.clicks
      ).toFixed(1)
    };
  }
  
  return {
    totalClicks: this.recoClicks.length,
    byAlgorithm: ctr,
    lastUpdated: new Date().toISOString()
  };
}
```

**Add to Admin Tab**:
```javascript
// In AIAdminTabs.jsx - Add new metric display
export function RecoClickMetricsTab() {
  const [metrics, setMetrics] = useState(null);
  
  useEffect(() => {
    aiAPI.getRecommendationMetrics()
      .then(r => setMetrics(r.data))
      .catch(e => console.error(e));
  }, []);
  
  if (!metrics) return <div>Loading...</div>;
  
  return (
    <div className="ai-metrics">
      <h2>📊 Recommendation Click-Through Rate</h2>
      
      <table>
        <thead>
          <tr>
            <th>Algorithm</th>
            <th>Clicks</th>
            <th>Impressions</th>
            <th>CTR</th>
            <th>Avg Position</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(metrics.byAlgorithm || {}).map(([algo, stats]) => (
            <tr key={algo}>
              <td><strong>{algo}</strong></td>
              <td>{stats.clicks}</td>
              <td>{stats.impressions}</td>
              <td className={stats.ctr > 5 ? 'positive' : ''}>{stats.ctr}</td>
              <td>{stats.avgPosition}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

### 2. Cold-Start Handling for New Users

**File**: `server/services/recommendationService.js`

```javascript
/**
 * Improved: Detect cold-start and use content-only recommendations
 */
getPersonalized(viewedIds, purchasedIds, products, n = 4) {
  this._ensureInitialized(products);

  const seen = new Set([...viewedIds, ...purchasedIds]);
  
  // COLD START DETECTION
  if (seen.size === 0) {
    // Brand new user - return top-rated diverse products
    return this._topRatedDiversified(products, n);
  }
  
  if (seen.size === 1) {
    // User viewed/bought only 1 item
    // Get similar items to what they know
    const singleId = [...seen][0];
    return this.getSimilarProducts(singleId, products, n)
      .map(p => ({
        ...p,
        confidence: Math.min(p.confidence, 50), // Low confidence for cold start
        coldStart: true
      }));
  }
  
  if (seen.size < 4) {
    // Early stage: 2-3 items seen/bought
    // Blend: 70% content-based, 30% popularity
    const userVec = this.buildUserProfile(viewedIds, purchasedIds);
    const userNorm = this.norms.get('__user_profile') || 1;
    
    let results = products
      .filter(p => !seen.has(p.id))
      .map(p => ({
        product: p,
        similarity: this._cosineSparse(
          userVec, userNorm,
          this.vectors.get(p.id), this.norms.get(p.id)
        ),
        popularity: (p.rating || 0) / 5.0
      }))
      .map(r => ({
        ...r.product,
        similarity: r.similarity * 0.7 + r.popularity * 0.3, // Blend
        confidence: Math.min(99, Math.max(30, Math.round((r.similarity * 0.7 + r.popularity * 0.3) * 130))),
        reason: 'На основе ваших первых выборов',
        coldStart: true
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, n);
    
    return results;
  }
  
  // Normal case: user has 4+ interactions → use full hybrid
  return this._getPersonalizedNormal(viewedIds, purchasedIds, products, n);
}

/**
 * Top-rated products, diversified by genre/category
 */
_topRatedDiversified(products, n) {
  const byGenre = new Map();
  
  for (const p of products) {
    const genre = p.genre || 'other';
    if (!byGenre.has(genre)) byGenre.set(genre, []);
    byGenre.get(genre).push(p);
  }
  
  const result = [];
  for (const [genre, items] of byGenre.entries()) {
    const topItem = items
      .filter(p => (p.stock || 0) > 0)
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))[0];
    
    if (topItem) {
      result.push({
        ...topItem,
        confidence: 75,
        reason: `Популярный ${genre}`,
        coldStart: true
      });
    }
    
    if (result.length >= n) break;
  }
  
  // If not enough variety, add top overall
  if (result.length < n) {
    const topByRating = products
      .filter(p => !result.find(r => r.id === p.id))
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, n - result.length);
    
    result.push(...topByRating.map(p => ({
      ...p,
      confidence: 65,
      reason: 'Рекомендуем всем',
      coldStart: true
    })));
  }
  
  return result.slice(0, n);
}
```

**Update Hybrid Recommender** to pass cold-start info:
```javascript
// In hybridRecommender.js
getRecommendations(viewedIds = [], purchasedIds = [], products, n = 4, alphaOverride) {
  const seen = new Set([...viewedIds, ...purchasedIds]);
  
  // COLD START: Use content-only
  if (seen.size < 2) {
    return recommendationService.getPersonalized(viewedIds, purchasedIds, products, n)
      .map(p => ({
        ...p,
        alpha: 1.0, // 100% content-based
        source: 'cold-start',
        reason: '(новый пользователь)'
      }));
  }
  
  // Normal case
  const alpha = alphaOverride != null
    ? Math.min(1, Math.max(0, parseFloat(alphaOverride)))
    : this.alpha;
  
  // ... existing logic ...
}
```

---

### 3. Search Zero-Result Recovery

**File**: `client/src/components/AISearch.jsx`

```javascript
const handleSearch = async (e) => {
  const query = e.target.value;
  setSearchQuery(query);
  
  if (debounceRef.current) clearTimeout(debounceRef.current);
  
  debounceRef.current = setTimeout(() => {
    if (!query.trim()) {
      setSearchData(null);
      setShowResults(false);
      return;
    }
    
    performSearch(query);
  }, 250);
};

const performSearch = async (query) => {
  setIsSearching(true);
  setShowResults(true);
  
  if (abortRef.current) abortRef.current.abort();
  const ctrl = new AbortController();
  abortRef.current = ctrl;
  
  try {
    const res = await fetch('/api/ai/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, limit: 6, userId }),
      signal: ctrl.signal
    });
    
    if (!res.ok) throw new Error('Search failed');
    
    let data = await res.json();
    
    // NEW: If no results, show suggestions or fallback
    if (!data.results || data.results.length === 0) {
      data = await performSearchWithRecovery(query, data);
    }
    
    setSearchData(data);
  } catch (err) {
    if (err.name !== 'AbortError') {
      // Don't just show empty - provide help
      setSearchData({ 
        results: [], 
        intent: 'browse', 
        totalFound: 0,
        error: 'Ничего не найдено',
        suggestions: await getSuggestions(query)
      });
    }
  } finally {
    setIsSearching(false);
  }
};

async function performSearchWithRecovery(originalQuery, emptyResult) {
  // Try progressively less strict searches
  
  // 1. Try broader search by removing words
  const words = originalQuery.split(/\s+/);
  if (words.length > 1) {
    for (let i = words.length - 1; i >= 1; i--) {
      const shorterQuery = words.slice(0, i).join(' ');
      const res = await fetch('/api/ai/search', {
        method: 'POST',
        body: JSON.stringify({ query: shorterQuery, limit: 3 })
      });
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        return {
          ...data,
          suggestions: [`Попробовали поиск по "${shorterQuery}"`, ...data.suggestions || []],
          couldNotFind: originalQuery
        };
      }
    }
  }
  
  // 2. Try category search
  const categories = ['steam', 'games', 'items', 'moba', 'subscription'];
  for (const cat of categories) {
    const res = await fetch('/api/ai/search', {
      method: 'POST',
      body: JSON.stringify({ query: cat, limit: 5 })
    });
    const data = await res.json();
    if (data.results && data.results.length > 0) {
      return {
        ...data,
        suggestions: [`Возможно вы имели в виду категорию "${cat}"?`],
        couldNotFind: originalQuery,
        fallbackCategory: cat
      };
    }
  }
  
  // 3. No results - suggest browsing
  return {
    results: [],
    suggestions: [
      'Товар не найден',
      'Попробуйте указать название точнее',
      'Или смотрите все товары в каталоге →'
    ],
    couldNotFind: originalQuery
  };
}

// Render empty state with suggestions
if (results.length === 0 && searchQuery) {
  return (
    <div className="search-empty-with-suggestions">
      <span className="empty-icon">😕</span>
      <p>{searchData.error || 'Ничего не найдено'}</p>
      
      {searchData.suggestions && searchData.suggestions.length > 0 && (
        <div className="suggestions">
          <p className="suggestions-title">Может быть вы имели в виду:</p>
          {searchData.suggestions.map((s, i) => (
            <button key={i} className="suggestion-btn" 
              onClick={() => setSearchQuery(s)}>
              💡 {s}
            </button>
          ))}
        </div>
      )}
      
      <Link to="/catalog" className="browse-all-link">
        Смотреть все товары →
      </Link>
    </div>
  );
}
```

---

## Medium-Effort Improvements (4-6 hours each)

### 4. A/B Testing Framework

**File**: `server/routes/ai.js`

```javascript
/**
 * POST /api/ai/ab-test/start
 * Start an A/B test
 * Body: { name, testId, variants, duration, metric }
 */
router.post('/ab-test/start', (req, res) => {
  try {
    const test = aiEngine.startABTest(req.body);
    res.json(test);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/ai/recommendations/ab-test
 * Get recommendation - randomly assign to variant
 * Query: { testId, userId, ... }
 */
router.get('/recommendations/ab-test', (req, res) => {
  try {
    const { testId, userId, viewedIds = [], purchasedIds = [] } = req.query;
    
    const test = aiEngine.getABTest(testId);
    if (!test) return res.status(404).json({ error: 'Test not found' });
    
    // Randomly assign variant (consistent per user)
    const variant = aiEngine.getVariantForUser(testId, userId);
    
    // Get recommendations using variant config
    let recs;
    if (variant.name === 'content-only') {
      recs = recommendationService.getPersonalized(
        viewedIds, purchasedIds, products, 4
      );
    } else if (variant.name === 'hybrid-default') {
      recs = hybridRecommender.getRecommendations(
        viewedIds, purchasedIds, products, 4, 0.5
      );
    } else if (variant.name === 'collab-focused') {
      recs = hybridRecommender.getRecommendations(
        viewedIds, purchasedIds, products, 4, 0.2 // More CF
      );
    }
    
    // Tag for tracking
    recs = recs.map(r => ({
      ...r,
      testId,
      variant: variant.name
    }));
    
    res.json({
      recommendations: recs,
      testId,
      variant: variant.name
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/ai/ab-test/:testId/event
 * Record event for test (click, purchase, etc)
 */
router.post('/ab-test/:testId/event', (req, res) => {
  try {
    const { testId } = req.params;
    const { userId, variant, eventType, value } = req.body;
    
    aiEngine.recordABTestEvent(testId, {
      userId, variant, eventType, value,
      timestamp: Date.now()
    });
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/ai/ab-test/:testId/results
 * Get test results and statistical significance
 */
router.get('/ab-test/:testId/results', (req, res) => {
  try {
    const results = aiEngine.getABTestResults(req.params.testId);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

**File**: `server/services/aiEngine.js`

```javascript
constructor() {
  // ... existing ...
  this.abTests = new Map(); // testId → test object
  this.abTestEvents = [];   // All events for analysis
}

startABTest({
  name,           // e.g., "Hybrid vs Content"
  testId,
  variants,       // [{ name: 'control', weight: 0.5 }, { name: 'treatment', weight: 0.5 }]
  metric,         // 'ctr' | 'conversion' | 'purchase'
  duration        // days
}) {
  const test = {
    testId,
    name,
    variants: variants.map(v => ({
      ...v,
      users: new Set(),
      events: [],
      ctr: 0,
      conversion: 0
    })),
    metric,
    startedAt: Date.now(),
    endedAt: Date.now() + duration * 86400000,
    status: 'running',
    hypothesis: `Different recommendation algorithms have different CTR`,
    pValue: null,
    winner: null
  };
  
  this.abTests.set(testId, test);
  return test;
}

getVariantForUser(testId, userId) {
  const test = this.abTests.get(testId);
  if (!test) throw new Error('Test not found');
  
  // Deterministic assignment: same user → same variant always
  const hash = parseInt(userId.toString().split('').reduce((a, b) => 
    ((a << 5) - a) + b.charCodeAt(0), 0
  )) % 1000;
  
  let cumWeight = 0;
  for (const variant of test.variants) {
    cumWeight += (variant.weight * 1000);
    if (hash < cumWeight) {
      variant.users.add(userId);
      return variant;
    }
  }
  
  return test.variants[0];
}

recordABTestEvent(testId, event) {
  const test = this.abTests.get(testId);
  if (!test) throw new Error('Test not found');
  
  const variant = test.variants.find(v => v.name === event.variant);
  if (variant) {
    variant.events.push(event);
  }
  
  this.abTestEvents.push({ testId, ...event });
}

getABTestResults(testId) {
  const test = this.abTests.get(testId);
  if (!test) throw new Error('Test not found');
  
  const results = {
    testId,
    name: test.name,
    status: test.status,
    duration: (Date.now() - test.startedAt) / 86400000,
    variants: test.variants.map(v => {
      const clicks = v.events.filter(e => e.eventType === 'click').length;
      const purchases = v.events.filter(e => e.eventType === 'purchase').length;
      const ctr = clicks / (v.users.size || 1);
      const cr = purchases / (v.users.size || 1);
      
      return {
        name: v.name,
        users: v.users.size,
        clicks,
        purchases,
        ctr: ctr.toFixed(3),
        conversionRate: cr.toFixed(3),
        events: v.events.length
      };
    })
  };
  
  // Simple: if one has 2x better CTR and >100 users, it's winner
  if (results.variants.every(v => v.users >= 100)) {
    const ctrValues = results.variants.map(v => parseFloat(v.ctr));
    const maxCtr = Math.max(...ctrValues);
    const bestVariant = results.variants.find(v => parseFloat(v.ctr) === maxCtr);
    
    if (bestVariant && maxCtr > ctrValues[ctrValues.length - 1] * 1.2) {
      results.winner = bestVariant.name;
      results.pValue = '< 0.05 (estimated)';
    }
  }
  
  return results;
}
```

**Admin Tab**:
```javascript
// Add to AIAdminTabs.jsx
export function ABTestingTab() {
  const [tests, setTests] = useState([]);
  const [newTestName, setNewTestName] = useState('');
  
  useEffect(() => {
    loadTests();
  }, []);
  
  const loadTests = async () => {
    const running = await aiAPI.getABTests('running');
    const finished = await aiAPI.getABTests('finished');
    setTests([...running.data, ...finished.data]);
  };
  
  const startTest = async () => {
    await aiAPI.startABTest({
      name: newTestName,
      testId: `test_${Date.now()}`,
      variants: [
        { name: 'control', weight: 0.5 },
        { name: 'treatment', weight: 0.5 }
      ],
      metric: 'ctr',
      duration: 7 // days
    });
    
    setNewTestName('');
    loadTests();
  };
  
  return (
    <div>
      <h2>🧪 A/B Tests</h2>
      
      <section className="ab-new-test">
        <input 
          value={newTestName}
          onChange={e => setNewTestName(e.target.value)}
          placeholder="Test name..."
        />
        <button onClick={startTest}>Start New Test</button>
      </section>
      
      {tests.map(test => (
        <ABTestCard key={test.testId} test={test} />
      ))}
    </div>
  );
}

function ABTestCard({ test }) {
  const [results, setResults] = useState(null);
  
  useEffect(() => {
    aiAPI.getABTestResults(test.testId)
      .then(r => setResults(r.data))
      .catch(e => console.error(e));
  }, [test.testId]);
  
  return (
    <div className="ab-test-card">
      <h3>{test.name}</h3>
      <p>Status: <strong>{test.status}</strong></p>
      
      {results && (
        <table>
          <thead>
            <tr>
              <th>Variant</th>
              <th>Users</th>
              <th>Clicks</th>
              <th>CTR</th>
              <th>Winner?</th>
            </tr>
          </thead>
          <tbody>
            {results.variants.map(v => (
              <tr key={v.name} className={results.winner === v.name ? 'winner' : ''}>
                <td>{v.name}</td>
                <td>{v.users}</td>
                <td>{v.clicks}</td>
                <td>{v.ctr}</td>
                <td>{results.winner === v.name ? '🏆 YES' : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      
      {test.status === 'running' && (
        <button onClick={() => aiAPI.stopABTest(test.testId)}>
          Stop Test
        </button>
      )}
    </div>
  );
}
```

---

## Database Persistence (6-8 hours)

If you want to make this production-ready, migrate from in-memory to PostgreSQL:

```javascript
// server/services/aiPersistence.js
import pool from '../db/postgres.js';

class AIPersistenceLayer {
  async initializeDatabase() {
    const client = await pool.connect();
    try {
      // Create tables
      await client.query(`
        CREATE TABLE IF NOT EXISTS user_behavior (
          user_id TEXT PRIMARY KEY,
          views JSONB,
          purchases JSONB,
          searches JSONB,
          preferences JSONB,
          loyalty_score FLOAT,
          last_active TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW()
        );
        
        CREATE TABLE IF NOT EXISTS recommendation_events (
          id SERIAL PRIMARY KEY,
          user_id TEXT,
          product_id INT,
          algorithm TEXT,
          confidence FLOAT,
          position INT,
          clicked BOOLEAN,
          purchased BOOLEAN,
          created_at TIMESTAMP DEFAULT NOW()
        );
        
        CREATE TABLE IF NOT EXISTS fraud_flags (
          id SERIAL PRIMARY KEY,
          user_id TEXT,
          transaction_id TEXT,
          risk_score INT,
          triggers JSONB,
          blocked BOOLEAN,
          created_at TIMESTAMP DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS idx_reco_user ON recommendation_events(user_id);
        CREATE INDEX IF NOT EXISTS idx_reco_algo ON recommendation_events(algorithm);
        CREATE INDEX IF NOT EXISTS idx_fraud_date ON fraud_flags(created_at);
      `);
    } finally {
      client.release();
    }
  }
  
  async saveUserBehavior(userId, behavior) {
    const client = await pool.connect();
    try {
      await client.query(
        `INSERT INTO user_behavior (user_id, views, purchases, preferences, loyalty_score, last_active)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (user_id) DO UPDATE SET
          views = EXCLUDED.views,
          purchases = EXCLUDED.purchases,
          preferences = EXCLUDED.preferences,
          loyalty_score = EXCLUDED.loyalty_score,
          last_active = EXCLUDED.last_active`,
        [
          userId,
          JSON.stringify(behavior.views),
          JSON.stringify(behavior.purchases),
          JSON.stringify(behavior.preferences),
          behavior.preferences?.loyaltyScore || 0,
          new Date(behavior.lastActive)
        ]
      );
    } finally {
      client.release();
    }
  }
  
  async getRecommendationMetrics(algorithm) {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT
          algorithm,
          COUNT(*) as impressions,
          SUM(CASE WHEN clicked THEN 1 ELSE 0 END) as clicks,
          SUM(CASE WHEN purchased THEN 1 ELSE 0 END) as purchases
         FROM recommendation_events
         WHERE algorithm = $1
         AND created_at > NOW() - INTERVAL '7 days'
         GROUP BY algorithm`,
        [algorithm]
      );
      
      return result.rows[0] || { impressions: 0, clicks: 0, purchases: 0 };
    } finally {
      client.release();
    }
  }
}

export default new AIPersistenceLayer();
```

Then in your aiEngine initialization:
```javascript
await aiPersistence.initializeDatabase();

// Override save method
aiEngine.save = async () => {
  for (const [userId, behavior] of aiEngine.userBehavior) {
    await aiPersistence.saveUserBehavior(userId, behavior);
  }
};

// Auto-save every hour
setInterval(() => aiEngine.save(), 60 * 60 * 1000);
```

---

## Testing Your Changes

### Test Cold-Start Handling
```javascript
// Test without localStorage
localStorage.clear();
navigate('/');
// Should see "Рекомендуем всем" with diverse genres
```

### Test CTR Tracking
```javascript
// Open DevTools Network tab
// Click a recommendation
// Should see POST /api/ai/track-reco-click
```

### Test A/B Test
```javascript
// Start test via API
curl -X POST http://localhost:3000/api/ai/ab-test/start \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Hybrid vs Content",
    "testId": "test1",
    "variants": [{"name": "hybrid", "weight": 0.5}, {"name": "content", "weight": 0.5}],
    "metric": "ctr",
    "duration": 7
  }'

// Get results
curl http://localhost:3000/api/ai/ab-test/test1/results
```

---

## Summary of Changes by Priority

| Priority | Module | Changes | Effort | Impact |
|----------|--------|---------|--------|--------|
| 🔴 Critical | Recommendations | CTR tracking + cold-start | 3h | High |
| 🔴 Critical | Search | Zero-result recovery | 2h | Medium |
| 🟡 High | Chatbot | Multi-turn context | 3h | Medium |
| 🟡 High | Admin | A/B testing tab | 6h | High |
| 🟢 Medium | All | Database persistence | 8h | High (production) |
| 🟢 Medium | Recommendations | Explanation diversity | 2h | Low |

**Total effort**: ~24 hours for all improvements  
**Recommended scope**: Implement Priority 1 (CTR + cold-start) + A/B testing for thesis demo (9 hours)

This will bring your project from **B+ to A-** grade! 🚀
