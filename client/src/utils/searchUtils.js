/**
 * Общий модуль умного поиска для Nova Shop.
 * Используется в Header, Chatbot и совпадает по поведению с серверным /api/ai/search.
 *
 * Умеет:
 *  - нормализовать запрос (нижний регистр, ё→е, убрать мусор)
 *  - переводить раскладку клавиатуры (если юзер печатал "dtlmvfr" в EN вместо "ведьмак")
 *  - расширять синонимами (ведьмак → witcher, киберпанк → cyberpunk, гта → gta...)
 *  - ранжировать товары по релевантности
 */

// EN-буква → RU-буква на той же физической клавише (QWERTY ↔ ЙЦУКЕН)
const EN_TO_RU = {
  q: 'й', w: 'ц', e: 'у', r: 'к', t: 'е', y: 'н', u: 'г', i: 'ш', o: 'щ', p: 'з',
  '[': 'х', ']': 'ъ', a: 'ф', s: 'ы', d: 'в', f: 'а', g: 'п', h: 'р', j: 'о',
  k: 'л', l: 'д', ';': 'ж', "'": 'э', z: 'я', x: 'ч', c: 'с', v: 'м', b: 'и',
  n: 'т', m: 'ь', ',': 'б', '.': 'ю'
};
const RU_TO_EN = Object.fromEntries(
  Object.entries(EN_TO_RU).map(([en, ru]) => [ru, en])
);

// Русские названия игр → английские ключевые слова (которые есть в БД товаров)
const GAME_ALIASES = {
  'ведьмак': ['witcher', 'wild hunt'],
  'ведьмака': ['witcher'],
  'ведьмаки': ['witcher'],
  'киберпанк': ['cyberpunk', '2077'],
  'кибер': ['cyberpunk'],
  'киберпак': ['cyberpunk'],
  'киберпук': ['cyberpunk'],
  'гта': ['gta', 'grand theft auto'],
  'гта5': ['gta', 'gta v', 'premium'],
  'гта 5': ['gta', 'gta v'],
  'грантефтавто': ['gta'],
  'редед': ['red dead', 'redemption'],
  'рдр': ['red dead', 'redemption'],
  'рдр2': ['red dead redemption 2'],
  'хогвартс': ['hogwarts', 'legacy'],
  'хогварц': ['hogwarts'],
  'гарри поттер': ['hogwarts'],
  'старфилд': ['starfield'],
  'звездное поле': ['starfield'],
  'элден': ['elden', 'ring'],
  'элденринг': ['elden ring'],
  'элденринк': ['elden'],
  'балдур': ["baldur's gate", 'baldur', 'bg3'],
  'балдурсгейт': ["baldur's gate"],
  'бг3': ["baldur's gate 3"],
  'кс': ['cs2', 'counter-strike'],
  'кс2': ['cs2'],
  'ксго': ['cs2', 'csgo'],
  'контра': ['cs2', 'counter-strike'],
  'контрстрайк': ['cs2', 'counter-strike'],
  'стим': ['steam', 'пополнение'],
  'валюта стим': ['steam'],
  'форт': ['fortnite', 'v-bucks'],
  'фортнайт': ['fortnite', 'v-bucks'],
  'вбакс': ['v-bucks', 'fortnite'],
  'вибаксы': ['v-bucks'],
  'робаксы': ['robux', 'roblox'],
  'робуксы': ['robux'],
  'роблокс': ['roblox', 'robux'],
  'геншин': ['genshin', 'кристаллы'],
  'гача': ['genshin', 'honkai'],
  'валорант': ['valorant'],
  'валик': ['valorant'],
  'дота': ['dota'],
  'дотка': ['dota'],
  'апекс': ['apex'],
  'лол': ['league of legends', 'lol', 'rp'],
  'лига': ['league of legends', 'lol'],
  'лига легенд': ['league of legends', 'lol'],
  'мобайл легендс': ['mobile legends'],
  'мл': ['mobile legends'],
  'брал': ['brawl stars'],
  'бравл': ['brawl stars'],
  'пабг': ['pubg'],
  'пубг': ['pubg'],
  'майнкрафт': ['minecraft'],
  'майн': ['minecraft'],
  'хонкай': ['honkai', 'star rail'],
  'хср': ['honkai star rail'],
  'тг старс': ['telegram stars'],
  'телеграм старс': ['telegram stars'],
  'звёзды': ['telegram stars'],
  'звезды': ['telegram stars'],
  'подписка': ['game pass', 'ea play', 'subscription'],
  'гейм пасс': ['game pass', 'xbox'],
  'геймпасс': ['game pass', 'xbox'],
  'ea': ['ea play'],
  'иа': ['ea play'],
  'иа плей': ['ea play']
};

