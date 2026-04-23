import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Умный AI чат-бот Nova Shop
 * Глубокое понимание 
 * контекста, намерений, любых вариаций написания
 */

// Расширенная база знаний
const KNOWLEDGE_BASE = {
  // Все товары с максимум вариаций написания
  products: {
    steam: {
      id: 'steam-topup',
      names: ['steam', 'стим', 'стим кошелек', 'steam wallet', 'пополнение стима', 'стимовский', 'valve', 'стим аккаунт', 'стим баланс', 'пополнить стим', 'закинуть на стим', 'деньги на стим', 'steam balance'],
      category: 'steam',
      action: '/steam-topup',
      info: 'Пополнение Steam кошелька - вводите логин и сумму, деньги поступают моментально!',
      price: 'от 100₽'
    },
    cs2: {
      id: 'cs2',
      names: ['cs', 'cs2', 'cs 2', 'csgo', 'cs go', 'кс', 'кс2', 'кс 2', 'ксго', 'кс го', 'counter-strike', 'counter strike', 'контр страйк', 'контра', 'контр-страйк', 'counter', 'страйк'],
      category: 'games',
      action: '/catalog?category=games',
      info: 'Counter-Strike 2 - популярный тактический шутер от Valve. Доступен Prime Status и скины.',
      price: 'Prime от 1199₽'
    },
    vbucks: {
      id: 'vbucks',
      names: ['vbucks', 'v-bucks', 'вбаксы', 'в-баксы', 'вибаксы', 'fortnite', 'фортнайт', 'фортнаит', 'форт', 'фортнайт валюта', 'баксы фортнайт', 'fortnite vbucks'],
      category: 'items',
      action: '/catalog?category=items',
      info: 'V-Bucks для Fortnite - покупай скины, боевой пропуск и эмоции!',
      price: 'от 500₽'
    },
    robux: {
      id: 'robux',
      names: ['robux', 'робуксы', 'робаксы', 'roblox', 'роблокс', 'роблакс', 'рбх', 'rbx', 'робукс', 'робаксы роблокс'],
      category: 'items',
      action: '/catalog?category=items',
      info: 'Robux для Roblox - покупай геймпассы, предметы и аксессуары!',
      price: 'от 400₽'
    },
    genshin: {
      id: 'genshin',
      names: ['genshin', 'геншин', 'гэншин', 'genshin impact', 'примогемы', 'кристаллы genesis', 'генезис кристаллы', 'примы', 'примки', 'геншин импакт'],
      category: 'items',
      action: '/catalog?category=items',
      info: 'Кристаллы Genesis для Genshin Impact - крутите баннеры и получайте персонажей!',
      price: 'от 600₽'
    },
    valorant: {
      id: 'valorant',
      names: ['valorant', 'валорант', 'валик', 'vp', 'valorant points', 'валорант поинтс', 'радианит', 'radianite'],
      category: 'items',
      action: '/catalog?category=items',
      info: 'Valorant Points - покупай скины оружия и боевой пропуск!',
      price: 'от 500₽'
    },
    mobilelegends: {
      id: 'ml',
      names: ['mobile legends', 'мобайл легендс', 'ml', 'мл', 'mlbb', 'алмазы ml', 'мобайл легендс алмазы', 'mobile legends diamonds'],
      category: 'moba',
      action: '/catalog?category=moba',
      info: 'Алмазы для Mobile Legends - покупай героев и скины!',
      price: 'от 70₽'
    },
    dota: {
      id: 'dota',
      names: ['dota', 'dota 2', 'дота', 'дотка', 'дота2', 'дота 2', 'доту', 'дотан', 'dota2'],
      category: 'moba',
      action: '/catalog?category=moba',
      info: 'Dota 2 - боевые пропуски, сундуки и предметы!',
      price: 'от 300₽'
    },
    pubg: {
      id: 'pubg',
      names: ['pubg', 'пабг', 'пубг', 'pubg mobile', 'пабг мобайл', 'uc', 'юс', 'unknown cash'],
      category: 'items',
      action: '/catalog?category=items',
      info: 'UC для PUBG Mobile - покупай Royal Pass и скины!',
      price: 'от 200₽'
    },
    minecraft: {
      id: 'minecraft',
      names: ['minecraft', 'майнкрафт', 'майн', 'майнер', 'mc', 'minecoins', 'майнкоины'],
      category: 'games',
      action: '/catalog?category=games',
      info: 'Minecraft и Minecoins - лицензия и внутриигровая валюта!',
      price: 'от 500₽'
    },
    honkai: {
      id: 'honkai',
      names: ['honkai', 'хонкай', 'honkai star rail', 'хонкай стар рейл', 'hsr', 'хср', 'звездный экспресс'],
      category: 'items',
      action: '/catalog?category=items',
      info: 'Кристаллы для Honkai: Star Rail - крутите варпы!',
      price: 'от 600₽'
    },
    lol: {
      id: 'lol',
      names: ['lol', 'лол', 'league of legends', 'лига легенд', 'лига', 'rp', 'рп', 'riot points'],
      category: 'moba',
      action: '/catalog?category=moba',
      info: 'Riot Points для League of Legends - скины и чемпионы!',
      price: 'от 400₽'
    },
    apex: {
      id: 'apex',
      names: ['apex', 'апекс', 'apex legends', 'апекс легендс', 'apex coins'],
      category: 'items',
      action: '/catalog?category=items',
      info: 'Apex Coins - покупай скины и боевой пропуск в Apex Legends!',
      price: 'от 500₽'
    },
    brawl: {
      id: 'brawl',
      names: ['brawl stars', 'бравл старс', 'бравл', 'bs', 'бс', 'гемы', 'gems brawl'],
      category: 'items',
      action: '/catalog?category=items',
      info: 'Гемы для Brawl Stars - открывай ящики и покупай скины!',
      price: 'от 150₽'
    },
    elden: {
      id: 'elden',
      names: ['elden ring', 'элден ринг', 'элден', 'elden', 'эльден ринг'],
      category: 'games',
      action: '/catalog?category=games',
      info: 'Elden Ring - эпическая RPG от FromSoftware!',
      price: '2499₽'
    },
    baldur: {
      id: 'baldur',
      names: ['baldurs gate', 'baldur', 'балдурс гейт', 'балдур', 'bg3', 'бг3', "baldur's gate 3", 'baldurs gate 3'],
      category: 'games',
      action: '/catalog?category=games',
      info: "Baldur's Gate 3 - потрясающая RPG года!",
      price: '1999₽'
    }
  },
  
  // Понимание намерений
  intents: {
    buy: ['купить', 'заказать', 'хочу', 'надо', 'нужно', 'дай', 'дайте', 'беру', 'возьму', 'приобрести', 'оформить', 'заказ', 'покупка', 'buy', 'order', 'get'],
    price: ['цена', 'сколько стоит', 'стоимость', 'почем', 'прайс', 'price', 'cost', 'сколько', 'дорого', 'дешево'],
    info: ['что такое', 'что это', 'как работает', 'расскажи', 'объясни', 'инфо', 'информация', 'подробнее', 'info', 'what is'],
    help: ['помощь', 'помоги', 'help', 'не понимаю', 'как', 'подскажи', 'подскажите'],
    catalog: ['каталог', 'товары', 'ассортимент', 'что есть', 'что продаете', 'список', 'catalog', 'products'],
    navigate: ['перейти', 'открой', 'покажи', 'где', 'найти', 'найди']
  },

  // FAQ
  faq: {
    delivery: {
      triggers: ['доставка', 'когда придет', 'сколько ждать', 'время доставки', 'как быстро', 'сроки', 'получу', 'когда получу', 'долго', 'быстро ли'],
      answer: '⚡ **Доставка моментальная!**\n\n• Цифровые товары: 1-5 минут\n• Пополнение Steam: до 10 минут\n• Смена региона: до 30 минут (нужен оператор)\n\nПосле оплаты товар приходит автоматически!'
    },
    payment: {
      triggers: ['оплата', 'как оплатить', 'способы оплаты', 'карта', 'сбп', 'qiwi', 'юмани', 'оплачивать', 'чем платить', 'какой картой'],
      answer: '💳 **Способы оплаты:**\n\n• Банковские карты (Visa, MC, МИР)\n• СБП - Система быстрых платежей\n• ЮMoney\n\nВсе платежи защищены! Чек приходит на email.'
    },
    refund: {
      triggers: ['возврат', 'вернуть деньги', 'отменить', 'не работает', 'проблема', 'ошибка', 'брак', 'верните', 'не пришло'],
      answer: '🔄 **Гарантия возврата!**\n\nЕсли товар не работает или не пришёл - вернём деньги.\n\n📞 Напишите в поддержку с номером заказа, решим за 5-15 минут!'
    },
    safety: {
      triggers: ['безопасно', 'мошенники', 'обман', 'развод', 'надежно', 'можно доверять', 'легально', 'кидалово', 'лохотрон'],
      answer: '🔒 **Nova Shop - проверенный магазин!**\n\n✅ Работаем с 2024 года\n✅ 50,000+ успешных заказов\n✅ Гарантия на все товары\n✅ Поддержка 24/7\n✅ Отзывы реальных покупателей'
    },
    steamlogin: {
      triggers: ['какой логин', 'где логин', 'steam логин', 'логин стим', 'как узнать логин', 'что вводить', 'свой логин'],
      answer: '🎮 **Как найти логин Steam:**\n\n1. Откройте Steam\n2. Нажмите своё имя → "Об аккаунте"\n3. Логин указан в строке "Имя аккаунта"\n\n⚠️ Это НЕ email и НЕ никнейм в играх!'
    },
    promocode: {
      triggers: ['промокод', 'скидка', 'купон', 'акция', 'скидки', 'дешевле', 'промо'],
      answer: '🎁 **Промокоды и скидки:**\n\n• Следите за разделом "Акции"\n• Подпишитесь на Telegram-канал\n• Скидки для постоянных клиентов\n\nВведите промокод при оформлении заказа!'
    },
    support: {
      triggers: ['поддержка', 'оператор', 'человек', 'связаться', 'написать', 'позвонить', 'контакты', 'телефон', 'живой'],
      answer: '📞 **Связаться с нами:**\n\n• Telegram: @NovaShopSupport\n• На сайте: раздел "Поддержка"\n\nОтвечаем быстро, обычно за 5-15 минут!'
    },
    howto: {
      triggers: ['как заказать', 'как купить', 'как оформить', 'как это работает', 'инструкция', 'как пользоваться'],
      answer: '📋 **Как сделать заказ:**\n\n1. Выберите товар в каталоге\n2. Укажите данные (логин/ID)\n3. Оплатите удобным способом\n4. Получите товар моментально!\n\nВсё просто! 🎮'
    }
  },

  // Эмоции для персонализации
  emotions: {
    angry: ['плохо', 'отвратительно', 'ужас', 'кошмар', 'бред', 'хрень', 'чё за', 'фигня', 'пипец', 'капец', 'отстой'],
    confused: ['не понимаю', 'что это', 'как это', 'хз', 'непонятно', 'запутался', 'сложно', '???', 'а?', 'чё'],
    happy: ['спасибо', 'круто', 'супер', 'отлично', 'класс', 'топ', 'огонь', 'респект', 'благодарю', 'молодцы'],
    urgent: ['срочно', 'быстрее', 'скорее', 'важно', 'помогите', 'sos', 'аааа', 'плз', 'пожалуйста', 'очень надо']
  },

  // Приветствия
  greetings: ['привет', 'здравствуй', 'hello', 'hi', 'хай', 'хей', 'yo', 'здарова', 'ку', 'добрый день', 'добрый вечер', 'доброе утро', 'здрасте', 'приветствую', 'салют'],
  
  // Прощания
  goodbyes: ['пока', 'до свидания', 'bye', 'удачи', 'всего доброго', 'бб', 'bb', 'досвидос', 'до встречи', 'прощай']
};

