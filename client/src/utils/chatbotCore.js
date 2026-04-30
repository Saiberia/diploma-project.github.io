import { expandQuery, normalize as smartNormalize } from './searchUtils';

/**
 * Chatbot Core (frontend intelligence)
 *
 * Pure functions + small model, no React, no network.
 * The component can optionally do retrieval (search/recommend) on top of the plan returned here.
 */

// ───────────────────────────────────────────────────────────────────────────
// Knowledge base
// ───────────────────────────────────────────────────────────────────────────

export const PRODUCTS = {
  steam: {
    names: ['steam', 'стим', 'стим кошелек', 'steam wallet', 'пополнение стима', 'valve', 'стим баланс', 'пополнить стим', 'закинуть на стим'],
    action: '/steam-topup',
    info: 'Пополнение Steam кошелька — вводите логин и сумму, деньги поступают моментально!',
    price: 'от 100₽'
  },
  cs2: {
    names: ['cs', 'cs2', 'csgo', 'кс', 'кс2', 'ксго', 'counter-strike', 'контр страйк', 'контра', 'prime'],
    action: '/catalog?category=games',
    info: 'Counter-Strike 2 — тактический шутер. Есть Prime Upgrade и скины.',
    price: 'Prime от 1199₽'
  },
  vbucks: {
    names: ['vbucks', 'v-bucks', 'вбаксы', 'вибаксы', 'fortnite', 'фортнайт'],
    action: '/catalog?category=items',
    info: 'V-Bucks для Fortnite — скины, боевой пропуск и эмоции.',
    price: 'от 449₽'
  },
  robux: {
    names: ['robux', 'робуксы', 'робаксы', 'roblox', 'роблокс'],
    action: '/catalog?category=items',
    info: 'Robux для Roblox — геймпассы, предметы и аксессуары.',
    price: 'от 349₽'
  },
  genshin: {
    names: ['genshin', 'геншин', 'genshin impact', 'кристаллы genesis', 'примогемы'],
    action: '/catalog?category=items',
    info: 'Кристаллы Genesis для Genshin Impact — баннеры и персонажи.',
    price: 'от 549₽'
  },
  valorant: {
    names: ['valorant', 'валорант', 'валик', 'vp', 'valorant points', 'радианит'],
    action: '/catalog?category=items',
    info: 'Valorant Points — боевой пропуск и скины оружия.',
    price: 'от 599₽'
  },
  dota: {
    names: ['dota', 'dota 2', 'дота', 'дотка'],
    action: '/catalog?category=moba',
    info: 'Dota 2 — боевые пропуски, сундуки и предметы.',
    price: 'от 349₽'
  },
  lol: {
    names: ['lol', 'лол', 'league of legends', 'лига', 'rp', 'riot points'],
    action: '/catalog?category=moba',
    info: 'Riot Points для League of Legends — скины и чемпионы.',
    price: 'от 499₽'
  }
};

export const FAQ = {
  delivery: {
    title: 'Доставка',
    examples: ['когда придёт заказ', 'сколько ждать доставку', 'доставка моментально?', 'когда получу товар', 'не пришло'],
    answer: '⚡ **Доставка моментальная!**\n\n• Цифровые товары: 1-5 минут\n• Steam пополнение: до 10 минут\n\nЕсли не пришло — напишите номер заказа, помогу.'
  },
  payment: {
    title: 'Оплата',
    examples: ['как оплатить', 'способы оплаты', 'оплата картой', 'сбп', 'юmoney'],
    answer: '💳 **Способы оплаты:**\n\n• Банковские карты\n• СБП\n• ЮMoney\n\nВсе платежи защищены.'
  },
  refund: {
    title: 'Возврат',
    examples: ['возврат', 'вернуть деньги', 'отменить заказ', 'товар не работает', 'не пришла покупка'],
    answer: '🔄 **Возврат возможен.**\n\nЕсли товар не пришёл или не работает — напишите номер заказа и email, разберёмся.'
  },
  steamlogin: {
    title: 'Логин Steam',
    examples: ['какой у меня логин стим', 'где найти логин steam', 'логин steam где взять'],
    answer: '🎮 **Как найти логин Steam:**\n\nSteam → Имя → «Об аккаунте» → «Имя аккаунта».\n\n⚠️ Это не email и не ник.'
  },
  capabilities: {
    title: 'Что умеешь',
    examples: ['что ты умеешь', 'help', 'твои возможности'],
    answer: '🤖 **Я умею:**\n\n• Найти товар по запросу (синонимы/раскладка)\n• Подобрать похожие (рекомендации)\n• Ответить про оплату/доставку/возврат\n\nСпроси: “посоветуй как Elden Ring” или “дешево стим”.'
  }
};

