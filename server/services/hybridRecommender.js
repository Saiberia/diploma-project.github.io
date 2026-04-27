/**
 * Hybrid Recommender — линейная комбинация content-based и collaborative filtering.
 *
 *   score(u, i) = α · score_CB(u, i) + (1 - α) · score_CF(u, i)
 *
 * Оба слагаемых нормализованы в [0..1] своими сервисами, поэтому результат тоже
 * корректно интерпретируется как ранжирующая величина.
 *
 * α (alpha) — вес content-based части. По умолчанию 0.5.
 *   - α = 1.0 → чистый CB (хорош на холодном старте, новые товары)
 *   - α = 0.0 → чистый CF (хорош когда есть много взаимодействий)
 *   - α = 0.5 → сбалансированный гибрид
 *
 * Cold-start: если у пользователя <2 взаимодействий, CF почти всегда даст
 * ноль, и гибрид естественно скатится в CB. Если же оба пусты — отдаём
 * популярные.
 */

import recommendationService from './recommendationService.js';
import collaborativeFilteringService from './collaborativeFilteringService.js';

class HybridRecommender {
  constructor() {
    this.alpha = 0.5;
  }

  setAlpha(value) {
    const a = parseFloat(value);
    if (!Number.isFinite(a)) return;
    this.alpha = Math.min(1, Math.max(0, a));
  }

  getAlpha() {
    return this.alpha;
  }

  /**
   * Возвращает Map<productId, [0..1]> — комбинированный score.
   */
  scoreAll(viewedIds = [], purchasedIds = [], products, alphaOverride) {
    const alpha = alphaOverride != null
      ? Math.min(1, Math.max(0, parseFloat(alphaOverride)))
      : this.alpha;

    const cbScores = recommendationService.scoreAll(viewedIds, purchasedIds, products);
    const cfScores = collaborativeFilteringService.scoreAll(viewedIds, purchasedIds, products);

    const combined = new Map();
    for (const p of products) {
      const cb = cbScores.get(p.id) || 0;
      const cf = cfScores.get(p.id) || 0;
      combined.set(p.id, alpha * cb + (1 - alpha) * cf);
    }
    return combined;
  }

  /**
   * Топ-N рекомендаций с объяснением вклада каждого источника.
   */
  getRecommendations(viewedIds = [], purchasedIds = [], products, n = 4, alphaOverride) {
    const alpha = alphaOverride != null
      ? Math.min(1, Math.max(0, parseFloat(alphaOverride)))
      : this.alpha;

    const seen = new Set([...viewedIds, ...purchasedIds]);

    // Холодный старт — нет истории.
    if (seen.size === 0) {
      return recommendationService.getPersonalized([], [], products, n)
        .map(p => ({ ...p, source: 'popularity', alpha }));
    }

    const cbScores = recommendationService.scoreAll(viewedIds, purchasedIds, products);
    const cfScores = collaborativeFilteringService.scoreAll(viewedIds, purchasedIds, products);

    const ranked = products
      .filter(p => !seen.has(p.id))
      .map(p => {
        const cb = cbScores.get(p.id) || 0;
        const cf = cfScores.get(p.id) || 0;
        const score = alpha * cb + (1 - alpha) * cf;
        return { product: p, score, cb, cf };
      })
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, n);

    return ranked.map(({ product, score, cb, cf }) => {
      const dominant = cb >= cf ? 'content' : 'collaborative';
      return {
        ...product,
        similarity: parseFloat(score.toFixed(3)),
        confidence: Math.min(99, Math.max(20, Math.round(score * 130))),
        scores: {
          contentBased:        parseFloat(cb.toFixed(3)),
          collaborative:       parseFloat(cf.toFixed(3)),
          combined:            parseFloat(score.toFixed(3))
        },
        alpha,
        source: dominant,
        reason: this._reason(product, dominant, viewedIds, purchasedIds, products)
      };
    });
  }

  _reason(product, dominant, viewedIds, purchasedIds, products) {
    if (dominant === 'collaborative') {
      return 'Покупают вместе с тем, что вам нравится';
    }
    // content-based: используем тот же объяснитель, что и в чистом CB
    const interacted = [...purchasedIds, ...viewedIds]
      .map(id => products.find(p => p.id === id))
      .filter(Boolean);
    for (const p of interacted) {
      if (p.genre === product.genre && p.genre)
        return `Похоже на ${p.name} — тот же жанр`;
      const shared = (p.tags || []).filter(t => (product.tags || []).includes(t));
      if (shared.length) return `Похоже на ${p.name} — общая тематика`;
    }
    return 'На основе ваших предпочтений';
  }
}

export default new HybridRecommender();
