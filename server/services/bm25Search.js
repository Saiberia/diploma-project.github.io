/**
 * BM25 (Okapi BM25) — формула ранжирования из IR-литературы
 * (Robertson & Zaragoza, 2009).
 *
 *   score(D, Q) = Σ_{q ∈ Q} IDF(q) · (f(q, D) · (k1 + 1))
 *                            ───────────────────────────────────
 *                            f(q, D) + k1 · (1 - b + b · |D| / avgdl)
 *
 *   IDF(q) = ln( (N - df(q) + 0.5) / (df(q) + 0.5) + 1 )
 *
 * Параметры:
 *   k1 ∈ [1.2, 2.0]  — насколько быстро вклад термина выходит на плато
 *   b  ∈ [0.0, 1.0]  — нормировка по длине документа
 */

const STOPWORDS = new Set([
  'и','в','во','на','с','со','а','но','или','что','как','для','от','до','из',
  'к','у','о','об','это','этот','эта','эти','тот','та','те','же','бы','ли',
  'не','ни','по','за','при','то','уже','ещё','еще','быть','есть','был',
  'была','было','были','один','одна','одно','the','a','an','of','to',
  'for','on','in','at','is','are','with','and','or','by','from'
]);

class BM25Index {
  constructor({ k1 = 1.5, b = 0.75 } = {}) {
    this.k1 = k1;
    this.b  = b;
    this.docs       = [];          // [{ id, length, tf: Map<token, freq> }]
    this.idf        = new Map();   // token → IDF
    this.avgdl      = 0;
    this.products   = [];          // ссылка для быстрого доступа
  }

  // ── Токенизация (русско-английская) ───────────────────────────────────────
  tokenize(text) {
    if (!text) return [];
    return String(text)
      .toLowerCase()
      .replace(/ё/g, 'е')
      .split(/[^a-zа-я0-9-]+/i)
      .filter(t => t.length >= 2 && !STOPWORDS.has(t));
  }

  // ── Сборка индекса ────────────────────────────────────────────────────────
  build(products) {
    this.products = products;
    this.docs = [];
    const df = new Map();
    let totalLen = 0;

    for (const p of products) {
      // Поле name удваиваем — это эвристика IR: совпадение в title весит больше.
      const text = [
        p.name, p.name,
        p.category, p.genre,
        ...(p.tags || []),
        p.description
      ].filter(Boolean).join(' ');

      const tokens = this.tokenize(text);
      const tf = new Map();
      for (const t of tokens) tf.set(t, (tf.get(t) || 0) + 1);

      this.docs.push({ id: p.id, length: tokens.length, tf, product: p });
      totalLen += tokens.length;

      const unique = new Set(tokens);
      for (const t of unique) df.set(t, (df.get(t) || 0) + 1);
    }

    this.avgdl = this.docs.length ? totalLen / this.docs.length : 0;

    const N = this.docs.length;
    this.idf.clear();
    for (const [t, dfVal] of df) {
      this.idf.set(t, Math.log((N - dfVal + 0.5) / (dfVal + 0.5) + 1));
    }
  }

  ensureBuilt(products) {
    if (this.products !== products || this.docs.length === 0) this.build(products);
  }

  // ── Скоринг одного документа ──────────────────────────────────────────────
  _scoreDoc(doc, queryTerms) {
    const { k1, b, avgdl } = this;
    const lenNorm = (1 - b) + b * (doc.length / (avgdl || 1));

    let score = 0;
    for (const term of queryTerms) {
      const f = doc.tf.get(term);
      if (!f) continue;
      const idf = this.idf.get(term) || 0;
      score += idf * (f * (k1 + 1)) / (f + k1 * lenNorm);
    }
    return score;
  }

  /**
   * Поиск.
   * @param {string[]} queryTokens — уже расширенные/нормализованные токены
   * @param {object[]} products
   * @param {object} options { limit, minScore }
   */
  search(queryTokens, products, { limit = 20, minScore = 0.01 } = {}) {
    this.ensureBuilt(products);
    if (!queryTokens || !queryTokens.length) return [];

    const results = [];
    for (const doc of this.docs) {
      const score = this._scoreDoc(doc, queryTokens);
      if (score > minScore) {
        results.push({ ...doc.product, bm25Score: parseFloat(score.toFixed(4)) });
      }
    }
    results.sort((a, b) => b.bm25Score - a.bm25Score);
    return results.slice(0, limit);
  }
}

export default new BM25Index();
