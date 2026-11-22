import { affected, coordinate } from './grid.mjs';
import { CIRCUITS, LIMIT_MS, activate, advance, begin, expire, nextHint, remaining, reset, result } from './relay.mjs';

const get = id => document.getElementById(id);
const board = get('board');
const primary = get('primary');
const restart = get('reset');
const hint = get('hint');
const modes = get('mode-select');
const timer = get('timer');
const route = get('route');
const directions = get('direction');
const best = get('best');
const status = get('message');
const now = () => performance.now();

let currentMode = 'solo';
let relay = reset(currentMode);
let selected = 0;
let hinted = null;
let bestScores = { solo: 0, pair: 0 };

try {
  const saved = JSON.parse(localStorage.getItem('switchyard-scores') || '{}');
  for (const mode of ['solo', 'pair']) {
    if (Number.isInteger(saved?.[mode]) && saved[mode] >= 0 && saved[mode] <= 900) bestScores[mode] = saved[mode];
  }
} catch {
  // The game remains playable if local storage is unavailable.
}

function saveBest(score) {
  if (score === null || score <= bestScores[relay.mode]) return;
  bestScores = { ...bestScores, [relay.mode]: score };
  try {
    localStorage.setItem('switchyard-scores', JSON.stringify(bestScores));
  } catch {
    // The best score is still available while this page is open.
  }
}

const tiles = Array.from({ length: 16 }, (_, index) => {
  const button = document.createElement('button');
  const coord = document.createElement('span');
  const indicator = document.createElement('span');
  const state = document.createElement('span');
  button.type = 'button';
  button.className = 'tile';
  coord.className = 'coord';
  coord.textContent = coordinate(index);
  indicator.className = 'indicator';
  indicator.setAttribute('aria-hidden', 'true');
  state.className = 'tile-state';
  button.append(coord, indicator, state);
  button.addEventListener('pointerenter', () => preview(index));
  button.addEventListener('pointerleave', () => preview());
  button.addEventListener('focus', () => {
    selected = index;
    updateTabStops();
    preview(index);
  });
  button.addEventListener('blur', () => preview());
  button.addEventListener('click', () => play(index));
  button.addEventListener('keydown', event => navigate(event, index));
  board.append(button);
  return { button, state };
});

const circuitRows = CIRCUITS.map((circuit, index) => {
  const li = document.createElement('li');
  const marker = document.createElement('span');
  const name = document.createElement('span');
  const state = document.createElement('span');
  marker.className = 'route-marker';
  marker.setAttribute('aria-hidden', 'true');
  marker.textContent = String(index + 1);
  name.textContent = circuit.name;
  state.className = 'route-state';
  li.append(marker, name, state);
  route.append(li);
  return { li, state };
});

function updateTabStops() {
  for (const [index, { button }] of tiles.entries()) {
    button.tabIndex = relay.phase === 'playing' && index === selected ? 0 : -1;
  }
}

function preview(index) {
  const footprint = relay.phase === 'playing' && index !== undefined
    ? affected(index, relay.circuit.index)
    : [];
  for (const [cell, tile] of tiles.entries()) tile.button.classList.toggle('tile--preview', footprint.includes(cell));
}

function navigate(event, index) {
  const x = index % 4;
  const y = Math.floor(index / 4);
  const offsets = { ArrowLeft: x > 0 ? -1 : 0, ArrowRight: x < 3 ? 1 : 0, ArrowUp: y > 0 ? -4 : 0, ArrowDown: y < 3 ? 4 : 0 };
  const offset = offsets[event.key];
  if (offset === undefined) return;
  event.preventDefault();
  tiles[index + offset].button.focus();
}

function clock() {
  const left = remaining(relay, now());
  timer.textContent = left === null ? '∞' : String(Math.ceil(left / 1000)).padStart(2, '0');
  timer.setAttribute('aria-label', left === null ? 'Untimed' : `${Math.ceil(left / 1000)} seconds left`);
  timer.classList.toggle('timer--low', left !== null && left <= 12_000);
  get('meter-fill').style.width = `${left === null ? 100 : 100 * left / LIMIT_MS}%`;
}

function messages(gameResult) {
  const circuit = relay.circuit;
  if (relay.phase === 'ready') {
    if (relay.mode === 'practice') return 'Take your time. You can reveal a move on the shortest route.';
    if (relay.mode === 'pair') return 'One person starts. Swap players after each circuit.';
    return 'Light every tower in three circuits. The clock keeps running during a handoff.';
  }
  if (relay.phase === 'handoff') {
    const handoff = relay.mode === 'pair' ? ' Pass the controls to your partner.' : '';
    return `${circuit.name} is online.${handoff} Continue when ready.`;
  }
  if (relay.phase === 'complete') {
    const details = `${relay.moves} pulses · ${gameResult.seconds}s · ${gameResult.exact}/3 circuits at par.`;
    return gameResult.score === null ? `All districts online. ${details}` : `${gameResult.score} points. ${details}`;
  }
  if (relay.phase === 'expired') return `Time is up. ${relay.cleared.length} of 3 districts came online.`;
  if (hinted !== null) return `Try ${coordinate(hinted)}. The tile is marked with a dashed outline.`;
  if (relay.mode === 'pair') return `Player ${circuit.index % 2 + 1} controls this circuit. Par ${circuit.par} pulses.`;
  return `Par ${circuit.par} pulses. Flip the tiles until they all show On.`;
}