export const INTENTS = {
  catalog: {
    title: 'Открыть каталог',
    examples: ['открой каталог', 'покажи товары', 'весь ассортимент', 'каталог'],
    action: '/catalog',
    answer: '🎮 Открываю каталог товаров.',
    actionText: 'Открыть каталог'
  },
  buy: {
    title: 'Хочу купить',
    examples: ['хочу купить', 'надо купить', 'оформить покупку', 'купить игру'],
    action: '/catalog',
    answer: '🛒 Что именно хотите купить? Напишите название (Steam/V-Bucks/CS2/Witcher…).',
    actionText: 'Открыть каталог'
  }
};

const GREETINGS = ['привет', 'здравствуйте', 'hello', 'hi', 'добрый день', 'добрый вечер', 'салют'];
const GOODBYES  = ['пока', 'до свидания', 'bye', 'до встречи'];

const EMOTIONS = {
  angry:    ['ужас', 'отвратительно', 'мошенники', 'обман', 'не работает', 'плохо'],
  confused: ['не понимаю', 'непонятно', 'запутался'],
  urgent:   ['срочно', 'быстрее', 'sos', 'пожалуйста']
};

// ───────────────────────────────────────────────────────────────────────────
// TF-IDF Intent Classifier (same idea as before, but extracted)
// ───────────────────────────────────────────────────────────────────────────

const STOPWORDS = new Set([
  'и','в','во','на','с','со','а','но','или','для','от','до','из','к','у','о','об',
  'это','этот','эта','эти','тот','та','же','бы','ли','не','ни','по','за','при','то',
  'уже','еще','быть','есть','был','была','было','были','я','ты','вы','мы','он','она',
  'они','мне','тебе','меня','тебя','ему','ей','тут','там','вот','так','нет',
  'the','a','an','of','to','for','on','in','at','is','are','with','and','or','by','from'
]);

function tokenize(text) {
  if (!text) return [];
  return String(text)
    .toLowerCase()
    .replace(/ё/g, 'е')
    .split(/[^a-zа-я0-9-]+/i)
    .filter(t => t.length >= 2 && !STOPWORDS.has(t));
}

class IntentClassifier {
  constructor(examples) {
    this.examples = examples;
    this.idf = new Map();
    this._build();
  }

  _build() {
    const tokenLists = this.examples.map(e => tokenize(e.text));
    const df = new Map();
    for (const tokens of tokenLists) {
      const unique = new Set(tokens);
      for (const t of unique) df.set(t, (df.get(t) || 0) + 1);
    }
    const N = this.examples.length;
    for (const [t, dfVal] of df) this.idf.set(t, Math.log((N + 1) / (dfVal + 1)) + 1);

    this.examples.forEach((e, i) => {
      const tokens = tokenLists[i];
      if (!tokens.length) { e.vec = new Map(); e.norm = 1; return; }
      const tf = new Map();
      for (const t of tokens) tf.set(t, (tf.get(t) || 0) + 1);
      const vec = new Map();
      let normSq = 0;
      for (const [t, f] of tf) {
        const w = (f / tokens.length) * (this.idf.get(t) || 0);
        if (w > 0) { vec.set(t, w); normSq += w * w; }
      }
      e.vec = vec;
      e.norm = Math.sqrt(normSq) || 1;
    });
  }

  _vectorize(text) {
    const tokens = tokenize(text);
    if (!tokens.length) return null;
    const tf = new Map();
    for (const t of tokens) tf.set(t, (tf.get(t) || 0) + 1);
    const vec = new Map();
    let normSq = 0;
    for (const [t, f] of tf) {
      const idf = this.idf.get(t);
      if (!idf) continue;
      const w = (f / tokens.length) * idf;
      if (w > 0) { vec.set(t, w); normSq += w * w; }
    }
    if (normSq === 0) return null;
    return { vec, norm: Math.sqrt(normSq) };
  }

