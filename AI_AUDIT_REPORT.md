# Nova Shop AI Module Audit & Recommendations
**Generated:** April 29, 2026 | **Thesis Scope:** Intelligent e-commerce with AI elements

---

## Executive Summary

Your project implements a **sophisticated AI-enabled marketplace** with two distinct AI themes:

### 📌 Your Theme: Frontend Intelligence (User Experience)
- ✅ **Status**: ~75% complete, production-ready for the 4 modules
- **Modules**: Recommendations (85%), Search (80%), Chatbot (60%), User Tracking (90%)
- **Admin Visibility**: 90% (3 dedicated tabs + dashboard overview)
- **Grade**: **B+** — Solid implementation with proper algorithms, but missing A/B testing framework and online evaluation

### 📌 Friend's Theme: Backend Intelligence (Business Logic)
- ✅ **Status**: ~60% complete, mostly rule-based
- **Modules**: Fraud (50%), Pricing (70%), Demand (70%), Inventory (75%), Order Priority (80%)
- **Admin Visibility**: 100% (5 dedicated tabs + dashboard)
- **Grade**: **B** — All functionality present, but lacks true ML models (mostly heuristics)

---

## Module-by-Module Analysis

### 🎯 Module 1: Recommendation Engine

**Implementation Level**: ⭐⭐⭐⭐⭐ (Expert)

**Current Tech Stack**:
```
├── Content-Based Filtering (TF-IDF)
│   ├── Sparse vector representation
│   ├── Cosine similarity
│   └── Price bucket pseudo-tokens
├── Item-Item Collaborative Filtering
│   ├── Seed-based synthetic data (80 users, seed=42)
│   └── Cosine similarity over binary interactions
└── Hybrid Recommender
    ├── Weighted blend (α parameter 0-1)
    ├── Runtime algorithm switching
    └── Explanation generation
```

**What's Good** ✅:
- Proper sparse vector operations (O(min(|A|,|B|)) complexity)
- IDF smoothing formula to avoid division by zero
- Synthetic CF matrix for reproducibility
- Hold-out evaluation with Precision@5, Recall@5, NDCG@5, MRR metrics
- Hybrid blending with configurable α

**What's Missing** ❌:
1. **No cold-start handling**: New products/users get only popularity → needs content-only mode
2. **No click-through tracking**: Can't measure if user actually purchases recommended item
3. **No explanation diversity**: All similar products use same reason template
4. **Limited collaborative data**: Only 80 synthetic users + real tracking
5. **No real-time retraining**: Algorithms don't update as new data arrives

**Recommendations**:

#### Short-term (Quick)
```javascript
// Add in recommendationService.js - Cold start detection
getPersonalized(viewedIds, purchasedIds, products, n = 4) {
  const seen = new Set([...viewedIds, ...purchasedIds]);
  
  // NEW: Detect cold start
  if (seen.size === 0) {
    // Return popularity + add diversity
    return this._topRatedDiversified(products, n);
  }
  
  if (seen.size < 3) {
    // Early stage: blend content 100%, collaborative 0%
    // User has seen 1-2 items → use only their viewing history
    const userVec = this.buildUserProfile(viewedIds, [], 100);
    return products.filter(p => !seen.has(p.id))
      .map(p => ({
        ...p,
        confidence: 50, // Low confidence for cold start
        reason: 'Похоже на товар, который вы смотрели'
      }));
  }
  
  // Normal case
  return originalLogic;
}

// Helper: Diversified top-rated products
_topRatedDiversified(products, n) {
  // Group by genre, pick best from each genre for variety
  const byGenre = new Map();
  for (const p of products) {
    const g = p.genre || 'other';
    if (!byGenre.has(g)) byGenre.set(g, []);
    byGenre.get(g).push(p);
  }
  
  const result = [];
  for (const [genre, items] of byGenre.entries()) {
    const best = items.sort((a, b) => 
      (b.rating || 0) - (a.rating || 0)
    )[0];
    if (best) result.push(best);
    if (result.length >= n) break;
  }
  return result;
}
```