function refresh() {
  const { circuit, phase } = relay;
  const gameResult = result(relay);
  const finished = gameResult !== null;
  const ready = phase === 'ready';
  get('circuit-caption').textContent = `Circuit ${circuit.index + 1} of ${CIRCUITS.length}`;
  get('circuit-title').textContent = circuit.name;
  directions.textContent = circuit.arrows;
  get('rule').textContent = `A pulse flips this tower and its ${circuit.horizontal} and ${circuit.vertical} neighbours.`;
  for (const [index, { button, state }] of tiles.entries()) {
    const on = Boolean(circuit.grid & (1 << index));
    const highlight = hinted === index;
    button.disabled = phase !== 'playing';
    button.classList.toggle('tile--lit', on);
    button.classList.toggle('tile--hinted', highlight);
    button.setAttribute('aria-label', `${coordinate(index)}, ${on ? 'on' : 'off'}${highlight ? ', suggested next pulse' : ''}`);
    state.textContent = on ? 'On' : 'Off';
  }
  updateTabStops();
  for (const [index, { li, state }] of circuitRows.entries()) {
    const cleared = relay.cleared.some(stage => stage.index === index);
    const active = index === circuit.index && !cleared;
    li.classList.toggle('route--cleared', cleared);
    li.classList.toggle('route--current', active);
    state.textContent = cleared ? 'Online' : active ? 'Current' : 'Waiting';
  }
  get('moves').textContent = String(relay.moves);
  get('online').textContent = `${relay.cleared.length}/${CIRCUITS.length}`;
  modes.hidden = !ready && !finished;
  primary.hidden = phase === 'playing';
  restart.hidden = ready || finished;
  hint.hidden = relay.mode !== 'practice' || phase !== 'playing';
  primary.textContent = ready ? (relay.mode === 'practice' ? 'Start practice' : 'Start relay')
    : finished ? 'Play again' : `Open circuit ${relay.cleared.length + 1}`;
  status.textContent = messages(gameResult);
  status.classList.toggle('message--complete', phase === 'complete');
  renderCircuitRecap(finished);
  best.hidden = !bestScores[relay.mode];
  if (!best.hidden) best.textContent = `Best ${relay.mode === 'pair' ? 'pair' : 'solo'} score on this device: ${bestScores[relay.mode]}`;
  clock();
}

function play(index) {
  if (relay.phase !== 'playing') return;
  const footprint = affected(index, relay.circuit.index).map(coordinate).join(', ');
  const oldPhase = relay.phase;
  relay = activate(relay, index, now());
  hinted = null;
  if (relay.phase === 'complete') saveBest(result(relay).score);
  refresh();
  if (oldPhase !== relay.phase) {
    preview();
    primary.focus();
  } else {
    status.textContent = `${coordinate(index)} pulsed. Changed ${footprint}.`;
  }
}

for (const radio of modes.querySelectorAll('input')) {
  radio.addEventListener('change', event => {
    currentMode = event.target.value;
    if (relay.phase === 'ready') {
      relay = reset(currentMode, relay.variant);
      refresh();
    }
  });
}

primary.addEventListener('click', () => {
  if (relay.phase === 'handoff') {
    relay = advance(relay, now());
  } else if (relay.phase === 'ready') {
    relay = begin(relay, now());
  } else {
    relay = reset(currentMode, (relay.variant + 1) % 16);
  }
  selected = 0;
  refresh();
  if (relay.phase === 'playing') tiles[0].button.focus();
});

restart.addEventListener('click', () => {
  relay = reset(currentMode, relay.variant);
  hinted = null;
  refresh();
  primary.focus();
});

hint.addEventListener('click', () => {
  hinted = nextHint(relay);
  refresh();
  if (hinted !== null) tiles[hinted].button.focus();
});

setInterval(() => {
  const checked = expire(relay, now());
  if (checked !== relay) {
    relay = checked;
    preview();
    refresh();
    primary.focus();
  } else if (relay.phase === 'playing' || relay.phase === 'handoff') clock();
}, 125);

refresh();

function renderCircuitRecap(finished) {
  let panel = get('circuit-recap');
  if (!finished) {
    if (panel) panel.hidden = true;
    return;
  }

  if (!panel) {
    panel = document.createElement('section');
    panel.id = 'circuit-recap';
    panel.className = 'recap';
    panel.setAttribute('aria-labelledby', 'circuit-recap-title');
    status.after(panel);
  }

  const completed = new Map(relay.cleared.map(stage => [stage.index, stage]));
  const title = document.createElement('h3');
  const list = document.createElement('ul');
  title.id = 'circuit-recap-title';
  title.textContent = 'Circuit recap';
  for (const [index, circuit] of CIRCUITS.entries()) {
    const row = document.createElement('li');
    const name = document.createElement('strong');
    const summary = document.createElement('span');
    const stage = completed.get(index);
    const active = !stage && relay.circuit.index === index;
    const par = stage?.par ?? circuit.cells.length;
    const used = stage ? stage.moves : active ? relay.stageMoves : null;
    name.textContent = circuit.name;
    if (stage) {
      const verdict = stage.moves === par ? 'At par' : 'Online';
      summary.textContent = verdict + ' · ' + used + ' pulses · par ' + par;
      row.classList.add('recap-online');
    } else {
      summary.textContent = (active ? 'Unfinished · ' + used + ' pulses' : 'Not reached') + ' · par ' + par;
    }
    row.append(name, summary);
    list.append(row);
  }
  panel.replaceChildren(title, list);
  panel.hidden = false;
}
