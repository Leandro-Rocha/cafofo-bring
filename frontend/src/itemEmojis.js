const EMOJI_MAP = [
  // Frutas
  { keywords: ['maçã', 'maca', 'apple'], emoji: '🍎' },
  { keywords: ['pera'], emoji: '🍐' },
  { keywords: ['laranja'], emoji: '🍊' },
  { keywords: ['limão', 'limao'], emoji: '🍋' },
  { keywords: ['banana'], emoji: '🍌' },
  { keywords: ['melancia'], emoji: '🍉' },
  { keywords: ['melão', 'melao'], emoji: '🍈' },
  { keywords: ['uva'], emoji: '🍇' },
  { keywords: ['morango'], emoji: '🍓' },
  { keywords: ['abacaxi'], emoji: '🍍' },
  { keywords: ['manga'], emoji: '🥭' },
  { keywords: ['coco'], emoji: '🥥' },
  { keywords: ['pessego', 'pêssego'], emoji: '🍑' },
  { keywords: ['cereja'], emoji: '🍒' },
  { keywords: ['kiwi'], emoji: '🥝' },
  { keywords: ['abacate'], emoji: '🥑' },
  { keywords: ['mirtilo', 'blueberry'], emoji: '🫐' },
  { keywords: ['mamao', 'mamão', 'papaya'], emoji: '🍈' },
  { keywords: ['goiaba'], emoji: '🍏' },

  // Verduras e Legumes
  { keywords: ['tomate'], emoji: '🍅' },
  { keywords: ['cenoura'], emoji: '🥕' },
  { keywords: ['brocolis', 'brócolis'], emoji: '🥦' },
  { keywords: ['alface'], emoji: '🥬' },
  { keywords: ['cebola'], emoji: '🧅' },
  { keywords: ['alho'], emoji: '🧄' },
  { keywords: ['batata'], emoji: '🥔' },
  { keywords: ['milho'], emoji: '🌽' },
  { keywords: ['pimenta'], emoji: '🌶️' },
  { keywords: ['pepino'], emoji: '🥒' },
  { keywords: ['abobrinha'], emoji: '🥒' },
  { keywords: ['beringela', 'berinjela'], emoji: '🍆' },
  { keywords: ['cogumelo', 'champignon'], emoji: '🍄' },
  { keywords: ['espinafre', 'couve', 'repolho'], emoji: '🥬' },
  { keywords: ['vagem'], emoji: '🫘' },
  { keywords: ['beterraba'], emoji: '🫚' },
  { keywords: ['mandioca', 'aipim'], emoji: '🌿' },
  { keywords: ['ervilha'], emoji: '🫛' },
  { keywords: ['aspargo'], emoji: '🌱' },

  // Laticínios
  { keywords: ['leite'], emoji: '🥛' },
  { keywords: ['queijo'], emoji: '🧀' },
  { keywords: ['manteiga'], emoji: '🧈' },
  { keywords: ['iogurte'], emoji: '🥛' },
  { keywords: ['ovo', 'ovos'], emoji: '🥚' },
  { keywords: ['creme de leite', 'nata'], emoji: '🫙' },
  { keywords: ['requeijao', 'requeijão'], emoji: '🧀' },

  // Carnes e Peixes
  { keywords: ['frango', 'galinha', 'peito', 'coxa'], emoji: '🍗' },
  { keywords: ['carne', 'picanha', 'costela', 'alcatra', 'bife', 'patinho', 'contra file', 'contrafilé'], emoji: '🥩' },
  { keywords: ['peixe', 'salmao', 'salmão', 'tilapia', 'merluza', 'bacalhau'], emoji: '🐟' },
  { keywords: ['camarao', 'camarão'], emoji: '🦐' },
  { keywords: ['linguiça', 'linguica', 'salsicha'], emoji: '🌭' },
  { keywords: ['bacon', 'presunto', 'mortadela'], emoji: '🥓' },
  { keywords: ['atum', 'sardinha'], emoji: '🐟' },
  { keywords: ['peru'], emoji: '🦃' },

  // Padaria
  { keywords: ['pao', 'pão'], emoji: '🍞' },
  { keywords: ['bolo'], emoji: '🎂' },
  { keywords: ['croissant'], emoji: '🥐' },
  { keywords: ['biscoito', 'bolacha', 'cookie'], emoji: '🍪' },
  { keywords: ['torrada'], emoji: '🍞' },
  { keywords: ['tapioca'], emoji: '🫓' },
  { keywords: ['coxinha', 'salgado'], emoji: '🥟' },

  // Bebidas
  { keywords: ['cafe', 'café'], emoji: '☕' },
  { keywords: ['cha', 'chá'], emoji: '🍵' },
  { keywords: ['suco'], emoji: '🧃' },
  { keywords: ['refrigerante', 'coca', 'pepsi', 'guarana', 'guaraná', 'sprite', 'fanta'], emoji: '🥤' },
  { keywords: ['cerveja'], emoji: '🍺' },
  { keywords: ['vinho'], emoji: '🍷' },
  { keywords: ['agua', 'água'], emoji: '💧' },
  { keywords: ['vodka', 'whisky', 'rum', 'cachaca', 'cachaça', 'whiskey'], emoji: '🥃' },
  { keywords: ['champanhe', 'espumante'], emoji: '🍾' },
  { keywords: ['leite condensado'], emoji: '🥛' },

  // Grãos, Cereais e Massas
  { keywords: ['arroz'], emoji: '🍚' },
  { keywords: ['feijao', 'feijão', 'lentilha', 'grao de bico', 'grão de bico'], emoji: '🫘' },
  { keywords: ['macarrao', 'macarrão', 'massa', 'espaguete', 'penne', 'fusilli'], emoji: '🍝' },
  { keywords: ['aveia'], emoji: '🌾' },
  { keywords: ['granola', 'cereal'], emoji: '🌾' },
  { keywords: ['farinha'], emoji: '🌾' },
  { keywords: ['acucar', 'açúcar'], emoji: '🍬' },
  { keywords: ['sal'], emoji: '🧂' },
  { keywords: ['azeite', 'oleo', 'óleo'], emoji: '🫙' },

  // Condimentos e Temperos
  { keywords: ['ketchup', 'molho de tomate'], emoji: '🍅' },
  { keywords: ['mostarda'], emoji: '🟡' },
  { keywords: ['maionese'], emoji: '🫙' },
  { keywords: ['molho shoyu', 'shoyu'], emoji: '🫙' },
  { keywords: ['mel'], emoji: '🍯' },
  { keywords: ['geleia', 'geléia'], emoji: '🫙' },
  { keywords: ['vinagre'], emoji: '🫙' },
  { keywords: ['canela', 'oregano', 'orégano', 'tempero'], emoji: '🌿' },

  // Limpeza
  { keywords: ['sabao', 'sabão', 'detergente'], emoji: '🧼' },
  { keywords: ['amaciante'], emoji: '🧺' },
  { keywords: ['desinfetante', 'multiuso', 'limpador'], emoji: '🧹' },
  { keywords: ['papel higienico', 'papel higiênico'], emoji: '🧻' },
  { keywords: ['esponja'], emoji: '🧽' },
  { keywords: ['lava'], emoji: '🫧' },

  // Higiene
  { keywords: ['shampoo'], emoji: '🧴' },
  { keywords: ['condicionador'], emoji: '🧴' },
  { keywords: ['sabonete'], emoji: '🧼' },
  { keywords: ['creme', 'hidratante', 'protetor solar'], emoji: '🧴' },
  { keywords: ['pasta de dente', 'creme dental'], emoji: '🦷' },
  { keywords: ['escova de dente'], emoji: '🪥' },
  { keywords: ['desodorante'], emoji: '🧴' },
  { keywords: ['absorvente', 'fralda'], emoji: '🩹' },
  { keywords: ['perfume'], emoji: '🌸' },
];

function normalize(str) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function detectEmoji(name) {
  if (!name?.trim()) return null;
  const n = normalize(name);

  for (const { keywords, emoji } of EMOJI_MAP) {
    for (const kw of keywords) {
      const k = normalize(kw);
      if (n.includes(k) || k.includes(n)) return emoji;
    }
  }
  return null;
}