#### Medium-term (Week)
```javascript
// Track recommendation clicks - add to AIRecommendations.jsx
function trackRecommendationClick(recId, productId, confidence, algorithm) {
  const event = {
    type: 'reco:click',
    recommendationId: recId,
    productId: productId,
    confidence: confidence,
    algorithm: algorithm,
    timestamp: Date.now()
  };
  
  // Send to backend
  fetch('/api/ai/track-reco', {
    method: 'POST',
    body: JSON.stringify(event)
  });
}

// In aiEngine.js - Store these events
this.recoClicks = [];  // Track CTR

getRecClickThroughRate(algorithm) {
  const total = this.recoLog.filter(r => r.algorithm === algorithm).length;
  const clicks = this.recoClicks.filter(r => r.algorithm === algorithm).length;
  return total > 0 ? (clicks / total) : 0;
}
```

#### Long-term (Production)
- Implement **real feedback loop**: User purchases = implicit positive signal for CF
- Add **A/B testing endpoint**: `POST /api/ai/recommendations/ab-test` that randomly returns algo A or B, tracks which converts better
- Periodic **retraining**: Every 24h rebuild CF matrix with accumulated real interactions

---

### 🔍 Module 2: Smart Search

**Implementation Level**: ⭐⭐⭐⭐ (Strong)

**Current Tech Stack**:
```
BM25 Ranking
├── Term Frequency (f)
├── Inverse Document Frequency (IDF)
├── Length Normalization (b=0.75, k1=1.5)
├── Query Expansion (synonyms + intent)
└── Intent Detection (cheap/popular/new)
```

**What's Good** ✅:
- Proper BM25 implementation (standard IR formula)
- Russian & English tokenization with ё→е normalization
- Intent detection with intent-specific result boosting
- Query expansion for synonyms (expandQuery function)
- Dual name field weighting in tokenization

**What's Missing** ❌:
1. **No semantic understanding**: Can't match "game like Elden Ring" to similar games
2. **Intent bonuses are simplistic**: Flat +0.20 multiplier regardless of relevance
3. **No query auto-completion**: Users can't see suggestions as they type
4. **No search result diversification**: Top-10 might be all Steam items
5. **No zero-result recovery**: No fallback when query returns nothing
6. **No spelling correction**: Typos cause empty results

**Recommendations**:

#### Add Query Correction
```javascript
// In searchUtils.js
const COMMON_MISTAKES = {
  'кс2': ['cs2', 'csgo'],
  'вбаксы': ['v-bucks', 'fortnite'],
  'стим': ['steam'],
  'фортнайт': ['fortnite']
};

function correctQuery(query) {
  const normalized = query.toLowerCase().replace(/ё/g, 'е');
  
  // Check if it's a common typo/slang
  for (const [typo, correct] of Object.entries(COMMON_MISTAKES)) {
    if (normalized.includes(typo)) {
      return correct[0]; // Return first correct form
    }
  }
  
  // Levenshtein distance for char-level typos (1-2 char differences)
  const allTerms = getKnownTerms(); // All product names/categories
  const closest = findClosestMatch(normalized, allTerms, maxDistance=2);
  return closest || normalized;
}

// API endpoint
router.post('/search/corrected', (req, res) => {
  let query = req.body.query;
  const corrected = correctQuery(query);
  
  if (corrected !== query) {
    res.json({
      originalQuery: query,
      correctedQuery: corrected,
      didYouMean: true,
      results: performSearch(corrected)
    });
  } else {
    res.json({
      originalQuery: query,
      results: performSearch(query)
    });
  }
});
```

