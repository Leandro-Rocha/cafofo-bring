const EMOJI_MAP = [
  { keywords: ['maca', 'apple'], emoji: '🍎' },
  { keywords: ['pera'], emoji: '🍐' },
  { keywords: ['laranja'], emoji: '🍊' },
  { keywords: ['limao'], emoji: '🍋' },
  { keywords: ['banana'], emoji: '🍌' },
  { keywords: ['melancia'], emoji: '🍉' },
  { keywords: ['melao'], emoji: '🍈' },
  { keywords: ['uva'], emoji: '🍇' },
  { keywords: ['morango'], emoji: '🍓' },
  { keywords: ['abacaxi'], emoji: '🍍' },
  { keywords: ['manga'], emoji: '🥭' },
  { keywords: ['coco'], emoji: '🥥' },
  { keywords: ['pessego'], emoji: '🍑' },
  { keywords: ['cereja'], emoji: '🍒' },
  { keywords: ['kiwi'], emoji: '🥝' },
  { keywords: ['abacate'], emoji: '🥑' },
  { keywords: ['mirtilo', 'blueberry'], emoji: '🫐' },
  { keywords: ['mamao', 'papaya'], emoji: '🍈' },
  { keywords: ['tomate'], emoji: '🍅' },
  { keywords: ['cenoura'], emoji: '🥕' },
  { keywords: ['brocolis'], emoji: '🥦' },
  { keywords: ['alface'], emoji: '🥬' },
  { keywords: ['cebola'], emoji: '🧅' },
  { keywords: ['alho'], emoji: '🧄' },
  { keywords: ['batata'], emoji: '🥔' },
  { keywords: ['milho'], emoji: '🌽' },
  { keywords: ['pimenta'], emoji: '🌶️' },
  { keywords: ['pepino', 'abobrinha'], emoji: '🥒' },
  { keywords: ['berinjela', 'beringela'], emoji: '🍆' },
  { keywords: ['cogumelo', 'champignon'], emoji: '🍄' },
  { keywords: ['espinafre', 'couve', 'repolho'], emoji: '🥬' },
  { keywords: ['vagem', 'feijao', 'feijão', 'lentilha'], emoji: '🫘' },
  { keywords: ['leite'], emoji: '🥛' },
  { keywords: ['queijo', 'requeijao'], emoji: '🧀' },
  { keywords: ['manteiga'], emoji: '🧈' },
  { keywords: ['iogurte'], emoji: '🥛' },
  { keywords: ['ovo', 'ovos'], emoji: '🥚' },
  { keywords: ['frango', 'galinha', 'peito', 'coxa'], emoji: '🍗' },
  { keywords: ['carne', 'picanha', 'costela', 'alcatra', 'bife'], emoji: '🥩' },
  { keywords: ['peixe', 'salmao', 'tilapia', 'atum', 'sardinha', 'bacalhau'], emoji: '🐟' },
  { keywords: ['camarao'], emoji: '🦐' },
  { keywords: ['linguica', 'salsicha'], emoji: '🌭' },
  { keywords: ['bacon', 'presunto', 'mortadela'], emoji: '🥓' },
  { keywords: ['pao', 'bread'], emoji: '🍞' },
  { keywords: ['bolo'], emoji: '🎂' },
  { keywords: ['biscoito', 'bolacha', 'cookie'], emoji: '🍪' },
  { keywords: ['cafe'], emoji: '☕' },
  { keywords: ['cha'], emoji: '🍵' },
  { keywords: ['suco'], emoji: '🧃' },
  { keywords: ['refrigerante', 'coca', 'pepsi', 'guarana', 'sprite', 'fanta'], emoji: '🥤' },
  { keywords: ['cerveja'], emoji: '🍺' },
  { keywords: ['vinho'], emoji: '🍷' },
  { keywords: ['agua'], emoji: '💧' },
  { keywords: ['vodka', 'whisky', 'rum', 'cachaca', 'whiskey'], emoji: '🥃' },
  { keywords: ['arroz'], emoji: '🍚' },
  { keywords: ['macarrao', 'massa', 'espaguete'], emoji: '🍝' },
  { keywords: ['aveia', 'granola', 'cereal'], emoji: '🌾' },
  { keywords: ['farinha'], emoji: '🌾' },
  { keywords: ['acucar'], emoji: '🍬' },
  { keywords: ['sal'], emoji: '🧂' },
  { keywords: ['azeite', 'oleo'], emoji: '🫙' },
  { keywords: ['mel'], emoji: '🍯' },
  { keywords: ['sabao', 'detergente'], emoji: '🧼' },
  { keywords: ['papel higienico'], emoji: '🧻' },
  { keywords: ['shampoo', 'condicionador', 'desodorante', 'hidratante'], emoji: '🧴' },
  { keywords: ['sabonete'], emoji: '🧼' },
  { keywords: ['pasta de dente', 'creme dental'], emoji: '🦷' },
];

function normalize(str) {
  return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function detectEmoji(name) {
  if (!name) return null;
  const n = normalize(name);
  for (const { keywords, emoji } of EMOJI_MAP) {
    for (const kw of keywords) {
      const k = normalize(kw);
      if (n.includes(k) || k.includes(n)) return emoji;
    }
  }
  return null;
}

module.exports = { detectEmoji };
