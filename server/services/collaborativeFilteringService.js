/**
 * Item-Item Collaborative Filtering
 *
 * Алгоритм Sarwar et al. (2001):
 *   sim(i, j) = |U_i ∩ U_j| / sqrt(|U_i| · |U_j|)   — косинус по бинарному
 *                                                     взаимодействию (implicit feedback).
 *
 *   pred(u, i) = Σ_{j ∈ R(u)} sim(i, j) · w_j  /  Σ_{j ∈ R(u)} w_j
 *
 * Поскольку это демо-магазин без реальной матрицы покупок, на старте
 * генерируется синтетический корпус из 80 «пользователей» с детерминированным
 * RNG (seed = 42). Реальные просмотры/покупки добавляются поверх через
 * recordInteractions(). Оба источника живут в одной матрице.
 */

class CollaborativeFilteringService {
  constructor() {
    this.userItem = new Map();   // userId    → Set<productId>
    this.itemUser = new Map();   // productId → Set<userId>
    this.itemSim  = new Map();   // productId → Map<productId, similarity>
    this.products = [];
    this.initialized = false;
  }

  // ── Seed-able RNG (Linear Congruential) ───────────────────────────────────
  _seededRng(seed) {
    let state = (seed | 0) || 1;
    return () => {
      state = (state * 1664525 + 1013904223) | 0;
      return ((state >>> 0) % 1_000_000) / 1_000_000;
    };
  }

  // ── Синтетический корпус взаимодействий ───────────────────────────────────
  _generateSyntheticInteractions(products, numUsers, seed) {
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

    for (let u = 1; u <= numUsers; u++) {
      const userId = `synth_${u}`;
      const items  = new Set();

      // 1-2 любимых жанра + 1 любимая категория
      const favGenreCount = rng() < 0.65 ? 1 : 2;
      const favGenres = [];
      for (let i = 0; i < favGenreCount; i++) {
        favGenres.push(genres[Math.floor(rng() * genres.length)]);
      }
      const favCategory = categories[Math.floor(rng() * categories.length)];

      // 3-8 товаров: 70% из любимых жанров, 20% из любимой категории, 10% случайные
      const count = 3 + Math.floor(rng() * 6);
      for (let i = 0; i < count; i++) {
        const r = rng();
        let pool;
        if (r < 0.7)       pool = byGenre.get(favGenres[Math.floor(rng() * favGenres.length)]);
        else if (r < 0.9)  pool = byCategory.get(favCategory);
        else               pool = products;
        if (!pool || !pool.length) continue;
        const pick = pool[Math.floor(rng() * pool.length)];
        items.add(pick.id);
      }

      if (items.size === 0) continue;
      this.userItem.set(userId, items);
      for (const pid of items) {
        if (!this.itemUser.has(pid)) this.itemUser.set(pid, new Set());
        this.itemUser.get(pid).add(userId);
      }
    }
  }

  // ── Item-Item матрица сходства (косинус по бинарным векторам) ────────────
  _buildItemSimilarity(products) {
    for (const pi of products) {
      const usersI = this.itemUser.get(pi.id);
      if (!usersI || !usersI.size) { this.itemSim.set(pi.id, new Map()); continue; }

      const sims = new Map();
      for (const pj of products) {
        if (pj.id === pi.id) continue;
        const usersJ = this.itemUser.get(pj.id);
        if (!usersJ || !usersJ.size) continue;

        // Пересечение пользователей
        const [s, l] = usersI.size < usersJ.size ? [usersI, usersJ] : [usersJ, usersI];
        let inter = 0;
        for (const u of s) if (l.has(u)) inter++;
        if (!inter) continue;

        const sim = inter / Math.sqrt(usersI.size * usersJ.size);
        sims.set(pj.id, sim);
      }
      this.itemSim.set(pi.id, sims);
    }
  }

  // ── Публичное API ─────────────────────────────────────────────────────────

  initialize(products, { numUsers = 80, seed = 42 } = {}) {
    this.products = products;
    this.userItem.clear();
    this.itemUser.clear();
    this.itemSim.clear();
    this._generateSyntheticInteractions(products, numUsers, seed);
    this._buildItemSimilarity(products);
    this.initialized = true;
  }

