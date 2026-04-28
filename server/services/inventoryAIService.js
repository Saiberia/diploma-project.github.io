/**
 * Inventory AI Service
 *
 * Предсказание stockout, рекомендация перезаказа, алерты для админ-панели.
 *
 * Алгоритмы:
 *   1. Stockout forecast — берём прогноз спроса на N дней (aiEngine.forecastDemand)
 *      и ищем дату, когда кумулятивный спрос превысит текущий stock.
 *
 *   2. Reorder point (упрощённый):
 *      ROP = avgDailyDemand × leadTime + safetyStock
 *      safetyStock = z * σ * sqrt(leadTime),  z = 1.65 (95% service level)
 *      σ оцениваем стандартным отклонением 7-дневной истории.
 *
 *   3. EOQ (Economic Order Quantity) — приближённо как 30-дневный спрос
 *      (для цифровых товаров EOQ малоприменимо, поэтому фиксированный горизонт).
 *
 *   4. Алерт-уровни:
 *      - critical: stockout в течение ≤ leadTime дней (нет времени дозаказать)
 *      - high:     stockout ≤ 7 дней
 *      - medium:   ≤ 14 дней
 *      - low:      ≤ 30 дней
 */

import aiEngine from './aiEngine.js';

const Z_SCORE_95 = 1.65;
const DEFAULT_LEAD_TIME = 3;     // дней — для цифровых товаров «лид-тайм» = время до получения новых ключей
const DEFAULT_HORIZON   = 30;    // дней — горизонт EOQ

class InventoryAIService {
  /**
   * Прогноз исчерпания запасов одного товара.
   * @param {object} product
   * @param {object} opts { days, leadTime }
   */
  forecastStockout(product, opts = {}) {
    const horizon  = opts.days     || DEFAULT_HORIZON;
    const leadTime = opts.leadTime || DEFAULT_LEAD_TIME;
    const stock    = product.stock || 0;

    const forecast = aiEngine.forecastDemand(String(product.id), [], horizon);
    const daily    = forecast.forecast || [];

    // Кумулятивный спрос
    let cumulative = 0;
    let stockoutDay = null;
    for (let i = 0; i < daily.length; i++) {
      cumulative += daily[i].predictedDemand;
      if (cumulative >= stock) {
        stockoutDay = i + 1;
        break;
      }
    }

    // Стандартное отклонение 7-дневной истории
    const sigma = this._estimateSigma(forecast.summary?.avg7DaySales || 0, daily.slice(0, 7));
    const avgDaily = forecast.summary?.avgDaily || 0;

    const safetyStock = Math.ceil(Z_SCORE_95 * sigma * Math.sqrt(leadTime));
    const reorderPoint = Math.ceil(avgDaily * leadTime + safetyStock);
    const reorderQty   = Math.max(1, Math.ceil(avgDaily * horizon));

    const daysOfStock = avgDaily > 0 ? stock / avgDaily : Infinity;

    let alertLevel = 'ok';
    if (stockoutDay !== null && stockoutDay <= leadTime) alertLevel = 'critical';
    else if (stockoutDay !== null && stockoutDay <= 7)   alertLevel = 'high';
    else if (stockoutDay !== null && stockoutDay <= 14)  alertLevel = 'medium';
    else if (stockoutDay !== null && stockoutDay <= 30)  alertLevel = 'low';

    return {
      productId:    product.id,
      productName:  product.name,
      currentStock: stock,
      avgDailyDemand: parseFloat(avgDaily.toFixed(2)),
      sigma:          parseFloat(sigma.toFixed(2)),
      daysOfStock:    Number.isFinite(daysOfStock) ? parseFloat(daysOfStock.toFixed(1)) : null,
      stockoutDay,                         // через сколько дней закончится (null = в горизонте не закончится)
      stockoutDate:   stockoutDay ? daily[stockoutDay - 1]?.date : null,
      reorderPoint,                        // когда дозаказывать
      shouldReorder:  stock <= reorderPoint,
      recommendedQty: reorderQty,          // сколько заказать
      safetyStock,
      leadTime,
      horizon,
      alertLevel,
      cumulativeForecast: this._buildCumulative(daily, stock)
    };
  }

  /**
   * Все алерты по магазину — отсортированы по серьёзности.
   */
  getAlerts(products, opts = {}) {
    const reports = products
      .filter(p => (p.stock || 0) < 100000) // отфильтровываем «бесконечные» сервисные позиции
      .map(p => this.forecastStockout(p, opts));

    const orderMap = { critical: 0, high: 1, medium: 2, low: 3, ok: 4 };
    return reports
      .filter(r => r.alertLevel !== 'ok')
      .sort((a, b) => orderMap[a.alertLevel] - orderMap[b.alertLevel]);
  }

  /**
   * Сводка по складу для дашборда.
   */
  getSummary(products) {
    const reports = products
      .filter(p => (p.stock || 0) < 100000)
      .map(p => this.forecastStockout(p));

    const counts = { critical: 0, high: 0, medium: 0, low: 0, ok: 0 };
    let totalReorderValue = 0;

    for (const r of reports) {
      counts[r.alertLevel] = (counts[r.alertLevel] || 0) + 1;
      if (r.shouldReorder) {
        const product = products.find(p => p.id === r.productId);
        totalReorderValue += (product?.price || 0) * r.recommendedQty;
      }
    }

    return {
      totalSku:    reports.length,
      counts,
      reorderNeeded: reports.filter(r => r.shouldReorder).length,
      estimatedReorderCost: totalReorderValue,
      generatedAt: new Date().toISOString()
    };
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  _estimateSigma(mean, sample) {
    if (!sample || sample.length < 2) return mean * 0.2;
    const m = sample.reduce((s, d) => s + (d.predictedDemand || 0), 0) / sample.length;
    const variance = sample.reduce((s, d) => s + Math.pow((d.predictedDemand || 0) - m, 2), 0) / sample.length;
    return Math.sqrt(variance);
  }

  _buildCumulative(daily, stock) {
    let cum = 0;
    return daily.slice(0, 14).map(d => {
      cum += d.predictedDemand;
      return {
        date:        d.date,
        cumulative:  cum,
        remaining:   Math.max(0, stock - cum),
        depleted:    cum >= stock
      };
    });
  }
}

export default new InventoryAIService();