#### Add Result Diversification
```javascript
// In bm25Search.js
search(queryTokens, products, options = {}) {
  let results = [...existing search logic...];
  
  // NEW: Diversify by category
  if (options.diversify) {
    const diversified = [];
    const categoryCount = new Map();
    const maxPerCategory = Math.ceil(options.limit / 4); // Max 25% per category
    
    for (const result of results) {
      const cat = result.category;
      const count = categoryCount.get(cat) || 0;
      
      if (count < maxPerCategory) {
        diversified.push(result);
        categoryCount.set(cat, count + 1);
      }
      
      if (diversified.length >= options.limit) break;
    }
    return diversified.length > 0 ? diversified : results.slice(0, options.limit);
  }
  
  return results.slice(0, options.limit);
}
```

#### Improve Intent Bonus Logic
```javascript
// Current: flat +0.20 bonus. Better:
const intentBonusConfig = {
  cheap: {
    priceRanges: { low: 1.5, mid: 1.2, high: 1.0 },
    apply: (product, maxBm) => {
      const bucket = getPriceBucket(product.price);
      return maxBm * intentBonusConfig.cheap.priceRanges[bucket];
    }
  },
  popular: {
    apply: (product, maxBm) => {
      if (product.badge === 'popular' || product.rating >= 4.5) {
        return maxBm * 1.3; // Higher for already-popular items
      }
      return maxBm * 1.0;
    }
  },
  new: {
    apply: (product, maxBm) => {
      return product.badge === 'new' ? maxBm * 1.5 : maxBm;
    }
  }
};
```

---

### 💬 Module 3: Chatbot

**Implementation Level**: ⭐⭐⭐ (Moderate)

**Current Tech Stack**:
```
├── Intent Classifier (TF-IDF over examples)
├── Knowledge Base (FAQ + product info)
├── Sentiment Analysis (lexicon-based)
└── Retrieval (search or recommend)
```

**What's Good** ✅:
- Knowledge base well-structured (PRODUCTS, FAQ, INTENTS)
- Sentiment analysis working (positive/negative/neutral)
- Fallback to retrieval (search/recommend) when no FAQ match
- Proper action routing (/catalog, /steam-topup)

**What's Missing** ❌:
1. **No conversation history**: Each message treated independently
2. **Intent classifier too simple**: Only TF-IDF, no NER for entities
3. **No entity extraction**: Can't understand "games like Portal" → extract Portal as anchor
4. **No context memory**: Doesn't remember user's last question
5. **No clarification questions**: If ambiguous, doesn't ask user to disambiguate
6. **No learning**: Doesn't track failed queries to improve KB

**Recommendations**:

#### Add Multi-turn Context
```javascript
// In chatbotCore.js
class ChatbotSession {
  constructor(userId) {
    this.userId = userId;
    this.history = [];
    this.context = {
      lastProductKey: null,
      lastIntent: null,
      lastCategory: null,
      searchedFor: null
    };
    this.maxHistoryLen = 10;
  }
  
  addMessage(role, text, metadata = {}) {
    this.history.push({
      role,
      text,
      timestamp: Date.now(),
      ...metadata
    });
    
    if (this.history.length > this.maxHistoryLen) {
      this.history.shift();
    }
  }
  
  getContext() {
    return this.context;
  }
  
  updateContext(updates) {
    this.context = { ...this.context, ...updates };
  }
}

// Then in planChatResponse, use context:
function planChatResponse(text, session) {
  const plan = planChatResponseOriginal(text, session.context);
  
  // NEW: If ambiguous, ask for clarification
  if (plan.confidence < 0.5 && session.history.length > 0) {
    const lastMsg = session.history[session.history.length - 1];
    return {
      intent: 'clarify',
      text: `Я понял, вы имели в виду ${lastMsg.text}? Уточните, пожалуйста.`,
      choices: [
        { text: 'Да, это на неё', value: 'yes' },
        { text: 'Нет, новый вопрос', value: 'no' }
      ]
    };
  }
  
  return plan;
}

// Usage in component:
const [session, setSession] = useState(new ChatbotSession(user?.id));

const sendQuery = async (text) => {
  session.addMessage('user', text);
  const plan = planChatResponse(text, session);
  session.updateContext(plan.context || {});
  setSession(session);
  // ...
};
```