  _ensureInitialized(products) {
    if (!this.initialized || this.products !== products) this.initialize(products);
  }

  /**
   * Регистрирует реальные взаимодействия пользователя поверх синтетических.
   * Пересчитывает item-similarity (для 28 товаров это копейки).
   */
  recordInteractions(userId, productIds, products) {
    this._ensureInitialized(products);
    if (!productIds || !productIds.length) return;
    const set = this.userItem.get(userId) || new Set();
    let changed = false;
    for (const pid of productIds) {
      if (!set.has(pid)) {
        set.add(pid);
        if (!this.itemUser.has(pid)) this.itemUser.set(pid, new Set());
        this.itemUser.get(pid).add(userId);
        changed = true;
      }
    }
    this.userItem.set(userId, set);
    if (changed) this._buildItemSimilarity(products);
  }

  /**
   * Скоринг всех товаров для пользователя.
   * Возвращает Map<productId, [0..1]>.
   */
  scoreAll(viewedIds = [], purchasedIds = [], products) {
    this._ensureInitialized(products);

    // Веса: покупка = 2, просмотр = 1
    const interactions = new Map();
    for (const id of purchasedIds)        interactions.set(id, 2);
    for (const id of viewedIds)
      if (!interactions.has(id)) interactions.set(id, 1);

    const scores = new Map();

    if (interactions.size === 0) {
      // Холодный старт: вернуть нули, гибрид опустится на CB / popularity
      for (const p of products) scores.set(p.id, 0);
      return scores;
    }

    let maxScore = 0;
    for (const p of products) {
      if (interactions.has(p.id)) { scores.set(p.id, 0); continue; }
      const sims = this.itemSim.get(p.id);
      if (!sims) { scores.set(p.id, 0); continue; }

      let weighted = 0;
      let totalW   = 0;
      for (const [intId, w] of interactions) {
        const s = sims.get(intId);
        if (s) { weighted += s * w; totalW += w; }
      }
      const score = totalW > 0 ? weighted / totalW : 0;
      scores.set(p.id, score);
      if (score > maxScore) maxScore = score;
    }

    // Нормализуем в [0..1] для удобной комбинации в гибриде
    if (maxScore > 0) {
      for (const [id, s] of scores) scores.set(id, s / maxScore);
    }

    return scores;
  }

  /**
   * Топ-N рекомендаций по CF.
   */
  getRecommendations(viewedIds, purchasedIds, products, n = 4) {
    const scores = this.scoreAll(viewedIds, purchasedIds, products);
    return products
      .filter(p => (scores.get(p.id) || 0) > 0)
      .map(p => ({ ...p, similarity: scores.get(p.id) }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, n)
      .map(({ similarity, ...p }) => ({
        ...p,
        similarity: parseFloat(similarity.toFixed(3)),
        confidence: Math.min(99, Math.max(20, Math.round(similarity * 100))),
        reason: 'Покупают вместе с тем, что вы выбирали'
      }));
  }

  /**
   * Похожие товары: топ-N item-to-item.
   */
  getSimilarItems(productId, products, n = 4) {
    this._ensureInitialized(products);
    const sims = this.itemSim.get(productId);
    if (!sims || !sims.size) return [];

    return [...sims.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([id, sim]) => {
        const p = products.find(x => x.id === id);
        if (!p) return null;
        return {
          ...p,
          similarity: parseFloat(sim.toFixed(3)),
          confidence: Math.min(99, Math.max(20, Math.round(sim * 130))),
          reason: 'Часто покупают вместе'
        };
      })
      .filter(Boolean);
  }

  /**
   * Диагностика — сколько данных в матрице.
   */
  getStats() {
    return {
      users: this.userItem.size,
      items: this.itemUser.size,
      avgItemsPerUser: this.userItem.size > 0
        ? [...this.userItem.values()].reduce((s, v) => s + v.size, 0) / this.userItem.size
        : 0,
      density: this.userItem.size && this.itemUser.size
        ? [...this.userItem.values()].reduce((s, v) => s + v.size, 0)
          / (this.userItem.size * this.itemUser.size)
        : 0
    };
  }
}

export default new CollaborativeFilteringService();