// Нормализация текста
function normalize(text) {
  return text
    .toLowerCase()
    .replace(/[ё]/g, 'е')
    .replace(/[^a-zа-яё0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Токенизация
function tokenize(text) {
  return normalize(text).split(' ').filter(t => t.length > 0);
}

// Проверка совпадения с учётом опечаток
function fuzzyMatch(input, target) {
  const normInput = normalize(input);
  const normTarget = normalize(target);
  
  // Точное совпадение
  if (normInput.includes(normTarget) || normTarget.includes(normInput)) {
    return true;
  }
  
  // Проверка каждого слова
  const inputTokens = tokenize(input);
  const targetTokens = tokenize(target);
  
  for (const inputToken of inputTokens) {
    for (const targetToken of targetTokens) {
      if (inputToken === targetToken) return true;
      if (inputToken.length > 2 && targetToken.includes(inputToken)) return true;
      if (targetToken.length > 2 && inputToken.includes(targetToken)) return true;
      
      // Левенштейн для коротких слов
      if (inputToken.length > 3 && targetToken.length > 3) {
        const distance = levenshtein(inputToken, targetToken);
        if (distance <= Math.floor(Math.min(inputToken.length, targetToken.length) / 3)) {
          return true;
        }
      }
    }
  }
  
  return false;
}

// Расстояние Левенштейна
function levenshtein(a, b) {
  const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));
  
  for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= b.length; j++) matrix[j][0] = j;
  
  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + cost
      );
    }
  }
  
  return matrix[b.length][a.length];
}

