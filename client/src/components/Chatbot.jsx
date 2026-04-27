import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { expandQuery, normalize as smartNormalize } from '../utils/searchUtils';

/**
 * Nova Shop AI Chatbot
 *
 * Архитектура:
 *  1. Entity extraction (findProduct) — продукты ищутся по словарю алиасов
 *     с учётом раскладки и нормализации.
 *  2. Intent classification (IntentClassifier) — классификация намерений
 *     через TF-IDF + cosine similarity по корпусу размеченных примеров.
 *     Возвращает label + confidence + margin до второго класса.
 *  3. Policy: при высокой уверенности — выдаём ответ; при средней —
 *     показываем кнопки disambiguation; при низкой — fallback.
 *
 * Это даёт качественно лучший результат, чем substring-match: запросы
 * вроде "что умеешь" не активируют FAQ steamlogin (как раньше из-за слова
 * "что"), потому что IDF слова "что" близко к нулю.
 */

// ───────────────────────────────────────────────────────────────────────────
// База знаний
// ───────────────────────────────────────────────────────────────────────────

const PRODUCTS = {
  steam: {
    names: ['steam', 'стим', 'стим кошелек', 'steam wallet', 'пополнение стима', 'стимовский', 'valve', 'стим аккаунт', 'стим баланс', 'пополнить стим', 'закинуть на стим', 'деньги на стим'],
    action: '/steam-topup',
    info: 'Пополнение Steam кошелька — вводите логин и сумму, деньги поступают моментально!',
    price: 'от 100₽'
  },
  cs2: {
    names: ['cs', 'cs2', 'csgo', 'кс', 'кс2', 'ксго', 'counter-strike', 'counter strike', 'контр страйк', 'контра'],
    action: '/catalog?category=games',
    info: 'Counter-Strike 2 — популярный тактический шутер от Valve. Доступен Prime Status и скины.',
    price: 'Prime от 1199₽'
  },
  vbucks: {
    names: ['vbucks', 'v-bucks', 'вбаксы', 'в-баксы', 'вибаксы', 'fortnite', 'фортнайт', 'форт'],
    action: '/catalog?category=items',
    info: 'V-Bucks для Fortnite — покупай скины, боевой пропуск и эмоции!',
    price: 'от 500₽'
  },
  robux: {
    names: ['robux', 'робуксы', 'робаксы', 'roblox', 'роблокс', 'роблакс', 'рбх'],
    action: '/catalog?category=items',
    info: 'Robux для Roblox — покупай геймпассы, предметы и аксессуары!',
    price: 'от 400₽'
  },
  genshin: {
    names: ['genshin', 'геншин', 'genshin impact', 'примогемы', 'кристаллы genesis', 'примы'],
    action: '/catalog?category=items',
    info: 'Кристаллы Genesis для Genshin Impact — крутите баннеры и получайте персонажей!',
    price: 'от 600₽'
  },
  valorant: {
    names: ['valorant', 'валорант', 'валик', 'vp', 'valorant points', 'радианит'],
    action: '/catalog?category=items',
    info: 'Valorant Points — покупай скины оружия и боевой пропуск!',
    price: 'от 500₽'
  },
  mobilelegends: {
    names: ['mobile legends', 'мобайл легендс', 'мл', 'mlbb', 'алмазы ml'],
    action: '/catalog?category=moba',
    info: 'Алмазы для Mobile Legends — покупай героев и скины!',
    price: 'от 70₽'
  },
  dota: {
    names: ['dota', 'dota 2', 'дота', 'дотка', 'дота2'],
    action: '/catalog?category=moba',
    info: 'Dota 2 — боевые пропуски, сундуки и предметы!',
    price: 'от 300₽'
  },
  pubg: {
    names: ['pubg', 'пабг', 'пубг', 'pubg mobile', 'uc', 'unknown cash'],
    action: '/catalog?category=items',
    info: 'UC для PUBG Mobile — покупай Royal Pass и скины!',
    price: 'от 200₽'
  },
  minecraft: {
    names: ['minecraft', 'майнкрафт', 'майн', 'minecoins', 'майнкоины'],
    action: '/catalog?category=games',
    info: 'Minecraft и Minecoins — лицензия и внутриигровая валюта!',
    price: 'от 500₽'
  },
  honkai: {
    names: ['honkai', 'хонкай', 'honkai star rail', 'хонкай стар рейл', 'хср'],
    action: '/catalog?category=items',
    info: 'Кристаллы для Honkai: Star Rail — крутите варпы!',
    price: 'от 600₽'
  },
  lol: {
    names: ['lol', 'лол', 'league of legends', 'лига легенд', 'лига', 'rp', 'riot points'],
    action: '/catalog?category=moba',
    info: 'Riot Points для League of Legends — скины и чемпионы!',
    price: 'от 400₽'
  },
  apex: {
    names: ['apex', 'апекс', 'apex legends', 'apex coins'],
    action: '/catalog?category=items',
    info: 'Apex Coins — покупай скины и боевой пропуск в Apex Legends!',
    price: 'от 500₽'
  },
  brawl: {
    names: ['brawl stars', 'бравл старс', 'бравл', 'гемы'],
    action: '/catalog?category=items',
    info: 'Гемы для Brawl Stars — открывай ящики и покупай скины!',
    price: 'от 150₽'
  },
  elden: {
    names: ['elden ring', 'элден ринг', 'элден', 'эльден ринг'],
    action: '/catalog?category=games',
    info: 'Elden Ring — эпическая RPG от FromSoftware!',
    price: '2499₽'
  },
  baldur: {
    names: ['baldurs gate', 'балдурс гейт', 'балдур', 'bg3', 'бг3', "baldur's gate 3"],
    action: '/catalog?category=games',
    info: "Baldur's Gate 3 — RPG года!",
    price: '1999₽'
  },
  witcher: {
    names: ['witcher', 'the witcher', 'witcher 3', 'wild hunt', 'ведьмак', 'ведмак', 'ведьмак 3'],
    action: '/catalog?category=games',
    info: 'The Witcher 3: Wild Hunt — одна из лучших RPG всех времён!',
    price: '1599₽'
  },
  cyberpunk: {
    names: ['cyberpunk', 'cyberpunk 2077', 'киберпанк', 'кибер', '2077'],
    action: '/catalog?category=games',
    info: 'Cyberpunk 2077 — футуристическая RPG от CD Projekt Red.',
    price: '1799₽'
  },
  gta: {
    names: ['gta', 'gta v', 'gta 5', 'grand theft auto', 'гта', 'гта 5'],
    action: '/catalog?category=games',
    info: 'GTA V Premium Edition — культовая игра от Rockstar.',
    price: '1299₽'
  },
  rdr: {
    names: ['red dead redemption', 'red dead', 'rdr', 'rdr2', 'рдр', 'рдр2', 'ред дед'],
    action: '/catalog?category=games',
    info: 'Red Dead Redemption 2 — эпическая история Дикого Запада.',
    price: '1999₽'
  },
  hogwarts: {
    names: ['hogwarts', 'hogwarts legacy', 'хогвартс', 'гарри поттер'],
    action: '/catalog?category=games',
    info: 'Hogwarts Legacy — открытый мир вселенной Гарри Поттера.',
    price: '2299₽'
  },
  starfield: {
    names: ['starfield', 'старфилд', 'звёздное поле'],
    action: '/catalog?category=games',
    info: 'Starfield — космическая RPG от Bethesda.',
    price: '2999₽'
  },
  telegramstars: {
    names: ['telegram stars', 'телеграм старс', 'тг старс', 'звёзды телеграм', 'звезды'],
    action: '/catalog?category=subscription',
    info: 'Telegram Stars — внутренняя валюта Telegram.',
    price: 'от 200₽'
  },
  gamepass: {
    names: ['game pass', 'gamepass', 'геймпасс', 'xbox game pass', 'xbox pass'],
    action: '/catalog?category=subscription',
    info: 'Xbox Game Pass Ultimate — сотни игр по подписке.',
    price: '799₽'
  },
  eaplay: {
    names: ['ea play', 'ea play pro', 'eaplay'],
    action: '/catalog?category=subscription',
    info: 'EA Play Pro — библиотека игр от Electronic Arts.',
    price: '499₽'
  }
};

