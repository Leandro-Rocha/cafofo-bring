const db = require('../db');

let io;

function speech(text) {
  return {
    version: '1.0',
    response: {
      outputSpeech: { type: 'PlainText', text },
      shouldEndSession: true,
    },
  };
}

function ask(text, reprompt) {
  return {
    version: '1.0',
    response: {
      outputSpeech: { type: 'PlainText', text },
      reprompt: { outputSpeech: { type: 'PlainText', text: reprompt } },
      shouldEndSession: false,
    },
  };
}

function handle(body) {
  const reqType = body?.request?.type;
  const intentName = body?.request?.intent?.name;
  const slots = body?.request?.intent?.slots || {};

  console.log(`[alexa] type=${reqType} intent=${intentName}`);

  if (reqType === 'LaunchRequest') {
    const { n } = db.prepare('SELECT count(*) as n FROM items WHERE purchased = 0').get();
    const msg = n > 0
      ? `Lista aberta. Você tem ${n} ${n === 1 ? 'item' : 'itens'} pendente${n === 1 ? '' : 's'}.`
      : 'Lista aberta. A lista está vazia.';
    return ask(msg, 'Posso adicionar ou remover itens.');
  }

  if (reqType === 'SessionEndedRequest') {
    return { version: '1.0', response: {} };
  }

  if (reqType === 'IntentRequest') {
    if (intentName === 'AddItemIntent') {
      const item = slots?.item?.value;
      if (!item) return ask('Qual item você quer adicionar?', 'Diga o nome do item.');

      const capitalized = item.charAt(0).toUpperCase() + item.slice(1);
      const result = db.prepare(
        'INSERT INTO items (name, category, quantity) VALUES (?, ?, ?)'
      ).run(capitalized, 'Outros', null);

      const newItem = db.prepare('SELECT * FROM items WHERE id = ?').get(result.lastInsertRowid);
      io?.emit('item:added', newItem);

      return speech(`${item} adicionado à lista.`);
    }

    if (intentName === 'RemoveItemIntent') {
      const item = slots?.item?.value;
      if (!item) return ask('Qual item você quer remover?', 'Diga o nome do item.');

      const found = db.prepare(
        'SELECT * FROM items WHERE purchased = 0 AND lower(name) LIKE lower(?)'
      ).get(`%${item}%`);

      if (!found) return speech(`Não encontrei ${item} na lista.`);

      db.prepare('DELETE FROM items WHERE id = ?').run(found.id);
      io?.emit('item:deleted', { id: found.id });

      return speech(`${found.name} removido da lista.`);
    }

    if (intentName === 'ListItemsIntent') {
      const items = db.prepare('SELECT name FROM items WHERE purchased = 0 ORDER BY name').all();
      if (items.length === 0) return speech('A lista está vazia.');

      const nomes = items.map((i) => i.name);
      const lista = nomes.length === 1
        ? nomes[0]
        : nomes.slice(0, -1).join(', ') + ' e ' + nomes[nomes.length - 1];

      return speech(`Na lista tem: ${lista}.`);
    }

    if (['AMAZON.HelpIntent'].includes(intentName)) {
      return ask(
        'Você pode dizer: adicionar leite, remover ovos, ou o que tem na lista.',
        'O que você quer fazer?'
      );
    }

    if (['AMAZON.CancelIntent', 'AMAZON.StopIntent'].includes(intentName)) {
      return speech('Até logo!');
    }
  }

  return speech('Desculpe, não entendi. Tente novamente.');
}

module.exports = function (ioInstance) {
  io = ioInstance;

  return (req, res) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try {
        const parsed = JSON.parse(body);
        console.log('[alexa] body recebido:', JSON.stringify(parsed).slice(0, 200));
        const response = handle(parsed);
        console.log('[alexa] resposta:', JSON.stringify(response).slice(0, 200));
        res.json(response);
      } catch (err) {
        console.error('[alexa] erro:', err.stack);
        res.json(speech('Desculpe, ocorreu um erro interno.'));
      }
    });
  };
};