// Поиск продукта
function findProduct(query) {
  const normalized = normalize(query);
  let bestMatch = null;
  let bestScore = 0;
  
  for (const [key, product] of Object.entries(KNOWLEDGE_BASE.products)) {
    for (const name of product.names) {
      if (fuzzyMatch(normalized, name)) {
        const score = name.length;
        if (score > bestScore) {
          bestScore = score;
          bestMatch = { key, ...product };
        }
      }
    }
  }
  
  return bestMatch;
}

// Поиск намерения
function findIntent(query) {
  const normalized = normalize(query);
  
  for (const [intent, triggers] of Object.entries(KNOWLEDGE_BASE.intents)) {
    for (const trigger of triggers) {
      if (normalized.includes(trigger)) {
        return intent;
      }
    }
  }
  
  return null;
}

// Поиск FAQ
function findFAQ(query) {
  const normalized = normalize(query);
  
  for (const [key, faq] of Object.entries(KNOWLEDGE_BASE.faq)) {
    for (const trigger of faq.triggers) {
      if (fuzzyMatch(normalized, trigger)) {
        return faq.answer;
      }
    }
  }
  
  return null;
}

// Определение эмоции
function detectEmotion(query) {
  const normalized = normalize(query);
  
  for (const [emotion, patterns] of Object.entries(KNOWLEDGE_BASE.emotions)) {
    for (const pattern of patterns) {
      if (normalized.includes(pattern)) {
        return emotion;
      }
    }
  }
  
  return null;
}