// FAQ — каждый вход содержит примеры формулировок (для обучения классификатора)
// и собственно ответ.
const FAQ = {
  delivery: {
    title: 'Доставка',
    examples: [
      'когда придёт заказ', 'сколько ждать доставку', 'время доставки',
      'как быстро доставка', 'сроки получения товара', 'когда получу',
      'долго ли доставка', 'быстро ли получу', 'как долго ждать',
      'когда придёт steam', 'когда придут вбаксы'
    ],
    answer: '⚡ **Доставка моментальная!**\n\n• Цифровые товары: 1-5 минут\n• Пополнение Steam: до 10 минут\n• Смена региона: до 30 минут\n\nПосле оплаты товар приходит автоматически!'
  },
  payment: {
    title: 'Оплата',
    examples: [
      'как оплатить', 'способы оплаты', 'оплата картой',
      'сбп оплата', 'юmoney оплата', 'чем платить',
      'какой картой можно платить', 'принимаете ли карты',
      'способ оплаты заказа', 'как заплатить за товар'
    ],
    answer: '💳 **Способы оплаты:**\n\n• Банковские карты (Visa, MC, МИР)\n• СБП — Система быстрых платежей\n• ЮMoney\n\nВсе платежи защищены, чек приходит на email.'
  },
  refund: {
    title: 'Возврат',
    examples: [
      'возврат денег', 'вернуть деньги за заказ', 'отменить заказ',
      'товар не пришёл', 'товар не работает', 'верните деньги',
      'возврат средств', 'хочу отменить покупку',
      'не пришла покупка', 'брак товара'
    ],
    answer: '🔄 **Гарантия возврата!**\n\nЕсли товар не работает или не пришёл — вернём деньги.\n\n📞 Напишите в поддержку с номером заказа, решим за 5-15 минут!'
  },
  safety: {
    title: 'Безопасность',
    examples: [
      'это безопасно', 'вы мошенники', 'это обман',
      'это развод', 'надёжный магазин', 'можно ли доверять',
      'легально ли это', 'не кидалово ли', 'не лохотрон ли',
      'не разводилово'
    ],
    answer: '🔒 **Nova Shop — проверенный магазин!**\n\n✅ 50,000+ успешных заказов\n✅ Гарантия на все товары\n✅ Поддержка 24/7\n✅ Реальные отзывы покупателей'
  },
  steamlogin: {
    title: 'Логин Steam',
    examples: [
      'какой у меня логин стим', 'где найти логин steam',
      'как узнать логин steam', 'что вводить в логин стим',
      'мой логин в стиме', 'как посмотреть логин steam',
      'логин steam где взять'
    ],
    answer: '🎮 **Как найти логин Steam:**\n\n1. Откройте Steam\n2. Имя → "Об аккаунте"\n3. Логин — это "Имя аккаунта"\n\n⚠️ Это НЕ email и НЕ никнейм в играх!'
  },
  promocode: {
    title: 'Промокоды',
    examples: [
      'есть ли промокод', 'дайте скидку', 'купон на скидку',
      'акции магазина', 'скидки сегодня', 'дешевле можно',
      'промо код', 'есть ли акция'
    ],
    answer: '🎁 **Промокоды и скидки:**\n\n• Раздел "Акции"\n• Подпишитесь на Telegram-канал\n• Скидки для постоянных клиентов'
  },
  support: {
    title: 'Поддержка',
    examples: [
      'связаться с поддержкой', 'как написать оператору',
      'позвонить вам', 'контакты магазина', 'нужна помощь оператора',
      'написать в поддержку', 'связь с живым человеком'
    ],
    answer: '📞 **Связаться с нами:**\n\n• Telegram: @nu_support_bot\n• Email: support@nova-shop.ru\n\nОтвечаем за 5-15 минут!',
    actionUrl: 'https://t.me/nu_support_bot',
    actionText: 'Написать в поддержку'
  },
  howto: {
    title: 'Как заказать',
    examples: [
      'как сделать заказ', 'как купить товар', 'как оформить покупку',
      'инструкция по покупке', 'процесс заказа',
      'как пользоваться сайтом', 'как заказывать у вас'
    ],
    answer: '📋 **Как сделать заказ:**\n\n1. Выберите товар в каталоге\n2. Укажите данные (логин/ID)\n3. Оплатите удобным способом\n4. Получите товар моментально!'
  },
  vpn: {
    title: 'VPN',
    examples: [
      'нужен впн', 'есть ли vpn', 'обход блокировок',
      'как обойти блокировку', 'vpn сервис', 'vpn для steam'
    ],
    answer: '🛡️ **VPN Сервис**\n\nНаш VPN-бот: @nova_union_bot\n\n✓ Обход блокировок\n✓ Высокая скорость\n✓ Поддержка 24/7',
    actionUrl: 'https://t.me/nova_union_bot',
    actionText: 'Открыть VPN бот'
  },
  capabilities: {
    title: 'Что умеешь',
    examples: [
      'что ты умеешь', 'что умеет бот', 'что ты можешь',
      'какие у тебя функции', 'твои возможности',
      'help', 'помощь по боту', 'как с тобой общаться'
    ],
    answer: '🤖 **Я могу помочь с:**\n\n• Поиском игр и товаров (CS2, Steam, V-Bucks…)\n• Доставкой, оплатой, возвратом\n• Логином Steam, промокодами\n• Связью с поддержкой\n\nПросто напишите, что вас интересует!'
  }
};

