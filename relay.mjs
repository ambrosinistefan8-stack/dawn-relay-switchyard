import { LIT, pulse, solve } from './grid.mjs';

export const LIMIT_MS = 75_000;
export const CIRCUITS = [
  { name: 'Glasshouses', horizontal: 'east', vertical: 'south', arrows: '→ ↓', cells: [0, 5, 6] },
  { name: 'Tideworks', horizontal: 'west', vertical: 'south', arrows: '← ↓', cells: [3, 10, 15, 6] },
  { name: 'Sky Archive', horizontal: 'east', vertical: 'north', arrows: '→ ↑', cells: [12, 9, 14, 7, 5] },
];

export function makeCircuit(index, variant = 0) {
  const circuit = CIRCUITS[index];
  if (!circuit) throw new Error('Unknown circuit');
  const cells = circuit.cells.map(cell => (cell + variant * 5 + index * variant * 2) % 16);
  const grid = cells.reduce((board, cell) => pulse(board, cell, index), LIT);
  return { ...circuit, index, grid, par: cells.length };
}

export function reset(mode, variant = 0) {
  return {
    mode,
    variant,
    phase: 'ready',
    circuit: makeCircuit(0, variant),
    moves: 0,
    stageMoves: 0,
    cleared: [],
    startedAt: 0,
    endedAt: 0,
  };
}

export function remaining(relay, now) {
  if (relay.mode === 'practice') return null;
  if (relay.phase === 'ready') return LIMIT_MS;
  const effectiveTime = relay.phase === 'complete' || relay.phase === 'expired' ? relay.endedAt : now;
  return Math.max(0, LIMIT_MS - (effectiveTime - relay.startedAt));
}

export function begin(relay, now) {
  if (relay.phase !== 'ready') return relay;
  return { ...relay, phase: 'playing', startedAt: now };
}

export function expire(relay, now) {
  if (relay.phase !== 'playing' && relay.phase !== 'handoff') return relay;
  if (remaining(relay, now) !== 0) return relay;
  return { ...relay, phase: 'expired', endedAt: relay.startedAt + LIMIT_MS };
}

export function activate(relay, cell, now) {
  const live = expire(relay, now);
  if (live.phase !== 'playing') return live;
  const nextGrid = pulse(live.circuit.grid, cell, live.circuit.index);
  const next = {
    ...live,
    circuit: { ...live.circuit, grid: nextGrid },
    moves: live.moves + 1,
    stageMoves: live.stageMoves + 1,
  };
  if (nextGrid !== LIT) return next;
  const cleared = [...next.cleared, {
    index: next.circuit.index,
    moves: next.stageMoves,
    par: next.circuit.par,
  }];
  const complete = cleared.length === CIRCUITS.length;
  return { ...next, cleared, phase: complete ? 'complete' : 'handoff', endedAt: complete ? now : 0 };
}

export function advance(relay, now) {
  const live = expire(relay, now);
  if (live.phase !== 'handoff') return live;
  const circuit = makeCircuit(live.cleared.length, live.variant);
  return { ...live, circuit, phase: 'playing', stageMoves: 0 };
}

export function nextHint(relay) {
  if (relay.mode !== 'practice' || relay.phase !== 'playing') return null;
  return solve(relay.circuit.grid, relay.circuit.index)[0] ?? null;
}

export function result(relay) {
  if (relay.phase !== 'complete' && relay.phase !== 'expired') return null;
  const seconds = Math.ceil((relay.endedAt - relay.startedAt) / 1000);
  const exact = relay.cleared.filter(stage => stage.moves === stage.par).length;
  const completed = relay.phase === 'complete';
  const score = completed && relay.mode !== 'practice'
    ? Math.max(0, 600 + exact * 100 - seconds * 4 - relay.moves * 8)
    : null;
  return { seconds, exact, completed, score };
}
