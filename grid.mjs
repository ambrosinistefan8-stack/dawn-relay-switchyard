// The directional pulse, solver and coordinates are carried over from Stefan
// Ambrosini's Dawn Relay. The Switchyard relay controller is separate.
export const WIDTH = 4;
export const LIT = 0xffff;

export function directions(district) {
  return { x: district === 1 ? -1 : 1, y: district === 2 ? -1 : 1 };
}

export function affected(index, district = 0) {
  const { x, y } = directions(district);
  const neighbors = [index];
  const column = index % WIDTH + x;
  const row = Math.floor(index / WIDTH) + y;
  if (column >= 0 && column < WIDTH) neighbors.push(index + x);
  if (row >= 0 && row < WIDTH) neighbors.push(index + WIDTH * y);
  return neighbors;
}

export function pulse(grid, index, district = 0) {
  if (!Number.isInteger(index) || index < 0 || index >= 16) throw new Error('Unknown tower');
  for (const cell of affected(index, district)) grid ^= 1 << cell;
  return grid;
}

export function solve(grid, district = 0) {
  const { x, y } = directions(district);
  const path = [];
  for (let i = 0; i < 16; i++) {
    const row = Math.floor(i / 4);
    const col = i % 4;
    const cell = (y > 0 ? row : 3 - row) * 4 + (x > 0 ? col : 3 - col);
    if ((grid & (1 << cell)) === 0) {
      path.push(cell);
      grid = pulse(grid, cell, district);
    }
  }
  return path;
}

export function coordinate(index) {
  return 'ABCD'[Math.floor(index / 4)] + (index % 4 + 1);
}
