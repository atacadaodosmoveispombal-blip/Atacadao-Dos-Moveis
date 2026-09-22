import assert from 'node:assert/strict';
import { setupVoiceSearch } from '../virtual-assistant-voice.js';

class FakeRecognition {
  static instances = [];
  constructor() { FakeRecognition.instances.push(this); }
  start() { this.started = true; }
  stop() { this.stopped = true; }
  abort() { this.aborted = true; }
  result(text) { this.onresult?.({ results: [[{ transcript: text }]] }); }
  error(code) { this.onerror?.({ error: code }); }
  end() { this.onend?.(); }
}

function harness(Recognition = FakeRecognition) {
  const input = { value: '', readOnly: false, blur() { this.blurred = true; } };
  const button = { hidden: true, dataset: {}, attributes: {}, handlers: {}, addEventListener(type, handler) { this.handlers[type] = handler; }, setAttribute(name, value) { this.attributes[name] = value; }, click() { this.handlers.click?.(); } };
  const status = { hidden: true, dataset: {}, textContent: '' };
  const submitted = [];
  const timers = new Map();
  let nextTimer = 0;
  let open = true;
  const voice = setupVoiceSearch({
    input, button, status, submit: text => submitted.push(text), isOpen: () => open, Recognition,
    schedule: callback => { const id = ++nextTimer; timers.set(id, callback); return id; },
    cancelSchedule: id => timers.delete(id)
  });
  return { input, button, status, submitted, timers, voice, setOpen(value) { open = value; }, flush() { for (const callback of [...timers.values()]) callback(); timers.clear(); } };
}

// O reconhecimento apenas entrega texto ao mesmo callback usado pela pesquisa digitada.
const h = harness();
assert.equal(h.button.hidden, false);
assert.equal(h.status.hidden, false);
assert.equal(h.button.attributes['aria-label'], 'Pesquisar por voz');
for (const phrase of ['sofá', 'sofás', 'armário', 'armário duas portas', 'mesa de computador', 'quero ver cozinha', 'promoções', 'abrir minha sacola', 'falar com a loja']) {
  h.button.click();
  const recognition = FakeRecognition.instances.at(-1);
  assert.equal(recognition.lang, 'pt-BR');
  assert.equal(recognition.continuous, false);
  assert.equal(recognition.interimResults, false);
  assert.equal(h.button.attributes['aria-label'], 'Parar reconhecimento de voz');
  assert.equal(h.input.readOnly, true);
  assert.equal(h.status.textContent, '🔴 Ouvindo...');
  recognition.result(phrase);
  assert.equal(h.input.value, phrase);
  assert.equal(h.status.textContent, '✓ Entendido');
  assert.equal(h.submitted.includes(phrase), false);
  h.flush();
  assert.equal(h.submitted.at(-1), phrase);
  assert.equal(h.button.attributes['aria-label'], 'Pesquisar por voz');
}

const denied = harness();
denied.input.value = 'busca digitada';
denied.button.click();
FakeRecognition.instances.at(-1).error('not-allowed');
assert.equal(denied.status.textContent, 'Não foi possível acessar o microfone. Você pode continuar digitando normalmente.');
assert.equal(denied.input.value, 'busca digitada');
assert.equal(denied.input.readOnly, false);
assert.equal(denied.submitted.length, 0);

const silent = harness();
silent.button.click();
FakeRecognition.instances.at(-1).end();
assert.equal(silent.status.textContent, 'Não consegui entender. Toque no microfone e tente novamente.');

const unrecognized = harness();
unrecognized.button.click();
FakeRecognition.instances.at(-1).error('no-speech');
assert.equal(unrecognized.status.textContent, 'Não consegui entender. Toque no microfone e tente novamente.');

const canceled = harness();
canceled.input.value = 'rascunho';
canceled.button.click();
const first = FakeRecognition.instances.at(-1);
const staleResult = first.onresult;
canceled.button.click();
assert.equal(first.aborted, true);
assert.equal(canceled.input.value, 'rascunho');
assert.equal(canceled.status.textContent, '🎤 Falar');
staleResult({ results: [[{ transcript: 'ignorar' }]] });
canceled.flush();
assert.equal(canceled.submitted.length, 0);

canceled.button.click();
const second = FakeRecognition.instances.at(-1);
canceled.voice.stop();
assert.equal(second.aborted, true);
assert.equal(canceled.submitted.length, 0);

const closedAfterResult = harness();
closedAfterResult.button.click();
FakeRecognition.instances.at(-1).result('sofá');
closedAfterResult.setOpen(false);
closedAfterResult.voice.stop();
closedAfterResult.flush();
assert.equal(closedAfterResult.submitted.length, 0);

const unsupported = harness(null);
assert.equal(unsupported.button.hidden, true);
assert.equal(unsupported.status.hidden, true);
unsupported.input.value = 'texto normal';
unsupported.voice.stop();
assert.equal(unsupported.input.value, 'texto normal');

console.log('Busca por voz: envio, idioma, permissão, silêncio, cancelamento, fechamento e ausência de suporte validados.');