// Проверка приветствия
function isGreeting(query) {
  return KNOWLEDGE_BASE.greetings.some(g => fuzzyMatch(query, g));
}

// Проверка прощания
function isGoodbye(query) {
  return KNOWLEDGE_BASE.goodbyes.some(g => fuzzyMatch(query, g));
}

// Случайный элемент
function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Генерация ответа
function generateResponse(query, context = [], navigate) {
  const normalized = normalize(query);
  
  if (!normalized || normalized.length < 1) {
    return { text: 'Напишите ваш вопрос, я постараюсь помочь! 😊', action: null };
  }

  // Приветствие
  if (isGreeting(query)) {
    return { 
      text: randomChoice([
        'Привет! 👋 Чем могу помочь?\n\nНапишите что вас интересует — найду в каталоге или отвечу на вопрос!',
        'Здравствуйте! 🎮 Готов помочь! Что ищете?',
        'Привет! Задайте любой вопрос или напишите что хотите найти.'
      ]), 
      action: null 
    };
  }

  // Прощание
  if (isGoodbye(query)) {
    return { 
      text: randomChoice([
        'До встречи! 👋 Удачных покупок!',
        'Пока! Возвращайтесь! 🎮',
        'Всего хорошего! Будут вопросы - пишите!'
      ]), 
      action: null 
    };
  }

  // Благодарность
  const emotion = detectEmotion(query);
  if (emotion === 'happy' && normalized.length < 20) {
    return { 
      text: randomChoice([
        'Рад помочь! 😊 Если будут ещё вопросы - пишите!',
        'Обращайтесь! Удачных покупок! 🎮',
        'Всегда пожалуйста! 👍'
      ]), 
      action: null 
    };
  }

  // Эмоциональный префикс
  let prefix = '';
  if (emotion === 'angry') {
    prefix = 'Понимаю ваше разочарование! ';
  } else if (emotion === 'confused') {
    prefix = 'Сейчас всё объясню! ';
  } else if (emotion === 'urgent') {
    prefix = 'Понял, помогаю! ';
  }

  // FAQ - проверяем первым
  const faqAnswer = findFAQ(query);
  if (faqAnswer) {
    return { text: prefix + faqAnswer, action: null };
  }

  // Поиск продукта
  const product = findProduct(query);
  const intent = findIntent(query);

  // Если нашли продукт
  if (product) {
    let response = `🎮 **${product.names[0].toUpperCase()}**\n\n${product.info}\n\n💰 Цена: ${product.price}`;
    return { 
      text: prefix + response, 
      action: product.action, 
      actionText: `Перейти к ${product.names[0]}` 
    };
  }

  // Общие вопросы о каталоге
  if (intent === 'catalog' || normalized.includes('что есть') || normalized.includes('что продаете') || normalized.includes('ассортимент')) {
    return {
      text: '🎮 **Наш каталог:**\n\n• 💳 Пополнение Steam\n• 🎯 V-Bucks (Fortnite)\n• 🎪 Robux (Roblox)\n• 💎 Кристаллы Genshin\n• 🎮 Игры и ключи\n• ⚔️ Валюта для MOBA\n\nЧто вас интересует?',
      action: '/catalog',
      actionText: 'Открыть каталог'
    };
  }

  // Если есть намерение купить
  if (intent === 'buy') {
    return {
      text: '🛒 Что хотите купить?\n\nНапишите название игры или товара, например:\n• Steam\n• V-Bucks\n• Robux\n• CS2',
      action: '/catalog',
      actionText: 'Открыть каталог'
    };
  }

  // Вопросы о поддержке
  if (normalized.includes('поддержк') || normalized.includes('помощ') || normalized.includes('проблем') || normalized.includes('не работ')) {
    return {
      text: '📞 **Нужна помощь?**\n\nСвяжитесь с нашей поддержкой:\n\n📱 Telegram: @nu_support_bot\n✉️ Email: support@nova-shop.ru\n\nОтвечаем быстро!',
      action: 'https://t.me/nu_support_bot',
      actionText: 'Написать в поддержку'
    };
  }

  // Вопросы о VPN
  if (normalized.includes('vpn') || normalized.includes('впн') || normalized.includes('блокировк') || normalized.includes('обход')) {
    return {
      text: '🛡️ **VPN Сервис**\n\nНаш VPN бот: @nova_union_bot\n\n✓ Обход блокировок\n✓ Высокая скорость\n✓ Поддержка 24/7',
      action: 'https://t.me/nova_union_bot',
      actionText: 'Открыть VPN бот'
    };
  }

  // Если ничего не найдено - умные подсказки
  const suggestions = [];
  const tokens = tokenize(query);
  
  for (const token of tokens) {
    if (token.length >= 2) {
      for (const [key, product] of Object.entries(KNOWLEDGE_BASE.products)) {
        for (const name of product.names) {
          if (name.includes(token) || token.includes(name.substring(0, 3))) {
            if (!suggestions.find(s => s.key === key)) {
              suggestions.push({ key, name: product.names[0] });
            }
          }
        }
      }
    }
  }

  if (suggestions.length > 0) {
    const suggestionText = suggestions.slice(0, 3).map(s => `• ${s.name}`).join('\n');
    return {
      text: `🤔 Возможно вы имели в виду:\n\n${suggestionText}\n\nУточните запрос или выберите из списка!`,
      action: '/catalog',
      actionText: 'Посмотреть каталог'
    };
  }

  // Универсальный fallback
  return {
    text: prefix + `Не совсем понял запрос 🤔\n\n**Я могу помочь с:**\n• Поиском игр и товаров\n• Вопросами об оплате и доставке\n• Информацией о магазине\n\nПопробуйте переформулировать или откройте каталог:`,
    action: '/catalog',
    actionText: 'Открыть каталог'
  };
}

