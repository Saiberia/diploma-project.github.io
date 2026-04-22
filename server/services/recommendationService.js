class RecommendationService {
  constructor() {
    this.vocabulary = [];
    this.productVectors = new Map();
    this.initialized = false;
  }

  // ── Инициализация: строим векторы для всех продуктов ──────────────────────

  initialize(products) {
    this.vocabulary = this._buildVocabulary(products);
    for (const p of products) {
      this.productVectors.set(p.id, this._buildVector(p));
    }
    this.initialized = true;
  }

  _ensureInitialized(products) {
    if (!this.initialized) this.initialize(products);
  }

  // ── Построение словаря признаков ──────────────────────────────────────────

  _buildVocabulary(products) {
    const vocab = new Set();
    for (const p of products) {
      vocab.add(`cat:${p.category}`);
      vocab.add(`genre:${p.genre}`);
      vocab.add(`price:${this._priceBucket(p.price)}`);
      for (const tag of (p.tags || [])) {
        vocab.add(`tag:${tag}`);
      }
    }
    return Array.from(vocab).sort();
  }

  _priceBucket(price) {
    if (price === 0)      return 'free';
    if (price < 500)      return 'low';
    if (price < 1500)     return 'mid';
    return 'high';
  }

  // ── Построение признакового вектора продукта ──────────────────────────────

  _buildVector(product) {
    return this.vocabulary.map(feature => {
      if (feature === `cat:${product.category}`)   return 1.0;
      if (feature === `genre:${product.genre}`)     return 1.0;
      if (feature === `price:${this._priceBucket(product.price)}`) return 0.5;
      if (feature.startsWith('tag:')) {
        const tag = feature.slice(4);
        return (product.tags || []).includes(tag) ? 1.0 : 0;
      }
      return 0;
    });
  }

  // ── Косинусное сходство ───────────────────────────────────────────────────

  _cosine(v1, v2) {
    let dot = 0, mag1 = 0, mag2 = 0;
    for (let i = 0; i < v1.length; i++) {
      dot  += v1[i] * v2[i];
      mag1 += v1[i] * v1[i];
      mag2 += v2[i] * v2[i];
    }
    return mag1 && mag2 ? dot / (Math.sqrt(mag1) * Math.sqrt(mag2)) : 0;
  }

  // ── Похожие товары (content-based) ───────────────────────────────────────

  getSimilarProducts(productId, products, n = 4) {
    this._ensureInitialized(products);

    const targetVec = this.productVectors.get(productId);
    if (!targetVec) return this._topRated(products, n);

    const source = products.find(p => p.id === productId);

    return products
      .filter(p => p.id !== productId)
      .map(p => ({
        ...p,
        similarity: this._cosine(targetVec, this.productVectors.get(p.id)),
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, n)
      .map(({ similarity, ...p }) => ({
        ...p,
        confidence: Math.min(Math.round(similarity * 110), 99),
        reason:     this._similarReason(source, p),
      }));
  }

  // ── Персональные рекомендации (история просмотров/покупок) ───────────────

  getPersonalized(viewedIds, purchasedIds, products, n = 4) {
    this._ensureInitialized(products);

    const seenIds = new Set([...viewedIds, ...purchasedIds]);

    if (seenIds.size === 0) {
      return this._topRated(products, n).map(p => ({
        ...p,
        confidence: 75,
        reason: 'Популярный товар в магазине',
      }));
    }

    // Взвешенный вектор предпочтений: покупки важнее просмотров
    const userVec = new Array(this.vocabulary.length).fill(0);
    let totalWeight = 0;

    for (const id of purchasedIds) {
      const v = this.productVectors.get(id);
      if (v) { v.forEach((val, i) => { userVec[i] += val * 2; }); totalWeight += 2; }
    }
    for (const id of viewedIds) {
      if (!purchasedIds.includes(id)) {
        const v = this.productVectors.get(id);
        if (v) { v.forEach((val, i) => { userVec[i] += val; }); totalWeight += 1; }
      }
    }
    if (totalWeight > 0) userVec.forEach((_, i) => { userVec[i] /= totalWeight; });

    return products
      .filter(p => !seenIds.has(p.id))
      .map(p => ({
        ...p,
        similarity: this._cosine(userVec, this.productVectors.get(p.id)),
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, n)
      .map(({ similarity, ...p }) => ({
        ...p,
        confidence: Math.min(Math.round(similarity * 120), 99),
        reason:     this._personalReason(p, viewedIds, purchasedIds, products),
      }));
  }

  // ── Вспомогательные методы ────────────────────────────────────────────────

  _topRated(products, n) {
    return [...products]
      .sort((a, b) => b.rating * Math.log(b.reviews + 1) - a.rating * Math.log(a.reviews + 1))
      .slice(0, n);
  }

  _similarReason(source, target) {
    if (!source) return 'Похожий товар';
    if (source.genre === target.genre) return `Жанр: ${target.genre}`;
    const shared = (source.tags || []).filter(t => (target.tags || []).includes(t));
    if (shared.length) return `Общий тег: ${shared[0]}`;
    if (source.category === target.category) return `Категория: ${target.category}`;
    return 'Часто покупают вместе';
  }

  _personalReason(product, viewedIds, purchasedIds, products) {
    const interacted = [...purchasedIds, ...viewedIds]
      .map(id => products.find(p => p.id === id))
      .filter(Boolean);

    for (const p of interacted) {
      if (p.genre === product.genre) return `Вам нравится жанр «${product.genre}»`;
      const shared = (p.tags || []).filter(t => (product.tags || []).includes(t));
      if (shared.length) return `На основе интереса к «${shared[0]}»`;
    }
    return 'На основе ваших предпочтений';
  }
}

export default new RecommendationService();
