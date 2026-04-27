/**
 * Evaluation Service
 *
 * Считает offline-метрики качества рекомендательных алгоритмов:
 *   • Precision@k = TP / k
 *   • Recall@k    = TP / |тестовый набор|
 *   • NDCG@k      = DCG@k / IDCG@k, DCG = Σ rel_i / log2(i+1)
 *   • MRR         = средний reciprocal rank первого релевантного элемента
 *
 * Методология (стандартная для recommender systems):
 *   1. Генерируем 30 синтетических пользователей с seed=99 — они НЕ входят
 *      в CF-матрицу (та собрана с seed=42), это гарантирует чистый
 *      held-out-set.
 *   2. Для каждого пользователя случайным образом откладываем 30% его
 *      «купленных» товаров в test, оставшиеся 70% подаём в алгоритм как
 *      историю покупок.
 *   3. Алгоритм ранжирует все товары не из train. Top-K сравниваем с test.
 *   4. Метрики усредняем по пользователям.
 */

import recommendationService from './recommendationService.js';
import collaborativeFilteringService from './collaborativeFilteringService.js';
import hybridRecommender from './hybridRecommender.js';

class EvaluationService {
  _seededRng(seed) {
    let state = (seed | 0) || 1;
    return () => {
      state = (state * 1664525 + 1013904223) | 0;
      return ((state >>> 0) % 1_000_000) / 1_000_000;
    };
  }

  // ── Генерация held-out пользователей (вне CF-матрицы) ───────────────────
  _generateEvalUsers(products, numUsers, seed) {
    const rng = this._seededRng(seed);
    const byGenre = new Map();
    const byCategory = new Map();
    for (const p of products) {
      const g = p.genre || 'misc';
      const c = p.category || 'misc';
      if (!byGenre.has(g)) byGenre.set(g, []);
      if (!byCategory.has(c)) byCategory.set(c, []);
      byGenre.get(g).push(p);
      byCategory.get(c).push(p);
    }
    const genres = [...byGenre.keys()];
    const categories = [...byCategory.keys()];

    const users = [];
    for (let u = 0; u < numUsers; u++) {
      const items = new Set();
      const favGenres = [genres[Math.floor(rng() * genres.length)]];
      if (rng() < 0.4) favGenres.push(genres[Math.floor(rng() * genres.length)]);
      const favCat = categories[Math.floor(rng() * categories.length)];

      const count = 5 + Math.floor(rng() * 6); // 5-10 товаров
      for (let i = 0; i < count; i++) {
        const r = rng();
        let pool;
        if (r < 0.7)      pool = byGenre.get(favGenres[Math.floor(rng() * favGenres.length)]);
        else if (r < 0.9) pool = byCategory.get(favCat);
        else              pool = products;
        if (!pool || !pool.length) continue;
        items.add(pool[Math.floor(rng() * pool.length)].id);
      }
      if (items.size >= 4) users.push([...items]);
    }
    return users;
  }

  _split(items, testRatio, rng) {
    const arr = [...items];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    const testSize = Math.max(1, Math.round(arr.length * testRatio));
    return { train: arr.slice(testSize), test: arr.slice(0, testSize) };
  }

  _score(algo, purchasedIds, products, alpha) {
    if (algo === 'content')       return recommendationService.scoreAll([], purchasedIds, products);
    if (algo === 'collaborative') return collaborativeFilteringService.scoreAll([], purchasedIds, products);
    return hybridRecommender.scoreAll([], purchasedIds, products, alpha);
  }