// Высокоуровневые намерения (намерения навигации)
const INTENTS = {
  catalog: {
    title: 'Открыть каталог',
    examples: [
      'открой каталог', 'покажи товары', 'весь ассортимент',
      'что есть в магазине', 'список товаров', 'все игры',
      'каталог товаров'
    ],
    action: '/catalog',
    answer: '🎮 **Открываю каталог.** Все товары: пополнение Steam, V-Bucks, Robux, кристаллы, игры, MOBA-валюта.',
    actionText: 'Открыть каталог'
  },
  buy: {
    title: 'Хочу купить',
    examples: [
      'хочу купить', 'надо купить игру', 'оформить покупку',
      'нужно заказать', 'возьму товар', 'покупка'
    ],
    action: '/catalog',
    answer: '🛒 Что хотите купить? Напишите название игры или товара (Steam, V-Bucks, CS2, Witcher…), либо откройте каталог.',
    actionText: 'Открыть каталог'
  }
};

const GREETINGS = [
  'привет', 'здравствуйте', 'hello', 'hi', 'хай', 'хей',
  'здарова', 'добрый день', 'добрый вечер', 'доброе утро', 'салют'
];
const GOODBYES = [
  'пока', 'до свидания', 'bye', 'удачи', 'всего доброго',
  'досвидос', 'до встречи'
];

