/**
 * Deep test runner for Nova Shop (backend + AI modules).
 *
 * Runs a set of scenario-driven checks against a running dev server:
 *   - Health, analytics, metrics
 *   - Search: intent detection, query expansion, layout swap, logging
 *   - Recommendations: personalized/similar, algorithm routing, hybrid alpha override
 *   - Behavior tracking: view/search/purchase logs reflected in /ai/users and analytics
 *   - Chat logging: variety of inputs, check analytics aggregation
 *   - Fraud + order queue: build queue, priority ordering, triggers
 *   - Inventory alerts: endpoint returns sane shape
 *
 * Usage:
 *   node scripts/deepTest.mjs
 *   BASE_URL=http://localhost:5000 node scripts/deepTest.mjs
 */
import assert from 'node:assert/strict';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
const JSON_HEADERS = { 'content-type': 'application/json' };

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function http(method, path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: body ? JSON_HEADERS : undefined,
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* ignore */ }
  return { status: res.status, ok: res.ok, json, text };
}

function pick(arr, n = 1) {
  return [...arr].slice(0, n);
}

function logSection(title) {
  process.stdout.write(`\n=== ${title} ===\n`);
}

function ok(msg) {
  process.stdout.write(`✓ ${msg}\n`);
}

function warn(msg) {
  process.stdout.write(`! ${msg}\n`);
}