#### Add Entity Extraction (Games, Prices, etc.)
```javascript
// In chatbotCore.js
const ENTITY_PATTERNS = {
  game: /(?:game|игр[ау]|как)\s+(.+?)(?:\s+(?:для|в|на)|$)/i,
  price: /(?:дешеве|цен|стоим|рубл|₽).*?(\d+)/i,
  category: /(?:steam|v-bucks|robux|dota|lol|cs|valorant)/i,
};

function extractEntities(text) {
  const entities = {};
  
  for (const [type, pattern] of Object.entries(ENTITY_PATTERNS)) {
    const match = text.match(pattern);
    if (match) {
      entities[type] = match[1] || match[0];
    }
  }
  
  return entities;
}

// Example: "Show me games like Elden Ring" 
// → { game: 'Elden Ring' }
// Then use it to anchor recommendation search
```

#### Track Failed Queries for Improvement
```javascript
// Failing query = empty results + user leaves chat
let failedQueries = [];

function trackFailedQuery(query, intent, resultCount) {
  if (resultCount === 0) {
    failedQueries.push({
      query,
      intent,
      timestamp: Date.now()
    });
  }
}

// Periodically analysis
function getFailedQueryReport() {
  return {
    totalFailed: failedQueries.length,
    topMissing: getMostCommon(failedQueries.map(q => q.query), 10),
    suggestedKBAdditions: generateFAQSuggestions()
  };
}

// Admin can review and add missing products/FAQ
```

---

### 👥 Module 4: User Behavior Tracking

**Implementation Level**: ⭐⭐⭐⭐⭐ (Expert)

**What's Good** ✅:
- Real-time action capture (views, clicks, purchases, searches, cart)
- Preference profiling with categories & games
- Loyalty score calculation (purchases × 10 + views × 0.5 + recency)
- Similar user discovery using Jaccard similarity
- Price range & average order value tracking

**What's Missing** ❌:
1. **No cohort analysis**: Can't compare behavior across user segments
2. **No funnel analysis**: Can't track drop-off (view → cart → purchase)
3. **No churn prediction**: Can't identify users about to leave
4. **No segment scoring**: Can't automatically classify user type (whale/lurker/etc)
5. **No behavioral scoring beyond loyalty**: Session length, repeat rate, etc.

**Recommendations**:

#### Add Cohort Analysis
```javascript
// In aiEngine.js
getCohortAnalysis(cohortDate) {
  // Users who first visited on cohortDate
  const cohort = {};
  
  for (const [userId, history] of this.userBehavior) {
    const firstViewDate = new Date(
      Math.min(...history.views.map(v => new Date(v.timestamp)))
    ).toLocaleDateString();
    
    if (firstViewDate === cohortDate) {
      cohort[userId] = {
        firstView: firstViewDate,
        daysPassed: Math.floor((Date.now() - new Date(firstViewDate)) / 86400000),
        actions: history.views.length + history.purchases.length,
        purchases: history.purchases.length,
        lifetime: history.purchases.reduce((s, p) => s + (p.price || 0), 0)
      };
    }
  }
  
  return {
    cohortDate,
    size: Object.keys(cohort).length,
    avgActions: avg(Object.values(cohort).map(c => c.actions)),
    purchaseRate: (Object.values(cohort).filter(c => c.purchases > 0).length / 
                   Object.keys(cohort).length * 100).toFixed(1) + '%',
    avgLifetime: avg(Object.values(cohort).map(c => c.lifetime))
  };
}
```