export function normalize(text) {
  return (text || '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^a-zа-я0-9\s-']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function looksLikeEnglish(str) {
  return /^[a-z0-9\s-']+$/i.test(str) && /[a-z]/i.test(str);
}
function looksLikeRussian(str) {
  return /[а-яё]/i.test(str);
}

// Переводит строку с неправильной раскладки. Возвращает null если уверенности нет.
function translateLayout(str) {
  if (!str) return null;
  // Если в строке есть и русские, и английские буквы — не трогаем
  const hasRu = looksLikeRussian(str);
  const hasEn = /[a-z]/i.test(str);
  if (hasRu && hasEn) return null;

  if (hasEn) {
    const translated = str.split('').map(ch => EN_TO_RU[ch] || ch).join('');
    return looksLikeRussian(translated) ? translated : null;
  }
  if (hasRu) {
    const translated = str.split('').map(ch => RU_TO_EN[ch] || ch).join('');
    return looksLikeEnglish(translated) ? translated : null;
  }
  return null;
}

/**
 * Возвращает массив всех вариантов запроса: оригинал, перевод раскладки, алиасы.
 */
export function expandQuery(raw) {
  const base = normalize(raw);
  if (!base) return [];
  const variants = new Set([base]);

  // Попытка перевести раскладку целиком
  const swapped = translateLayout(base);
  if (swapped) variants.add(swapped);

  // Каждый алиас: если запрос содержит ключ — добавляем все расширения
  const poolStrings = Array.from(variants);
  for (const src of poolStrings) {
    for (const [key, values] of Object.entries(GAME_ALIASES)) {
      if (src.includes(key)) {
        values.forEach(v => variants.add(v));
      }
    }
  }

  // Дополнительно: разбитые слова
  const words = new Set();
  for (const v of variants) {
    v.split(' ').forEach(w => { if (w.length >= 2) words.add(w); });
  }
  words.forEach(w => variants.add(w));

  return Array.from(variants);
}

// ── BM25 (Okapi BM25) ─────────────────────────────────────────────────────
//
// Стандартная формула из IR-литературы:
//   score(D, Q) = Σ IDF(q) · (f(q,D)·(k1+1)) / (f(q,D) + k1·(1-b + b·|D|/avgdl))
//
// На клиенте индекс пересчитывается лениво при изменении ссылки на список
// товаров. Для 28 товаров это занимает <1 мс.

const STOPWORDS = new Set([
  'и','в','во','на','с','со','а','но','или','что','как','для','от','до','из',
  'к','у','о','об','это','этот','эта','эти','тот','та','те','же','бы','ли',
  'не','ни','по','за','при','то','уже','еще','быть','есть','был',
  'была','было','были','the','a','an','of','to','for','on','in','at','is',
  'are','with','and','or','by','from'
]);

function tokenize(text) {
  if (!text) return [];
  return String(text)
    .toLowerCase()
    .replace(/ё/g, 'е')
    .split(/[^a-zа-я0-9-]+/i)
    .filter(t => t.length >= 2 && !STOPWORDS.has(t));
}

let _indexProducts = null;
let _index = null;

function buildIndex(products) {
  const docs = [];
  const df = new Map();
  let totalLen = 0;

  for (const p of products) {
    // name × 2 — поле title весит больше (обычная IR-эвристика)
    const text = [
      p.name, p.name,
      p.category, p.genre,
      ...(p.tags || []),
      p.description
    ].filter(Boolean).join(' ');

    const tokens = tokenize(text);
    const tf = new Map();
    for (const t of tokens) tf.set(t, (tf.get(t) || 0) + 1);

    docs.push({ product: p, length: tokens.length, tf });
    totalLen += tokens.length;

    const unique = new Set(tokens);
    for (const t of unique) df.set(t, (df.get(t) || 0) + 1);
  }

  const N = docs.length;
  const idf = new Map();
  for (const [t, dfVal] of df) {
    idf.set(t, Math.log((N - dfVal + 0.5) / (dfVal + 0.5) + 1));
  }

  return { docs, idf, avgdl: N ? totalLen / N : 0, k1: 1.5, b: 0.75 };
}

function ensureIndex(products) {
  if (_indexProducts !== products || !_index) {
    _indexProducts = products;
    _index = buildIndex(products);
  }
  return _index;
}

/**
 * Умный фильтр на BM25.
 * Используется в Header и как клиентский фолбэк для Chatbot-а.
 */
export function smartFilter(products, rawQuery, limit = 10) {
  if (!rawQuery || !rawQuery.trim()) return [];
  if (!products || !products.length) return [];

  // Расширяем запрос (раскладка + алиасы), затем токенизируем все варианты.
  const variants = expandQuery(rawQuery);
  const queryTokens = new Set();
  for (const v of variants) tokenize(v).forEach(t => queryTokens.add(t));
  if (!queryTokens.size) return [];

  const { docs, idf, avgdl, k1, b } = ensureIndex(products);

  const scored = [];
  for (const doc of docs) {
    const lenNorm = (1 - b) + b * (doc.length / (avgdl || 1));
    let score = 0;
    for (const term of queryTokens) {
      const f = doc.tf.get(term);
      if (!f) continue;
      const w = idf.get(term) || 0;
      score += w * (f * (k1 + 1)) / (f + k1 * lenNorm);
    }
    if (score > 0.01) scored.push({ product: doc.product, score });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map(s => s.product);
}
