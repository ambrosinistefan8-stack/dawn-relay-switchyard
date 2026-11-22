import assert from 'node:assert/strict';
import test from 'node:test';
import { LIT, pulse, solve } from '../grid.mjs';
import { CIRCUITS, LIMIT_MS, activate, advance, begin, expire, makeCircuit, nextHint, remaining, reset, result } from '../relay.mjs';

function clearCircuit(relay, time) {
  const cells = solve(relay.circuit.grid, relay.circuit.index);
  return cells.reduce((state, cell) => activate(state, cell, time), relay);
}

test('all 48 board layouts have the intended minimum pulse count', () => {
  const layouts = new Set();
  for (let variant = 0; variant < 16; variant++) {
    for (const index of CIRCUITS.keys()) {
      const circuit = makeCircuit(index, variant);
      const solution = solve(circuit.grid, index);
      assert.equal(solution.length, index + 3);
      assert.equal(solution.reduce((grid, cell) => pulse(grid, cell, index), circuit.grid), LIT);
      layouts.add(`${index}:${circuit.grid}`);
    }
  }
  assert.equal(layouts.size, 48);
});

test('pair relay advances circuit directions and awards one finished score', () => {
  const ready = reset('pair', 2);
  assert.equal(activate(ready, 0, 0), ready);
  let relay = begin(ready, 100);
  const handoff = clearCircuit(relay, 1200);
  assert.equal(handoff.phase, 'handoff');
  assert.equal(remaining(handoff, 12100), 63000);
  assert.equal(activate(handoff, 0, 13000), handoff);
  relay = advance(handoff, 13000);
  assert.equal(relay.circuit.index, 1);
  assert.equal(relay.circuit.horizontal, 'west');
  relay = advance(clearCircuit(relay, 20000), 22000);
  assert.equal(relay.circuit.vertical, 'north');
  relay = clearCircuit(relay, 24100);
  assert.equal(relay.phase, 'complete');
  assert.deepEqual(result(relay), { seconds: 24, exact: 3, completed: true, score: 708 });
  assert.equal(advance(relay, 25000), relay);
  assert.equal(activate(relay, 0, 25000), relay);
});

test('the clock expiring in a handoff prevents another circuit', () => {
  const relay = clearCircuit(begin(reset('solo'), 50), 1000);
  const deadline = 50 + LIMIT_MS;
  const expired = advance(relay, deadline);
  assert.equal(expired.phase, 'expired');
  assert.equal(expired.cleared.length, 1);
  assert.equal(remaining(expired, deadline + 8000), 0);
  assert.deepEqual(result(expired), { seconds: 75, exact: 1, completed: false, score: null });
});

test('the final pulse arriving at the deadline is rejected', () => {
  let relay = begin(reset('solo'), 0);
  const validPulses = solve(relay.circuit.grid, relay.circuit.index);
  for (const cell of validPulses.slice(0, -1)) relay = activate(relay, cell, 200);
  const expired = activate(relay, validPulses.at(-1), LIMIT_MS);
  assert.equal(expired.phase, 'expired');
  assert.equal(expired.cleared.length, 0);
  assert.equal(expired.moves, validPulses.length - 1);
});

test('practice stays untimed and offers genuine shortest-route hints', () => {
  let relay = begin(reset('practice'), 0);
  while (relay.phase !== 'complete') {
    assert.equal(expire(relay, 100_000), relay);
    assert.equal(remaining(relay, 100_000), null);
    if (relay.phase === 'handoff') {
      assert.equal(nextHint(relay), null);
      relay = advance(relay, 100_000);
    } else relay = activate(relay, nextHint(relay), 100_000);
  }
  assert.equal(relay.moves, 12);
  assert.equal(result(relay).score, null);
  assert.equal(nextHint(begin(reset('solo'), 0)), null);
});