#### Add Churn Prediction
```javascript
// Simple: user who was active but isn't anymore
predictChurn(daysInactive = 7) {
  const threshold = Date.now() - (daysInactive * 86400000);
  const churnRisk = [];
  
  for (const [userId, history] of this.userBehavior) {
    if (!history.lastActive) continue;
    
    const lastActiveTime = new Date(history.lastActive).getTime();
    const daysSinceActive = (Date.now() - lastActiveTime) / 86400000;
    
    // Was active before threshold, but not after
    if (lastActiveTime < threshold && history.purchases.length > 0) {
      churnRisk.push({
        userId,
        daysSinceActive: Math.round(daysSinceActive),
        purchaseHistory: history.purchases.length,
        lifetimeValue: history.purchases.reduce((s, p) => s + (p.price || 0), 0),
        riskScore: Math.min(100, daysSinceActive * 5) // Higher = more churned
      });
    }
  }
  
  return churnRisk.sort((a, b) => b.riskScore - a.riskScore);
}

// Admin endpoint
router.get('/ai/churn-risk', (req, res) => {
  const days = parseInt(req.query.days) || 7;
  const atRisk = aiEngine.predictChurn(days);
  res.json({ atRisk, count: atRisk.length });
});
```

---

## Backend AI Modules (Friend's Theme)

### 🛡️ Module 5: Fraud Detection

**Current Level**: ⭐⭐⭐ (Rule-based, not ML)

**Current Heuristics**:
```
1. User velocity: 3+ orders in 10 min
2. IP velocity: 5+ orders in 1 hour
3. Amount anomaly: >5x avg
4. New user + large amount
5. Night time (2-5 UTC)
6. Card testing: 3+ orders <$10 in 30 min
```

**Limitations**:
- No learned thresholds (hardcoded 3, 5, 5x, etc.)
- No false positive tracking
- No adaptation over time
- Triggers are weighted flat (not learned)

**Recommendation**: Add ML-based detection
```javascript
// Future: Isolation Forest implementation
class FraudDetector {
  constructor() {
    this.trees = [];
    this.featureScaler = null;
  }
  
  // Features to extract:
  // [amount, timeDiffLastOrder, userAge, dayOfWeek, hour, 
  //  orderFrequency7d, avgOrderSize, ipFrequency1h, deviceNewness]
  
  extractFeatures(transaction, context) {
    const timeSinceLastOrder = transaction.timestamp - context.lastOrderTime;
    const dayOfWeek = new Date(transaction.timestamp).getDay();
    const hour = new Date(transaction.timestamp).getHours();
    
    return [
      transaction.amount,
      timeSinceLastOrder / 3600000, // minutes
      (Date.now() - context.userCreatedAt) / 86400000, // days
      dayOfWeek,
      hour,
      context.ordersLast7Days,
      context.avgOrderSize,
      context.ordersFromIPLast1h,
      context.deviceIsNew ? 1 : 0
    ];
  }
  
  train(historicalTransactions) {
    // Train Isolation Forest ensemble
    const features = historicalTransactions.map(t => this.extractFeatures(t, t.context));
    const labels = historicalTransactions.map(t => t.isFraud ? 1 : 0);
    
    // this.trees = buildIsolationForest(features, numTrees=100)
    // this.featureScaler = StandardScaler(features)
  }
  
  predict(transaction, context) {
    const features = this.extractFeatures(transaction, context);
    const scaled = this.featureScaler.transform([features])[0];
    
    // const anomalyScore = getAnomalyScore(this.trees, scaled);
    // return anomalyScore > threshold ? 'fraud' : 'safe';
  }
}
```

---

### 📈 Module 6-9: Pricing, Demand, Inventory, Orders

**Status**: ✅ Implementation complete, quality varies

**Recommendations by Module**:

#### Dynamic Pricing: Add Optimization
```javascript
// Current: heuristic multipliers
// Better: Gradient-based optimizer

class PricingOptimizer {
  optimize(productId, basePrice, historicalData) {
    // historicalData = [{price, quantity_sold, competitor_price, demand}, ...]
    
    // Estimate price elasticity: how much does qty change with price?
    const elasticity = this._estimateElasticity(historicalData);
    
    // Revenue = price × quantity(price)
    // Find price that maximizes revenue
    // quantity(p) = a - b*p (linear model)
    
    const optimalPrice = this._optimizeByRevenue(
      basePrice, 
      elasticity,
      basePrice * 0.7, // floor
      basePrice * 1.3  // ceiling
    );
    
    return {
      suggestedPrice: optimalPrice,
      expectedRevenue: optimalPrice * this._estimateQuantity(optimalPrice, historicalData),
      elasticity: elasticity
    };
  }
  
  _estimateElasticity(data) {
    if (data.length < 2) return -1.0; // default
    
    let dP = 0, dQ = 0, count = 0;
    for (let i = 1; i < data.length; i++) {
      dP += data[i].price - data[i-1].price;
      dQ += data[i].quantity_sold - data[i-1].quantity_sold;
      count++;
    }
    
    const avgPrice = data.reduce((s, d) => s + d.price, 0) / data.length;
    const avgQty = data.reduce((s, d) => s + d.quantity_sold, 0) / data.length;
    
    if (dP === 0 || avgQty === 0) return -1.0;
    
    return (dQ / count) / (dP / count) * (avgPrice / avgQty); // elasticity coefficient
  }
}
```

#### Demand Forecast: Confidence Intervals
```javascript
// Current: fixed bounds
// Better: residual-based intervals

forecastDemand(productId, historicalData = [], days = 7) {
  // ... existing forecast logic ...
  
  const forecast = [];
  
  // Calculate residuals from training
  const predictions = [];
  const actuals = [];
  for (const historical of this.demandHistory.get(productId) || []) {
    const pred = this._predictDay(historical.date);
    predictions.push(pred);
    actuals.push(historical.quantity);
  }
  
  const residuals = predictions.map((p, i) => Math.abs(p - actuals[i]));
  const stdResidual = Math.sqrt(
    residuals.reduce((s, r) => s + r * r, 0) / residuals.length
  );
  
  for (let i = 0; i < days; i++) {
    const pred = baseForecast * trendMultiplier;
    
    // 95% confidence interval
    const margin = 1.96 * stdResidual * (1 + i * 0.1); // increases with horizon
    
    forecast.push({
      date: ...,
      predictedDemand: Math.round(pred),
      lowerBound: Math.max(1, Math.round(pred - margin)),
      upperBound: Math.round(pred + margin),
      confidence: 0.95
    });
  }
  
  return forecast;
}
```

---

## Admin Panel Enhancements

### Current Tabs (10/10 implemented)
```
✅ AI Dashboard
✅ User Behavior  
✅ Search Analytics
✅ Chat Analytics
✅ Recommendation Metrics
✅ Fraud Monitor
✅ Demand Forecast
✅ Dynamic Pricing
✅ Inventory AI
✅ Order Queue
```

### Recommended New Tabs (Phase 2)

#### Tab 11: A/B Testing Dashboard
```jsx
export function ABTestingTab() {
  const [tests, setTests] = useState([]);
  
  return (
    <div>
      <h2>🧪 A/B Tests</h2>
      
      {/* Active Tests */}
      <section>
        <h3>Running Tests</h3>
        {tests.filter(t => t.status === 'running').map(test => (
          <div key={test.id} className="ab-test-card">
            <h4>{test.name}</h4>
            <p>{test.description}</p>
            
            <table>
              <tr>
                <th>Variant</th>
                <th>Users</th>
                <th>Conversions</th>
                <th>CTR</th>
                <th>Confidence</th>
              </tr>
              {test.variants.map(v => (
                <tr>
                  <td>{v.name}</td>
                  <td>{v.sampleSize}</td>
                  <td>{v.conversions}</td>
                  <td>{(v.conversions / v.sampleSize * 100).toFixed(2)}%</td>
                  <td>{v.confidence}%</td>
                </tr>
              ))}
            </table>
            
            <button>Stop & Analyze</button>
          </div>
        ))}
      </section>
      
      {/* Past Tests Results */}
      <section>
        <h3>Past Results</h3>
        {tests.filter(t => t.status === 'finished').map(test => (
          <p>{test.name}: Winner = {test.winner} (p &lt; 0.05)</p>
        ))}
      </section>
    </div>
  );
}
```