const EMOTIONS = {
  angry:    ['плохо', 'отвратительно', 'ужас', 'кошмар', 'хрень', 'фигня', 'отстой', 'капец'],
  confused: ['не понимаю', 'непонятно', 'запутался', 'хз', 'сложно'],
  happy:    ['спасибо', 'круто', 'супер', 'отлично', 'класс', 'топ', 'огонь', 'благодарю'],
  urgent:   ['срочно', 'быстрее', 'скорее', 'sos', 'плз', 'пожалуйста']
};

// ───────────────────────────────────────────────────────────────────────────
// TF-IDF Intent Classifier
// ───────────────────────────────────────────────────────────────────────────

const STOPWORDS = new Set([
  'и','в','во','на','с','со','а','но','или','для','от','до','из','к','у','о','об',
  'это','этот','эта','эти','тот','та','же','бы','ли','не','ни','по','за','при','то',
  'уже','еще','быть','есть','был','была','было','были','то','я','ты','вы','мы','он',
  'она','оно','они','мне','тебе','меня','тебя','ему','ей','тут','там','вот','так',
  'нет','же','the','a','an','of','to','for','on','in','at','is','are','with','and',
  'or','by','from'
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
    // examples: [{ label, text }]
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
    for (const [t, dfVal] of df) {
      this.idf.set(t, Math.log((N + 1) / (dfVal + 1)) + 1);
    }
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
      if (!idf) continue; // out-of-vocabulary
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

    // Берём максимум по каждому label (kNN с k=1)
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

// Сборка обучающего корпуса (один раз на модуль)
function buildTrainingCorpus() {
  const examples = [];
  for (const [key, faq] of Object.entries(FAQ)) {
    for (const ex of faq.examples) examples.push({ label: `faq:${key}`, text: ex });
  }
  for (const [key, intent] of Object.entries(INTENTS)) {
    for (const ex of intent.examples) examples.push({ label: `intent:${key}`, text: ex });
  }
  for (const g of GREETINGS) examples.push({ label: 'greeting', text: g });
  for (const g of GOODBYES) examples.push({ label: 'goodbye', text: g });
  return examples;
}

const classifier = new IntentClassifier(buildTrainingCorpus());

// Пороги уверенности подобраны эмпирически на размеченных примерах:
//   ≥ 0.45 — выдаём ответ напрямую
//   ≥ 0.25 — disambiguation (3 кнопки с топ-классами)
//   <  0.25 — fallback
const CONFIDENCE_HIGH = 0.45;
const CONFIDENCE_LOW  = 0.25;

// ───────────────────────────────────────────────────────────────────────────
// Entity extraction (продукты)
// ───────────────────────────────────────────────────────────────────────────

function findProduct(query) {
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

function detectEmotion(query) {
  const norm = (query || '').toLowerCase();
  for (const [emotion, words] of Object.entries(EMOTIONS)) {
    if (words.some(w => norm.includes(w))) return emotion;
  }
  return null;
}

function labelToTitle(label) {
  if (label === 'greeting') return 'Поздороваться';
  if (label === 'goodbye')  return 'Попрощаться';
  if (label.startsWith('faq:'))    return FAQ[label.slice(4)]?.title    || label;
  if (label.startsWith('intent:')) return INTENTS[label.slice(7)]?.title || label;
  return label;
}

function answerForLabel(label) {
  if (label === 'greeting') {
    return {
      text: 'Привет! 👋 Чем могу помочь?\n\nНапишите что вас интересует — найду в каталоге или отвечу на вопрос!',
      action: null
    };
  }
  if (label === 'goodbye') {
    return { text: 'До встречи! 👋 Удачных покупок!', action: null };
  }
  if (label.startsWith('faq:')) {
    const faq = FAQ[label.slice(4)];
    if (!faq) return null;
    return { text: faq.answer, action: faq.actionUrl || null, actionText: faq.actionText || null };
  }
  if (label.startsWith('intent:')) {
    const it = INTENTS[label.slice(7)];
    if (!it) return null;
    return { text: it.answer, action: it.action || null, actionText: it.actionText || null };
  }
  return null;
}

// ───────────────────────────────────────────────────────────────────────────
// Главный диспетчер
// ───────────────────────────────────────────────────────────────────────────

function generateResponse(query) {
  const text = (query || '').trim();
  if (!text) {
    return { text: 'Напишите ваш вопрос, я постараюсь помочь! 😊', action: null };
  }

  const emotion = detectEmotion(text);
  let prefix = '';
  if (emotion === 'angry')    prefix = 'Понимаю ваше разочарование. ';
  else if (emotion === 'urgent') prefix = 'Понял, помогаю! ';

  // 1. Entity extraction — продукт (это всегда сильный сигнал)
  const product = findProduct(text);

  // 2. Intent classification
  const cls = classifier.classify(text);

  // Если уверенно нашли продукт И запрос короткий или нет уверенного intent —
  // отдаём карточку продукта.
  const productHasPriority =
    product && (cls.confidence < CONFIDENCE_HIGH || text.split(/\s+/).length <= 3);

  if (productHasPriority) {
    const head = product.names[0].toUpperCase();
    return {
      text: `${prefix}🎮 **${head}**\n\n${product.info}\n\n💰 Цена: ${product.price}`,
      action: product.action,
      actionText: `Перейти к ${product.names[0]}`
    };
  }

  // Высокая уверенность — отдаём ответ напрямую
  if (cls.confidence >= CONFIDENCE_HIGH) {
    const ans = answerForLabel(cls.label);
    if (ans) return { ...ans, text: prefix + ans.text };
  }

  // Если был продукт, но классификатор тоже сработал — отдаём intent ответ
  // только если он явно про что-то общее (доставка, оплата и т.д.) и
  // содержит слова про этот продукт. Иначе — карточка продукта.
  if (product && cls.confidence >= CONFIDENCE_HIGH) {
    const ans = answerForLabel(cls.label);
    if (ans) return { ...ans, text: prefix + ans.text };
  }
  if (product) {
    const head = product.names[0].toUpperCase();
    return {
      text: `${prefix}🎮 **${head}**\n\n${product.info}\n\n💰 Цена: ${product.price}`,
      action: product.action,
      actionText: `Перейти к ${product.names[0]}`
    };
  }

  // Средняя уверенность — disambiguation
  if (cls.confidence >= CONFIDENCE_LOW) {
    const choices = cls.top
      .filter(t => t.similarity >= CONFIDENCE_LOW)
      .map(t => ({ label: t.label, title: labelToTitle(t.label) }));
    if (choices.length >= 2) {
      return {
        text: prefix + 'Уточните, пожалуйста, что именно вас интересует:',
        choices
      };
    }
    // Один вариант на грани — всё равно отвечаем
    const ans = answerForLabel(cls.label);
    if (ans) return { ...ans, text: prefix + ans.text };
  }

  // Низкая уверенность — fallback
  return {
    text: prefix + 'Не совсем понял запрос 🤔\n\n**Я могу помочь с:**\n• Поиском игр и товаров\n• Оплатой, доставкой, возвратом\n• Логином Steam, промокодами\n\nПопробуйте переформулировать или откройте каталог.',
    action: '/catalog',
    actionText: 'Открыть каталог'
  };
}

// ───────────────────────────────────────────────────────────────────────────
// React компонент
// ───────────────────────────────────────────────────────────────────────────

function Chatbot() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      text: '👋 Привет! Я AI-помощник Nova Shop.\n\nНапишите название игры или товара, и я помогу с покупкой!\n\nПримеры: Steam, V-Bucks, Robux, CS2…',
      time: new Date(),
      action: null
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 100);
  }, [isOpen]);

  const sendQuery = (text) => {
    const userMessage = { id: Date.now(), type: 'user', text, time: new Date() };
    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);
    const delay = Math.min(400 + text.length * 15, 1500);
    setTimeout(() => {
      const response = generateResponse(text);
      const botMessage = {
        id: Date.now() + 1,
        type: 'bot',
        text: response.text,
        time: new Date(),
        action: response.action,
        actionText: response.actionText,
        choices: response.choices
      };
      setMessages(prev => [...prev, botMessage]);
      setIsTyping(false);
    }, delay);
  };

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    sendQuery(text);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleAction = (action) => {
    if (/^https?:\/\//i.test(action)) {
      window.open(action, '_blank', 'noopener,noreferrer');
      return;
    }
    setIsOpen(false);
    navigate(action);
  };

  const handleChoice = (label) => {
    const ans = answerForLabel(label);
    if (!ans) return;
    const botMessage = {
      id: Date.now(),
      type: 'bot',
      text: ans.text,
      time: new Date(),
      action: ans.action,
      actionText: ans.actionText
    };
    setMessages(prev => [...prev, botMessage]);
  };

  const quickActions = [
    { text: '💳 Пополнить Steam', query: 'пополнить стим' },
    { text: '🎮 Каталог',          query: 'открой каталог' },
    { text: '💰 Оплата',           query: 'способы оплаты' },
    { text: '❓ Как заказать',     query: 'как сделать заказ' }
  ];

  const formatTime = (date) =>
    date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

  const formatText = (text) =>
    text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>');

  return (
    <>
      <button
        className={`chatbot-toggle ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Открыть чат"
      >
        {isOpen ? '✕' : '💬'}
        {!isOpen && <span className="chatbot-badge">AI</span>}
      </button>

      {isOpen && (
        <div className="chatbot-window">
          <div className="chatbot-header">
            <div className="chatbot-header-info">
              <div className="chatbot-avatar">🤖</div>
              <div>
                <h3>Nova AI Помощник</h3>
                <span className="chatbot-status">
                  <span className="status-dot"></span>
                  Онлайн
                </span>
              </div>
            </div>
            <button className="chatbot-close" onClick={() => setIsOpen(false)}>✕</button>
          </div>

          <div className="chatbot-messages">
            {messages.map((msg) => (
              <div key={msg.id} className={`chatbot-message ${msg.type}`}>
                {msg.type === 'bot' && <div className="message-avatar">🤖</div>}
                <div className="message-content">
                  <div
                    className="message-text"
                    dangerouslySetInnerHTML={{ __html: formatText(msg.text) }}
                  />
                  {msg.choices && msg.choices.length > 0 && (
                    <div className="message-choices">
                      {msg.choices.map(c => (
                        <button
                          key={c.label}
                          className="message-choice-btn"
                          onClick={() => handleChoice(c.label)}
                        >
                          {c.title}
                        </button>
                      ))}
                    </div>
                  )}
                  {msg.action && (
                    <button
                      className="message-action-btn"
                      onClick={() => handleAction(msg.action)}
                    >
                      {msg.actionText || 'Перейти'} →
                    </button>
                  )}
                  <span className="message-time">{formatTime(msg.time)}</span>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="chatbot-message bot">
                <div className="message-avatar">🤖</div>
                <div className="message-content">
                  <div className="typing-indicator">
                    <span></span><span></span><span></span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {messages.length <= 2 && (
            <div className="chatbot-quick-actions">
              {quickActions.map((action, idx) => (
                <button
                  key={idx}
                  onClick={() => sendQuery(action.query)}
                  className="quick-action-btn"
                >
                  {action.text}
                </button>
              ))}
            </div>
          )}

          <div className="chatbot-input-area">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Напишите сообщение..."
              rows="1"
            />
            <button
              className="chatbot-send"
              onClick={handleSend}
              disabled={!input.trim()}
            >
              ➤
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default Chatbot;
