/**
 * Content-Based Recommender
 *
 * TF-IDF над текстовым описанием товаров (название, теги, жанр, категория,
 * описание + структурные токены) + cosine similarity.
 *
 * Сглаженный IDF: log((N + 1) / (df + 1)) + 1, чтобы избежать делений на ноль.
 * Векторы хранятся как Map<token, weight> (sparse), это даёт O(min(|A|,|B|))
 * на одно сходство вместо O(|V|).
 */

const STOPWORDS = new Set([
  'и','в','во','на','с','со','а','но','или','что','как','для','от','до','из',
  'к','у','о','об','это','этот','эта','эти','тот','та','те','же','бы','ли',
  'не','ни','по','за','при','то','же','уже','ещё','еще','быть','есть','был',
  'была','было','были','один','одна','одно','also','the','a','an','of','to',
  'for','on','in','at','is','are','with','and','or','by','from'
]);

class RecommendationService {
  constructor() {
    this.products = [];
    this.idf      = new Map();         // token → idf
    this.vectors  = new Map();         // productId → Map<token, weight>
    this.norms    = new Map();         // productId → L2 norm
    this.initialized = false;
  }

  // ── Подготовка корпуса ────────────────────────────────────────────────────

  initialize(products) {
    this.products = products;

    const tokenLists = new Map();
    const df         = new Map();      // token → document frequency

    for (const p of products) {
      const tokens = this._productTokens(p);
      tokenLists.set(p.id, tokens);
      const unique = new Set(tokens);
      for (const t of unique) df.set(t, (df.get(t) || 0) + 1);
    }

    const N = products.length;
    this.idf.clear();
    for (const [t, dfVal] of df) {
      this.idf.set(t, Math.log((N + 1) / (dfVal + 1)) + 1);
    }

    this.vectors.clear();
    this.norms.clear();
    for (const p of products) {
      const tokens = tokenLists.get(p.id);
      if (!tokens.length) {
        this.vectors.set(p.id, new Map());
        this.norms.set(p.id, 1);
        continue;
      }
      const tf = new Map();
      for (const t of tokens) tf.set(t, (tf.get(t) || 0) + 1);

      const vec = new Map();
      let normSq = 0;
      for (const [t, freq] of tf) {
        const w = (freq / tokens.length) * (this.idf.get(t) || 0);
        if (w > 0) {
          vec.set(t, w);
          normSq += w * w;
        }
      }
      this.vectors.set(p.id, vec);
      this.norms.set(p.id, Math.sqrt(normSq) || 1);
    }

    this.initialized = true;
  }

  _ensureInitialized(products) {
    if (!this.initialized || this.products !== products) this.initialize(products);
  }

  // ── Токенизация и извлечение признаков ────────────────────────────────────

  _tokenize(text) {
    if (!text) return [];
    return String(text)
      .toLowerCase()
      .replace(/ё/g, 'е')
      .split(/[^a-zа-я0-9-]+/i)
      .filter(t => t.length >= 2 && !STOPWORDS.has(t));
  }

  _productTokens(product) {
    const text = [
      product.name,
      product.category,
      product.genre,
      ...(product.tags || []),
      product.description
    ].filter(Boolean).join(' ');

    const tokens = this._tokenize(text);

    // Структурные псевдо-токены — категория, жанр, ценовой бакет.
    // Префикс «__» гарантирует, что они не пересекутся с обычными словами.
    if (product.category) tokens.push(`__cat_${product.category}`);
    if (product.genre)    tokens.push(`__genre_${product.genre}`);
    tokens.push(`__price_${this._priceBucket(product.price)}`);

    return tokens;
  }

  _priceBucket(price) {
    if (!price)        return 'free';
    if (price < 500)   return 'low';
    if (price < 1500)  return 'mid';
    if (price < 3000)  return 'high';
    return 'premium';
  }

  // ── Косинус для разреженных векторов ──────────────────────────────────────

  _cosineSparse(vecA, normA, vecB, normB) {
    if (!vecA || !vecB || !normA || !normB) return 0;
    // Итерируемся по меньшему вектору — стандартная оптимизация для sparse cosine.
    const [small, large] = vecA.size < vecB.size ? [vecA, vecB] : [vecB, vecA];
    let dot = 0;
    for (const [t, w] of small) {
      const wb = large.get(t);
      if (wb) dot += w * wb;
    }
    return dot / (normA * normB);
  }

  // ── Похожие товары (item-to-item content-based) ─────────────────────────

