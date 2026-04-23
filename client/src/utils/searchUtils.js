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

/**
 * Умный фильтр: возвращает товары отсортированные по релевантности.
 * Используется Header-ом и как клиентский fallback для Chatbot-а.
 */
export function smartFilter(products, rawQuery, limit = 10) {
  if (!rawQuery || !rawQuery.trim()) return [];
  const terms = expandQuery(rawQuery);
  if (!terms.length) return [];

  const scored = [];
  for (const p of products) {
    const haystack = normalize(
      `${p.name} ${p.category || ''} ${p.genre || ''} ${(p.tags || []).join(' ')} ${p.description || ''}`
    );
    let score = 0;
    for (const term of terms) {
      if (!term) continue;
      if (haystack.includes(term)) {
        // Длинные термины веские, короткие — немного
        score += term.length >= 4 ? 20 : term.length >= 3 ? 10 : 3;
        // Бонус если термин в названии
        if (normalize(p.name).includes(term)) score += 10;
      }
    }
    // Маленький бонус за рейтинг, чтобы при равных score вверху было качественное
    if (score > 0) {
      score += (p.rating || 4) * 0.5;
      scored.push({ product: p, score });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map(s => s.product);
}