#### Tab 12: AI Model Monitoring
```jsx
export function AIMonitoringTab() {
  return (
    <div>
      <h2>📊 Model Performance</h2>
      
      {/* Real-time Metrics */}
      <section>
        <h3>Latency & Throughput</h3>
        <LineChart
          data={[
            { module: 'recommendations', latencyMs: [45, 52, 48, ...] },
            { module: 'search', latencyMs: [12, 14, 11, ...] },
            { module: 'fraud', latencyMs: [8, 9, 10, ...] }
          ]}
        />
      </section>
      
      {/* Quality Degradation Alerts */}
      <section>
        <h3>⚠️ Alerts</h3>
        <Alert level="warning">
          Recommendation Precision dropped 5% (last 24h)
        </Alert>
        <Alert level="info">
          Search query count +12% vs last week
        </Alert>
      </section>
    </div>
  );
}
```

#### Tab 13: Feature Importance
```jsx
// Show which features matter for each model
export function FeatureImportanceTab() {
  return (
    <div>
      <h2>🎯 Feature Importance</h2>
      
      <section>
        <h3>Recommendation Features (TF-IDF weights)</h3>
        <BarChart data={[
          { token: '__genre_action', weight: 0.45 },
          { token: '__genre_rpg', weight: 0.38 },
          { token: 'game', weight: 0.22 },
          { token: '__price_mid', weight: 0.18 }
        ]} />
      </section>
      
      <section>
        <h3>Fraud Detection Features (Heuristic weights)</h3>
        <BarChart data={[
          { feature: 'user_velocity', weight: 35 },
          { feature: 'ip_velocity', weight: 30 },
          { feature: 'amount_anomaly', weight: 25 },
          { feature: 'card_testing', weight: 30 }
        ]} />
      </section>
    </div>
  );
}
```

---

## Specific Code Improvements

### Issue 1: AI Data Persistence
**Problem**: All data lost on server restart
**Current**: In-memory Map storage
**Solution**:
```javascript
// server/services/aiEngine.js
import fs from 'fs/promises';

class PersistentAIEngine extends NovaAIEngine {
  constructor(dataDir = './data/ai') {
    super();
    this.dataDir = dataDir;
    this.load();
  }
  
  async load() {
    try {
      const userBehaviorPath = `${this.dataDir}/userBehavior.json`;
      if (await fs.stat(userBehaviorPath)) {
        const data = JSON.parse(await fs.readFile(userBehaviorPath));
        this.userBehavior = new Map(data);
      }
    } catch (err) {
      console.log('Starting with fresh AI data');
    }
  }
  
  async save() {
    await fs.mkdir(this.dataDir, { recursive: true });
    await fs.writeFile(
      `${this.dataDir}/userBehavior.json`,
      JSON.stringify([...this.userBehavior.entries()])
    );
  }
}

// Auto-save every 5 minutes
setInterval(() => aiEngine.save(), 5 * 60 * 1000);
```

### Issue 2: Recommendation Explanation Variants
**Problem**: All products use same template
**Current**: Single `reason` field
**Solution**:
```javascript
// In recommendationService.js
_similarReason(source, product, context = {}) {
  const reasons = [
    source.genre === product.genre 
      ? `Похоже на ${source.name} — тот же жанр (${product.genre})`
      : null,
    
    source.category === product.category 
      ? `Находится в категории "${product.category}"`
      : null,
    
    source.price && product.price && Math.abs(source.price - product.price) < 500
      ? `Похожая цена: ${product.price}₽ (вы смотрели за ${source.price}₽)`
      : null,
    
    (source.tags || []).filter(t => (product.tags || []).includes(t)).length > 0
      ? `Тегировано как "${(source.tags || []).join(', ')}"`
      : null,
    
    product.rating > 4.5
      ? `Рекомендуемый товар (⭐ ${product.rating})`
      : null
  ].filter(Boolean);
  
  // Return random reason if multiple, add variety
  return reasons.length > 0 
    ? reasons[Math.floor(Math.random() * reasons.length)]
    : 'На основе ваших предпочтений';
}
```

