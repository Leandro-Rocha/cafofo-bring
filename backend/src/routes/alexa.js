const Alexa = require('ask-sdk-core');
const { ExpressAdapter } = require('ask-sdk-express-adapter');
const db = require('../db');

let io;

// ── Handlers ────────────────────────────────────────────────────────────────

const LaunchHandler = {
  canHandle(input) {
    return Alexa.getRequestType(input.requestEnvelope) === 'LaunchRequest';
  },
  handle(input) {
    const { n } = db.prepare('SELECT count(*) as n FROM items WHERE purchased = 0').get();
    const msg = n > 0
      ? `Lista de compras aberta. Você tem ${n} ${n === 1 ? 'item' : 'itens'} pendente${n === 1 ? '' : 's'}.`
      : 'Lista de compras aberta. A lista está vazia.';
    return input.responseBuilder
      .speak(msg)
      .reprompt('Posso adicionar ou remover itens da lista.')
      .getResponse();
  },
};

const AddItemHandler = {
  canHandle(input) {
    return Alexa.getRequestType(input.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(input.requestEnvelope) === 'AddItemIntent';
  },
  handle(input) {
    const item = Alexa.getSlotValue(input.requestEnvelope, 'item');
    const quantidade = Alexa.getSlotValue(input.requestEnvelope, 'quantidade');

    if (!item) {
      return input.responseBuilder
        .speak('Qual item você quer adicionar?')
        .reprompt('Diga o nome do item.')
        .getResponse();
    }

    const result = db.prepare(
      'INSERT INTO items (name, category, quantity) VALUES (?, ?, ?)'
    ).run(item, 'Outros', quantidade || null);

    const newItem = db.prepare('SELECT * FROM items WHERE id = ?').get(result.lastInsertRowid);
    io?.emit('item:added', newItem);

    const resposta = quantidade
      ? `${quantidade} de ${item} adicionado à lista.`
      : `${item} adicionado à lista.`;

    return input.responseBuilder.speak(resposta).getResponse();
  },
};

const RemoveItemHandler = {
  canHandle(input) {
    return Alexa.getRequestType(input.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(input.requestEnvelope) === 'RemoveItemIntent';
  },
  handle(input) {
    const item = Alexa.getSlotValue(input.requestEnvelope, 'item');

    if (!item) {
      return input.responseBuilder
        .speak('Qual item você quer remover?')
        .reprompt('Diga o nome do item.')
        .getResponse();
    }

    const found = db.prepare(
      'SELECT * FROM items WHERE purchased = 0 AND lower(name) LIKE lower(?)'
    ).get(`%${item}%`);

    if (!found) {
      return input.responseBuilder
        .speak(`Não encontrei ${item} na lista.`)
        .getResponse();
    }

    db.prepare('DELETE FROM items WHERE id = ?').run(found.id);
    io?.emit('item:deleted', { id: found.id });

    return input.responseBuilder
      .speak(`${found.name} removido da lista.`)
      .getResponse();
  },
};

const ListItemsHandler = {
  canHandle(input) {
    return Alexa.getRequestType(input.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(input.requestEnvelope) === 'ListItemsIntent';
  },
  handle(input) {
    const items = db.prepare('SELECT name FROM items WHERE purchased = 0 ORDER BY name').all();

    if (items.length === 0) {
      return input.responseBuilder.speak('A lista está vazia.').getResponse();
    }

    const nomes = items.map((i) => i.name);
    const lista = nomes.length === 1
      ? nomes[0]
      : nomes.slice(0, -1).join(', ') + ' e ' + nomes[nomes.length - 1];

    return input.responseBuilder
      .speak(`Na lista tem: ${lista}.`)
      .getResponse();
  },
};

const HelpHandler = {
  canHandle(input) {
    return Alexa.getRequestType(input.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(input.requestEnvelope) === 'AMAZON.HelpIntent';
  },
  handle(input) {
    return input.responseBuilder
      .speak('Você pode dizer: adicionar leite, remover ovos, ou o que tem na lista.')
      .reprompt('O que você quer fazer?')
      .getResponse();
  },
};

const CancelStopHandler = {
  canHandle(input) {
    return Alexa.getRequestType(input.requestEnvelope) === 'IntentRequest'
      && ['AMAZON.CancelIntent', 'AMAZON.StopIntent'].includes(
        Alexa.getIntentName(input.requestEnvelope)
      );
  },
  handle(input) {
    return input.responseBuilder.speak('Até logo!').getResponse();
  },
};

const ErrorHandler = {
  canHandle: () => true,
  handle(input, error) {
    console.error('Alexa error:', error);
    return input.responseBuilder
      .speak('Desculpe, ocorreu um erro. Tente novamente.')
      .getResponse();
  },
};

// ── Skill & adapter ──────────────────────────────────────────────────────────

const skill = Alexa.SkillBuilders.custom()
  .addRequestHandlers(
    LaunchHandler,
    AddItemHandler,
    RemoveItemHandler,
    ListItemsHandler,
    HelpHandler,
    CancelStopHandler
  )
  .addErrorHandlers(ErrorHandler)
  .create();

// Signature verification disabled — private skill on personal server
const adapter = new ExpressAdapter(skill, false, false);

module.exports = function (ioInstance) {
  io = ioInstance;
  return adapter.getRequestHandlers();
};