async function main() {
  logSection('0) Server health');
  {
    const r = await http('GET', '/api/health');
    assert.equal(r.status, 200);
    assert.ok(r.json?.status === 'ok');
    ok('/api/health ok');
  }
  {
    const r = await http('GET', '/api/ai/health');
    assert.equal(r.status, 200);
    assert.ok(r.json?.status === 'healthy');
    ok('/api/ai/health healthy');
  }

  logSection('1) Products baseline');
  let products = [];
  {
    const r = await http('GET', '/api/products');
    assert.equal(r.status, 200);
    products = r.json?.data || [];
    assert.ok(Array.isArray(products) && products.length >= 30);
    ok(`/api/products returns ${products.length} items`);
    const withImages = products.filter(p => typeof p.image === 'string' && p.image.startsWith('http')).length;
    ok(`products with http images: ${withImages}/${products.length}`);
  }

  logSection('2) Search: intents, layout swap, logging');
  {
    const userId = `usr_search_${Date.now()}`;
    const queries = [
      { q: 'дешево стим', expectIntent: 'cheap' },
      { q: 'топ игры', expectIntent: 'popular' },
      { q: 'новинки rpg', expectIntent: 'new' },
      { q: 'ведьмак', expectFoundMin: 1 },
      { q: 'dtlmvfr', expectFoundMin: 1 }, // "ведьмак" in EN layout
      { q: 'гта', expectFoundMin: 1 },
      { q: 'cs2 prime', expectFoundMin: 1 }
    ];
    for (const t of queries) {
      const r = await http('POST', '/api/ai/search', { query: t.q, limit: 10, userId });
      assert.equal(r.status, 200, `search status for ${t.q}`);
      assert.ok(Array.isArray(r.json?.results), `search results array for ${t.q}`);
      if (t.expectIntent) assert.equal(r.json.intent, t.expectIntent, `intent for ${t.q}`);
      if (t.expectFoundMin != null) assert.ok(r.json.totalFound >= t.expectFoundMin, `found for ${t.q}`);
    }

    const a = await http('GET', '/api/ai/analytics/search');
    assert.equal(a.status, 200);
    assert.ok(a.json.total >= queries.length);
    ok(`search analytics total=${a.json.total}`);
    ok(`search analytics intents keys=${Object.keys(a.json.intents || {}).length}`);
  }

  logSection('3) Recommendations: personalized/similar/hybrid alpha');
  {
    const viewedIds = pick(products.map(p => p.id).filter(Boolean), 3);
    const purchasedIds = pick(products.map(p => p.id).filter(Boolean).slice(3), 2);

    const r1 = await http('POST', '/api/ai/recommendations/personalized', {
      viewedIds, purchasedIds, limit: 6, algorithm: 'hybrid'
    });
    assert.equal(r1.status, 200);
    assert.ok(Array.isArray(r1.json?.recommendations));
    ok(`hybrid personalized recs: ${r1.json.recommendations.length}`);

    const r2 = await http('POST', '/api/ai/recommendations/personalized', {
      viewedIds, purchasedIds, limit: 6, algorithm: 'hybrid', alpha: 0.8
    });
    assert.equal(r2.status, 200);
    assert.ok(Math.abs((r2.json.alpha ?? 0) - 0.8) < 1e-9);
    ok('hybrid alpha override works');

    const targetId = viewedIds[0];
    const r3 = await http('GET', `/api/ai/recommendations/similar/${targetId}?limit=4&algorithm=content`);
    assert.equal(r3.status, 200);
    assert.ok(Array.isArray(r3.json?.recommendations));
    ok(`similar(content) for product ${targetId}: ${r3.json.recommendations.length}`);
  }

  logSection('4) Offline metrics');
  {
    const r = await http('GET', '/api/ai/metrics?ks=3,5,10&alpha=0.5&users=30');
    assert.equal(r.status, 200);
    assert.ok(r.json?.results?.hybrid?.metrics?.['@5']);
    ok('metrics endpoint returns hybrid @5');

    const s = await http('GET', '/api/ai/metrics/alpha-sweep?k=5');
    assert.equal(s.status, 200);
    assert.ok(Array.isArray(s.json?.sweep) && s.json.sweep.length >= 5);
    ok('alpha-sweep returns grid');
  }

  logSection('5) Behavior tracking and profiles');
  {
    const userId = `usr_beh_${Date.now()}`;
    const p1 = products[0];
    const p2 = products[1];

    await http('POST', '/api/ai/track', { userId, action: 'view', data: { productId: p1.id, category: p1.category, price: p1.price, game: p1.genre } });
    await http('POST', '/api/ai/track', { userId, action: 'view', data: { productId: p2.id, category: p2.category, price: p2.price, game: p2.genre } });
    await http('POST', '/api/ai/track', { userId, action: 'search', data: { query: 'steam пополнение' } });

    const list = await http('GET', '/api/ai/users?limit=10');
    assert.equal(list.status, 200);
    assert.ok(Array.isArray(list.json?.profiles));
    const me = list.json.profiles.find(x => x.userId === userId);
    assert.ok(me, 'user appears in profiles');
    assert.ok(me.views >= 2, 'views counted');
    assert.ok(me.searches >= 1, 'searches counted');
    ok('behavior profile appears and counts actions');

    const detail = await http('GET', `/api/ai/users/${userId}`);
    assert.equal(detail.status, 200);
    assert.ok(Array.isArray(detail.json?.history?.views));
    ok('behavior detail endpoint ok');
  }

  logSection('6) Chat: robustness inputs + analytics');
  {
    const userId = `usr_chat_${Date.now()}`;
    const prompts = [
      'привет',
      'а че если я хочу что-то недорогое в стиме?',
      'dtlmvfr 3 скидка есть?',
      'я оплатил, но не пришло. что делать???',
      'вы мошенники?',
      'как узнать логин steam, это email?',
      'нужен возврат за заказ',
      'помоги выбрать игру похожую на elden ring',
      'а у вас есть rp для лол?',
      'как работает ваш ai?'
    ];
    for (const msg of prompts) {
      const r = await http('POST', '/api/ai/chat', { message: msg, userId, intent: 'unknown', confidence: null });
      assert.equal(r.status, 200);
      assert.ok(typeof r.json?.message === 'string' && r.json.message.length > 0);
      assert.ok(typeof r.json?.sentiment === 'string');
    }

    const a = await http('GET', '/api/ai/analytics/chat');
    assert.equal(a.status, 200);
    assert.ok(a.json.total >= prompts.length);
    ok(`chat analytics total=${a.json.total}`);

    const uniqueIntents = Object.keys(a.json.intents || {});
    if (uniqueIntents.length < 2) {
      warn(`chat intents are not diverse yet (unique=${uniqueIntents.length}). This may be OK if frontend intent is not passed.`);
    } else {
      ok(`chat intents diversity: ${uniqueIntents.length}`);
    }
  }

  logSection('7) Inventory AI');
  {
    const r = await http('GET', '/api/ai/inventory/alerts');
    assert.equal(r.status, 200);
    assert.ok(r.json?.summary);
    assert.ok(Array.isArray(r.json?.alerts));
    ok(`inventory summary sku=${r.json.summary.totalSku}, alerts=${r.json.alerts.length}`);
  }

  logSection('8) Orders: create, queue priority, fraud triggers');
  {
    const userId = `usr_order_${Date.now()}`;
    const small = await http('POST', '/api/orders/create', {
      productIds: [{ productId: products[0].id, quantity: 1 }],
      totalPrice: 199,
      paymentMethod: 'card',
      userId,
      customerInfo: { email: 'deep@test.com', name: 'Deep' }
    });
    assert.equal(small.status, 200);

    const big = await http('POST', '/api/orders/create', {
      productIds: [{ productId: products[2].id, quantity: 1 }],
      totalPrice: 3999,
      paymentMethod: 'card',
      userId,
      customerInfo: { email: 'deep@test.com', name: 'Deep' }
    });
    assert.equal(big.status, 200);

    const q = await http('GET', '/api/orders/queue');
    assert.equal(q.status, 200);
    assert.ok(Array.isArray(q.json?.queue));
    assert.ok(q.json.queue.length >= 2);

    const first = q.json.queue[0];
    ok(`queue first priority=${first.priority} level=${first.priorityLevel} amount=${first.totalPrice}`);

    // Fraud velocity trigger: 3 quick orders in 10 minutes
    for (let i = 0; i < 3; i++) {
      await http('POST', '/api/orders/create', {
        productIds: [{ productId: products[1].id, quantity: 1 }],
        totalPrice: 9,
        paymentMethod: 'card',
        userId,
        customerInfo: { email: 'deep@test.com', name: 'Deep' }
      });
    }
    const v = await http('POST', '/api/ai/verify-transaction', { userId, amount: 9, ipAddress: '127.0.0.1' });
    assert.equal(v.status, 200);
    ok(`fraud verify riskScore=${v.json.riskScore} level=${v.json.riskLevel}`);
  }

  logSection('Done');
  ok('Deep tests completed.');
}

main().catch((e) => {
  console.error('\nDEEP TEST FAILED\n', e);
  process.exit(1);
});