  getSimilarProducts(productId, products, n = 4) {
    this._ensureInitialized(products);

    const targetVec  = this.vectors.get(productId);
    const targetNorm = this.norms.get(productId);
    if (!targetVec) return this._topRated(products, n);

    const source = products.find(p => p.id === productId);

    return products
      .filter(p => p.id !== productId)
      .map(p => ({
        product: p,
        similarity: this._cosineSparse(
          targetVec, targetNorm,
          this.vectors.get(p.id), this.norms.get(p.id)
        )
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, n)
      .map(({ product, similarity }) => ({
        ...product,
        similarity: parseFloat(similarity.toFixed(3)),
        confidence: Math.min(99, Math.max(20, Math.round(similarity * 130))),
        reason:     this._similarReason(source, product)
      }));
  }

  // ── Персональные рекомендации (content-based по профилю) ────────────────

  getPersonalized(viewedIds, purchasedIds, products, n = 4) {
    this._ensureInitialized(products);

    const seen = new Set([...viewedIds, ...purchasedIds]);
    if (seen.size === 0) {
      return this._topRated(products, n).map(p => ({
        ...p,
        confidence: 75,
        reason: 'Популярный товар в магазине'
      }));
    }

    const { userVec, userNorm } = this.buildUserProfile(viewedIds, purchasedIds);

    if (userNorm === 0) {
      return this._topRated(products, n).map(p => ({
        ...p, confidence: 70, reason: 'Популярный товар'
      }));
    }

    return products
      .filter(p => !seen.has(p.id))
      .map(p => ({
        product: p,
        similarity: this._cosineSparse(
          userVec, userNorm,
          this.vectors.get(p.id), this.norms.get(p.id)
        )
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, n)
      .map(({ product, similarity }) => ({
        ...product,
        similarity: parseFloat(similarity.toFixed(3)),
        confidence: Math.min(99, Math.max(20, Math.round(similarity * 140))),
        reason:     this._personalReason(product, viewedIds, purchasedIds, products)
      }));
  }

  // ── Вектор пользователя (нужен и для CF-гибрида) ────────────────────────

  buildUserProfile(viewedIds = [], purchasedIds = []) {
    const userVec = new Map();
    let totalW = 0;

    const accumulate = (id, weight) => {
      const v = this.vectors.get(id);
      if (!v) return;
      for (const [t, w] of v) {
        userVec.set(t, (userVec.get(t) || 0) + w * weight);
      }
      totalW += weight;
    };

    // Покупка важнее просмотра
    for (const id of purchasedIds) accumulate(id, 2);
    for (const id of viewedIds) {
      if (!purchasedIds.includes(id)) accumulate(id, 1);
    }

    if (totalW > 0) {
      for (const [t, v] of userVec) userVec.set(t, v / totalW);
    }

    let normSq = 0;
    for (const [, v] of userVec) normSq += v * v;
    return { userVec, userNorm: Math.sqrt(normSq) };
  }

  /**
   * Возвращает map productId → [0..1] (для гибридной комбинации).
   */
  scoreAll(viewedIds, purchasedIds, products) {
    this._ensureInitialized(products);
    const { userVec, userNorm } = this.buildUserProfile(viewedIds, purchasedIds);
    const scores = new Map();
    if (userNorm === 0) {
      for (const p of products) scores.set(p.id, 0);
      return scores;
    }
    for (const p of products) {
      const sim = this._cosineSparse(
        userVec, userNorm,
        this.vectors.get(p.id), this.norms.get(p.id)
      );
      scores.set(p.id, Math.max(0, sim));
    }
    return scores;
  }

  // ── Объяснения и фолбэки ─────────────────────────────────────────────────

  _topRated(products, n) {
    return [...products]
      .sort((a, b) =>
        (b.rating || 0) * Math.log((b.reviews || 0) + 1) -
        (a.rating || 0) * Math.log((a.reviews || 0) + 1)
      )
      .slice(0, n);
  }

  _prettyGenre(g) {
    const map = {
      rpg: 'RPG', action: 'Action', shooter: 'шутеры', strategy: 'стратегии',
      moba: 'MOBA', adventure: 'приключения', simulation: 'симуляторы',
      racing: 'гонки', sports: 'спорт', horror: 'хорроры', indie: 'инди',
      wallet: 'пополнения'
    };
    return map[g] || g;
  }

  _prettyCategory(c) {
    const map = {
      steam: 'Steam', games: 'игры', items: 'внутриигровые предметы',
      moba: 'MOBA', subscription: 'подписки'
    };
    return map[c] || c;
  }

  _similarReason(source, target) {
    if (!source) return 'Похожий товар';
    if (source.genre === target.genre && source.genre)
      return `Похожий жанр — ${this._prettyGenre(target.genre)}`;
    const shared = (source.tags || []).filter(t => (target.tags || []).includes(t));
    if (shared.length) return `Та же тематика: ${shared[0]}`;
    if (source.category === target.category)
      return `Та же категория — ${this._prettyCategory(target.category)}`;
    return 'Часто покупают вместе';
  }

  _personalReason(product, viewedIds, purchasedIds, products) {
    const interacted = [...purchasedIds, ...viewedIds]
      .map(id => products.find(p => p.id === id))
      .filter(Boolean);

    for (const p of interacted) {
      if (p.genre === product.genre && p.genre)
        return `Вам нравится жанр ${this._prettyGenre(product.genre)}`;
      const shared = (p.tags || []).filter(t => (product.tags || []).includes(t));
      if (shared.length) return `Похоже на то, что вы смотрели: ${shared[0]}`;
    }
    return 'На основе ваших предпочтений';
  }
}

export default new RecommendationService();