function Chatbot() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      text: '👋 Привет! Я AI-помощник Nova Shop.\n\nНапишите название игры или товара, и я помогу с покупкой!\n\nПримеры: Steam, V-Bucks, Robux, CS2...',
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
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      text,
      time: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    const delay = Math.min(400 + text.length * 15, 1500);
    setTimeout(() => {
      const response = generateResponse(text, messages, navigate);
      const botMessage = {
        id: Date.now() + 1,
        type: 'bot',
        text: response.text,
        time: new Date(),
        action: response.action,
        actionText: response.actionText
      };
      setMessages(prev => [...prev, botMessage]);
      setIsTyping(false);
    }, delay);
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

  const quickActions = [
    { text: '💳 Пополнить Steam', query: 'пополнить стим' },
    { text: '🎮 Каталог', query: 'каталог товаров' },
    { text: '💰 Оплата', query: 'способы оплаты' },
    { text: '❓ Помощь', query: 'как заказать' }
  ];

  const handleQuickAction = (query) => {
    setInput(query);
    setTimeout(() => {
      const userMessage = {
        id: Date.now(),
        type: 'user',
        text: query,
        time: new Date()
      };
      setMessages(prev => [...prev, userMessage]);
      setInput('');
      setIsTyping(true);

      setTimeout(() => {
        const response = generateResponse(query, messages, navigate);
        const botMessage = {
          id: Date.now() + 1,
          type: 'bot',
          text: response.text,
          time: new Date(),
          action: response.action,
          actionText: response.actionText
        };
        setMessages(prev => [...prev, botMessage]);
        setIsTyping(false);
      }, 600);
    }, 50);
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  };

  const formatText = (text) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br/>');
  };

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
                    <span></span>
                    <span></span>
                    <span></span>
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
                  onClick={() => handleQuickAction(action.query)}
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