  _cosine(va, na, vb, nb) {
    if (!va || !vb || !na || !nb) return 0;
    const [s, l] = va.size < vb.size ? [va, vb] : [vb, va];
    let dot = 0;
    for (const [t, w] of s) {
      const wb = l.get(t);
      if (wb) dot += w * wb;
    }
    return dot / (na * nb);
  }

  classify(text) {
    const q = this._vectorize(text);
    if (!q) return { label: null, confidence: 0, margin: 0, top: [] };
    const byLabel = new Map();
    for (const e of this.examples) {
      const sim = this._cosine(q.vec, q.norm, e.vec, e.norm);
      const cur = byLabel.get(e.label) || 0;
      if (sim > cur) byLabel.set(e.label, sim);
    }
    const ranked = [...byLabel.entries()].sort((a, b) => b[1] - a[1]);
    const [topLabel, topSim] = ranked[0] || [null, 0];
    const secondSim = ranked[1] ? ranked[1][1] : 0;
    return {
      label: topLabel,
      confidence: topSim,
      margin: topSim - secondSim,
      top: ranked.slice(0, 3).map(([l, s]) => ({ label: l, similarity: parseFloat(s.toFixed(3)) }))
    };
  }
}

function buildTrainingCorpus() {
  const examples = [];
  for (const [key, faq] of Object.entries(FAQ)) for (const ex of faq.examples) examples.push({ label: `faq:${key}`, text: ex });
  for (const [key, intent] of Object.entries(INTENTS)) for (const ex of intent.examples) examples.push({ label: `intent:${key}`, text: ex });
  for (const g of GREETINGS) examples.push({ label: 'greeting', text: g });
  for (const g of GOODBYES)  examples.push({ label: 'goodbye', text: g });
  return examples;
}

const classifier = new IntentClassifier(buildTrainingCorpus());
export const CONFIDENCE_HIGH = 0.45;
export const CONFIDENCE_LOW  = 0.25;

// ───────────────────────────────────────────────────────────────────────────
// Entity extraction
// ───────────────────────────────────────────────────────────────────────────

export function findProduct(query) {
  const variants = expandQuery(query);
  if (!variants.length) return null;

  let best = null;
  let bestScore = 0;
  for (const [key, product] of Object.entries(PRODUCTS)) {
    for (const name of product.names) {
      const normName = smartNormalize(name);
      if (!normName) continue;
      for (const variant of variants) {
        const v = (variant || '').trim();
        if (!v || v.length < 2) continue;
        let matched = false;
        if (v === normName) matched = true;
        else if (normName.length >= 3 && v.length >= 3 && (normName.includes(v) || v.includes(normName))) matched = true;
        if (matched) {
          const score = Math.min(v.length, normName.length) + (v === normName ? 10 : 0);
          if (score > bestScore) {
            bestScore = score;
            best = { key, ...product };
          }
        }
      }
    }
  }
  return best;
}

function detectEmotion(text) {
  const norm = (text || '').toLowerCase();
  for (const [emotion, words] of Object.entries(EMOTIONS)) {
    if (words.some(w => norm.includes(w))) return emotion;
  }
  return null;
}

export function labelToTitle(label) {
  if (label === 'greeting') return 'Поздороваться';
  if (label === 'goodbye')  return 'Попрощаться';
  if (label.startsWith('faq:'))    return FAQ[label.slice(4)]?.title    || label;
  if (label.startsWith('intent:')) return INTENTS[label.slice(7)]?.title || label;
  return label;
}

export function answerForLabel(label) {
  if (label === 'greeting') return { text: 'Привет! 👋 Чем могу помочь?', action: null };
  if (label === 'goodbye')  return { text: 'До встречи! 👋', action: null };
  if (label?.startsWith('faq:')) {
    const faq = FAQ[label.slice(4)];
    if (!faq) return null;
    return { text: faq.answer, action: faq.actionUrl || null, actionText: faq.actionText || null };
  }
  if (label?.startsWith('intent:')) {
    const it = INTENTS[label.slice(7)];
    if (!it) return null;
    return { text: it.answer, action: it.action || null, actionText: it.actionText || null };
  }
  return null;
}

