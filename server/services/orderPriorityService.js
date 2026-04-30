/**
 * Order Prioritization Service
 *
 * Скоринг приоритета заказа на основе нескольких факторов. Используется в
 * админ-панели для очереди обработки и для backend-AI-темы (приоритизация).
 *
 *   priority(o) = w_loyalty   · loyaltyComponent
 *               + w_amount    · amountComponent
 *               + w_digital   · digitalComponent
 *               + w_waittime  · waitComponent
 *               - w_risk      · riskComponent
 *
 * Все компоненты приведены в [0..1], итоговый score умножается на 100.
 *
 * Решение о весах принято на основе того, что для цифрового маркетплейса:
 *   - VIP-клиент должен ждать минимум — высокий вес лояльности (0.30)
 *   - крупные заказы важны для выручки (0.20)
 *   - цифровые товары обрабатываются «как есть» — лёгкий бонус (0.15)
 *   - длительное ожидание — штраф магазину, поэтому растущий приоритет (0.20)
 *   - high-risk требует ручной проверки — снижаем приоритет автообработки (-0.30)
 *
 * Уровни:
 *   - urgent  ≥ 75  — обработать в течение 5 минут
 *   - high    ≥ 50  — обработать в течение 15 минут
 *   - normal  ≥ 25
 *   - low     <  25
 */

const WEIGHTS = {
  loyalty:  0.30,
  amount:   0.20,
  digital:  0.15,
  waittime: 0.20,
  risk:     0.30 // штраф
};

class OrderPriorityService {
  /**
   * @param {object} order
   * @param {object} ctx { userBehavior, products, fraudResult }
   */
  scoreOrder(order, ctx = {}) {
    const reasons = [];

    const loyalty = this._loyaltyComponent(ctx.userBehavior);
    if (loyalty >= 0.7)      reasons.push('VIP-клиент');
    else if (loyalty >= 0.4) reasons.push('Постоянный клиент');

    const amount = this._amountComponent(order.totalPrice);
    if (amount >= 0.7)      reasons.push('Крупный заказ');

    const digital = this._digitalComponent(order, ctx.products);
    if (digital >= 0.8)     reasons.push('Цифровая доставка');

    const wait = this._waitComponent(order.createdAt);
    if (wait >= 0.6)        reasons.push('Долгое ожидание');

    const risk = this._riskComponent(ctx.fraudResult);
    if (risk >= 0.5)        reasons.push('⚠️ Высокий риск — ручная проверка');

    let score =
      WEIGHTS.loyalty  * loyalty +
      WEIGHTS.amount   * amount +
      WEIGHTS.digital  * digital +
      WEIGHTS.waittime * wait -
      WEIGHTS.risk     * risk;

    score = Math.max(0, Math.min(1, score));
    const score100 = Math.round(score * 100);

    let level = 'low';
    if      (score100 >= 75) level = 'urgent';
    else if (score100 >= 50) level = 'high';
    else if (score100 >= 25) level = 'normal';

    return {
      score: score100,
      level,
      components: {
        loyalty:  parseFloat(loyalty.toFixed(2)),
        amount:   parseFloat(amount.toFixed(2)),
        digital:  parseFloat(digital.toFixed(2)),
        waittime: parseFloat(wait.toFixed(2)),
        risk:     parseFloat(risk.toFixed(2))
      },
      weights: WEIGHTS,
      reasons: reasons.length ? reasons : ['Стандартный заказ']
    };
  }

  /**
   * Сборка очереди — сортировка по убыванию приоритета.
   * Для уже скоренных заказов (с .priority) пересчёт не выполняется.
   */
  buildQueue(orders) {
    return [...orders]
      .sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }

  // ── Компоненты ────────────────────────────────────────────────────────────

  _loyaltyComponent(userBehavior) {
    if (!userBehavior?.preferences) return 0.2; // unknown user — нейтрально-низко
    const ls = userBehavior.preferences.loyaltyScore || 0; // 0..100
    return Math.max(0, Math.min(1, ls / 100));
  }

  _amountComponent(amount) {
    // Логарифмическая шкала: 100₽ → ~0, 1000₽ → 0.5, 10000₽ → 1
    if (!amount || amount <= 0) return 0;
    const v = Math.log10(amount) - 2; // [0..3]
    return Math.max(0, Math.min(1, v / 2));
  }

  _digitalComponent(order, products = []) {
    if (!products.length || !order.items?.length) return 0.5;
    let digital = 0;
    let total   = 0;
    for (const it of order.items) {
      const p = products.find(pr => String(pr.id) === String(it.productId));
      if (!p) continue;
      total++;
      // Все категории магазина — цифровые. Используем category как маркер.
      if (['steam', 'items', 'moba', 'subscription', 'games'].includes(p.category)) digital++;
    }
    return total > 0 ? digital / total : 0.5;
  }

  _waitComponent(createdAt) {
    if (!createdAt) return 0;
    const ageMs = Date.now() - new Date(createdAt).getTime();
    const ageMin = ageMs / 60000;
    // 0 минут → 0, 5 мин → 0.25, 15 мин → 0.75, 30+ мин → 1
    if (ageMin <= 0)  return 0;
    if (ageMin >= 30) return 1;
    return Math.min(1, ageMin / 30);
  }

  _riskComponent(fraudResult) {
    if (!fraudResult) return 0;
    return Math.max(0, Math.min(1, (fraudResult.riskScore || 0) / 100));
  }
}

export default new OrderPriorityService();