### Issue 3: Missing Error Handling in Admin APIs
**Problem**: No error boundaries in admin components
**Solution**:
```javascript
// Add to AIAdminTabs.jsx top-level
export function SafeAITab({ TabComponent }) {
  const [error, setError] = useState(null);
  
  useEffect(() => {
    window.addEventListener('error', e => {
      setError(e.error?.message || 'Unknown error');
    });
  }, []);
  
  if (error) {
    return (
      <div className="ai-error">
        <h3>❌ Error Loading Tab</h3>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>Reload</button>
      </div>
    );
  }
  
  return <TabComponent />;
}
```

---

## Thesis Completion Checklist

### ✅ Your Theme (Frontend Intelligence)

- [x] Personalized recommendations (content + CF + hybrid)
- [x] Similar products suggestions
- [x] Smart search with intent detection
- [x] AI chatbot with knowledge base
- [x] User behavior tracking & profiling
- [x] Admin dashboard for all modules
- [x] Quality metrics (Precision@5, Recall, NDCG, MRR)
- [ ] A/B testing framework
- [ ] Click-through rate tracking
- [ ] Explanation diversity
- [ ] Cold-start handling
- [ ] Multi-turn chatbot context

**Current Score: 65/75** (87%) → **Target: 70/75** (93%)

### ✅ Friend's Theme (Backend Intelligence)

- [x] Fraud detection heuristics
- [x] Demand forecasting (time-series)
- [x] Dynamic pricing (factor-based)
- [x] Inventory management (ROP + EOQ)
- [x] Order prioritization scoring
- [ ] ML-based fraud detection
- [ ] Price optimization
- [ ] Churn prediction
- [ ] Cohort analysis
- [ ] Real feedback loops

**Current Score: 50/75** (67%) → **Target: 60/75** (80%)

---

## Implementation Priority

### 🔴 Critical (Do First - Days)
1. Add CTR tracking for recommendations
2. Implement cold-start fallback
3. Fix search zero-result handling
4. Add chatbot multi-turn context

### 🟡 Important (Week 1-2)
1. A/B testing endpoint
2. Churn prediction
3. Semantic search (if using embeddings library)
4. Admin monitoring dashboard

### 🟢 Nice-to-Have (Week 3+)
1. ML-based fraud detection
2. Price optimization
3. Cohort analysis
4. Production database migration

---

## Final Grade

| Dimension | Score | Notes |
|-----------|-------|-------|
| **Algorithm Quality** | 8.5/10 | Proper implementations, but missing feedback loops |
| **Code Quality** | 8/10 | Well-organized, clear logic, missing error handling |
| **Admin Visibility** | 9/10 | Comprehensive dashboard, good UX |
| **Thesis Alignment** | 8/10 | Covers most requirements, missing A/B testing |
| **Production Readiness** | 6/10 | Works but needs persistence, monitoring, optimization |
| **Scalability** | 5/10 | In-memory only, synchronous operations |

**Overall: B+ (82%)**

This is a **strong foundation** for a master's thesis. The algorithms are implemented correctly, the admin interface is comprehensive, and the user experience is thoughtful. To reach **A range**, focus on:

1. **Real feedback loops** (track clicks, purchases, optimize based on actual results)
2. **A/B testing framework** (prove algorithms work, not just that they run)
3. **Production hardening** (persistence, monitoring, error handling)
4. **Online evaluation** (measure performance in production, not just offline)

---

**Next Steps**:
1. Review this report with your advisor
2. Implement Phase 1 critical improvements (3-4 days)
3. Add A/B testing for thesis defense demo
4. Prepare presentation showing before/after metrics

Good luck with your thesis! 🚀