// ───────────────────────────────────────────────────────────────────────────
// Planner (decides: answer locally vs retrieval)
// ───────────────────────────────────────────────────────────────────────────

function wantsRecommendations(text) {
  const t = (text || '').toLowerCase();
  return /(посовет|порекоменд|похож|как .*?(\b|$)|аналог|что взять|что выбрать)/i.test(t);
}

function wantsSearch(text) {
  const t = (text || '').toLowerCase();
  return /(найди|поиск|ищу|есть ли|покажи|подбери|подбор|каталог)/i.test(t);
}

/**
 * @param {string} query
 * @param {object} ctx
 * @param {string|null} ctx.lastProductKey
 * @returns {object} response plan
 */
export function planChatResponse(query, ctx = {}) {
  const text = (query || '').trim();
  if (!text) return { text: 'Напишите ваш вопрос, я постараюсь помочь!', intent: 'empty', confidence: 0 };

  const emotion = detectEmotion(text);
  let prefix = '';
  if (emotion === 'angry') prefix = 'Понимаю ваше разочарование. ';
  else if (emotion === 'urgent') prefix = 'Понял, помогаю! ';

  const product = findProduct(text);
  const cls = classifier.classify(text);

  // Retrieval intents
  if (wantsRecommendations(text)) {
    return {
      text: prefix + 'Понял. Сейчас подберу варианты…',
      intent: 'retrieval:recommend',
      confidence: Math.max(0.35, cls.confidence || 0),
      retrieval: { type: 'recommend', productKey: product?.key || ctx.lastProductKey || null, rawQuery: text }
    };
  }
  if (wantsSearch(text) && !cls.label?.startsWith('faq:')) {
    return {
      text: prefix + 'Сейчас поищу по каталогу…',
      intent: 'retrieval:search',
      confidence: Math.max(0.35, cls.confidence || 0),
      retrieval: { type: 'search', rawQuery: text }
    };
  }

  // Strong product shortcut
  const productHasPriority = product && (cls.confidence < CONFIDENCE_HIGH || text.split(/\s+/).length <= 3);
  if (productHasPriority) {
    const head = product.names[0].toUpperCase();
    return {
      text: `${prefix}🎮 **${head}**\n\n${product.info}\n\n💰 Цена: ${product.price}`,
      action: product.action,
      actionText: `Перейти к ${product.names[0]}`,
      intent: `product:${product.key}`,
      confidence: 0.9,
      entities: { productKey: product.key }
    };
  }

  // High confidence direct
  if (cls.confidence >= CONFIDENCE_HIGH) {
    const ans = answerForLabel(cls.label);
    if (ans) return { ...ans, text: prefix + ans.text, intent: cls.label, confidence: cls.confidence };
  }

  // If we detected product but the intent is weak/unclear
  if (product) {
    const head = product.names[0].toUpperCase();
    return {
      text: `${prefix}🎮 **${head}**\n\n${product.info}\n\n💰 Цена: ${product.price}\n\nХотите похожие варианты или подешевле?`,
      action: product.action,
      actionText: `Перейти к ${product.names[0]}`,
      intent: `product:${product.key}`,
      confidence: Math.max(0.5, cls.confidence || 0.5),
      entities: { productKey: product.key }
    };
  }

  // Medium confidence → disambiguation
  if (cls.confidence >= CONFIDENCE_LOW) {
    const choices = cls.top.filter(t => t.similarity >= CONFIDENCE_LOW).map(t => ({ label: t.label, title: labelToTitle(t.label) }));
    if (choices.length >= 2) {
      return { text: prefix + 'Уточните, пожалуйста, что именно вас интересует:', choices, intent: cls.label || 'unknown', confidence: cls.confidence };
    }
    const ans = answerForLabel(cls.label);
    if (ans) return { ...ans, text: prefix + ans.text, intent: cls.label, confidence: cls.confidence };
  }

  // Fallback
  return {
    text: prefix + 'Не совсем понял запрос 🤔\n\n**Я могу помочь с:**\n• Поиском товаров\n• Рекомендациями “похоже на …”\n• Оплатой, доставкой, возвратом\n• Логином Steam\n\nПопробуйте спросить иначе или напишите название товара.',
    action: '/catalog',
    actionText: 'Открыть каталог',
    intent: 'unknown',
    confidence: cls.confidence || 0
  };
}