  _evalOneUser(testItems, scores, k, excludeIds) {
    const ranked = [...scores.entries()]
      .filter(([id]) => !excludeIds.has(id))
      .sort((a, b) => b[1] - a[1])
      .slice(0, k)
      .map(([id]) => id);

    const testSet = new Set(testItems);
    let hits = 0;
    let dcg = 0;
    let firstRank = 0;
    for (let i = 0; i < ranked.length; i++) {
      if (testSet.has(ranked[i])) {
        hits++;
        dcg += 1 / Math.log2(i + 2);
        if (firstRank === 0) firstRank = i + 1;
      }
    }
    const idealHits = Math.min(testSet.size, k);
    let idcg = 0;
    for (let i = 0; i < idealHits; i++) idcg += 1 / Math.log2(i + 2);

    return {
      precision: hits / k,
      recall:    testSet.size ? hits / testSet.size : 0,
      ndcg:      idcg > 0 ? dcg / idcg : 0,
      rr:        firstRank > 0 ? 1 / firstRank : 0
    };
  }

  _avg(arr) {
    if (!arr.length) return 0;
    return parseFloat((arr.reduce((s, x) => s + x, 0) / arr.length).toFixed(4));
  }

  /**
   * Запускает оценку на синтетическом held-out наборе.
   *
   * @param {object} opts
   * @param {string[]} opts.algorithms — ['content', 'collaborative', 'hybrid']
   * @param {number[]} opts.ks         — [3, 5, 10]
   * @param {number}   opts.alpha      — для hybrid (0..1)
   * @param {number}   opts.numUsers   — кол-во held-out пользователей
   * @param {object[]} opts.products
   */
  evaluate({
    algorithms = ['content', 'collaborative', 'hybrid'],
    ks         = [3, 5, 10],
    alpha      = 0.5,
    numUsers   = 30,
    seed       = 99,
    testRatio  = 0.3,
    products
  }) {
    if (!products || !products.length) {
      throw new Error('products is required for evaluation');
    }

    const splitRng = this._seededRng(7);
    const evalUsers = this._generateEvalUsers(products, numUsers, seed);

    const results = {};
    for (const algo of algorithms) {
      const buckets = {};
      for (const k of ks) buckets[k] = { precision: [], recall: [], ndcg: [], rr: [] };

      let usersUsed = 0;
      for (const userItems of evalUsers) {
        const { train, test } = this._split(userItems, testRatio, splitRng);
        if (!train.length || !test.length) continue;
        usersUsed++;

        const trainSet = new Set(train);
        const scores   = this._score(algo, train, products, alpha);

        for (const k of ks) {
          const m = this._evalOneUser(test, scores, k, trainSet);
          buckets[k].precision.push(m.precision);
          buckets[k].recall.push(m.recall);
          buckets[k].ndcg.push(m.ndcg);
          buckets[k].rr.push(m.rr);
        }
      }

      const metrics = {};
      for (const k of ks) {
        metrics[`@${k}`] = {
          precision: this._avg(buckets[k].precision),
          recall:    this._avg(buckets[k].recall),
          ndcg:      this._avg(buckets[k].ndcg),
          mrr:       this._avg(buckets[k].rr)
        };
      }

      results[algo] = { metrics, evaluatedUsers: usersUsed };
    }

    return {
      methodology: {
        description: 'Hold-out 30% random items per user, predict from remaining 70%',
        evalUsersTotal: evalUsers.length,
        seed,
        cfTrainingSeed: 42,
        testRatio,
        ks
      },
      alpha,
      results,
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * Сетка α для гибрида — для построения кривой precision@k(α) на защите.
   */
  evaluateAlphaSweep({ products, ks = [5], alphas, numUsers = 30, seed = 99, testRatio = 0.3 } = {}) {
    const grid = alphas || [0.0, 0.2, 0.4, 0.5, 0.6, 0.8, 1.0];
    const sweep = [];
    for (const a of grid) {
      const r = this.evaluate({
        algorithms: ['hybrid'], ks, alpha: a, numUsers, seed, testRatio, products
      });
      sweep.push({ alpha: a, metrics: r.results.hybrid.metrics });
    }
    return { alphas: grid, ks, sweep, generatedAt: new Date().toISOString() };
  }
}

export default new EvaluationService();
