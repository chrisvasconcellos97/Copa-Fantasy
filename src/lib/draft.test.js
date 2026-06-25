import { describe, it, expect } from 'vitest';
import {
  getSnakeOrder,
  getCurrentPicker,
  getPotFromPickNumber,
  getRoundFromPickNumber,
} from './draft.js';

const players = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

describe('getSnakeOrder', () => {
  it('returns [] for no players', () => {
    expect(getSnakeOrder([], 4)).toEqual([]);
    expect(getSnakeOrder(null, 4)).toEqual([]);
  });

  it('alternates direction every round (3 players, 2 rounds)', () => {
    expect(getSnakeOrder(players, 2)).toEqual([0, 1, 2, 2, 1, 0]);
  });

  it('produces players * rounds total picks', () => {
    expect(getSnakeOrder(players, 8)).toHaveLength(24);
  });
});

describe('getCurrentPicker', () => {
  it('first pick goes to player 0', () => {
    expect(getCurrentPicker([], players, 8)).toBe(0);
  });

  it('round 1 advances left-to-right', () => {
    expect(getCurrentPicker([{}, {}], players, 8)).toBe(2);
  });

  it('round 2 reverses (snake)', () => {
    // 3 picks made -> next is first pick of round 2 -> player index 2
    expect(getCurrentPicker([{}, {}, {}], players, 8)).toBe(2);
    // 4 picks made -> player index 1
    expect(getCurrentPicker([{}, {}, {}, {}], players, 8)).toBe(1);
  });

  it('returns null once the draft is complete', () => {
    const allPicks = Array(24).fill({});
    expect(getCurrentPicker(allPicks, players, 8)).toBeNull();
  });
});

describe('getPotFromPickNumber', () => {
  it('maps pick numbers to pots based on pot size', () => {
    expect(getPotFromPickNumber(1, 3)).toBe(1);
    expect(getPotFromPickNumber(3, 3)).toBe(1);
    expect(getPotFromPickNumber(4, 3)).toBe(2);
    expect(getPotFromPickNumber(12, 3)).toBe(4);
  });

  it('never exceeds pot 4', () => {
    expect(getPotFromPickNumber(99, 3)).toBe(4);
  });
});

describe('getRoundFromPickNumber', () => {
  it('computes the round from pick number and player count', () => {
    expect(getRoundFromPickNumber(1, 3)).toBe(1);
    expect(getRoundFromPickNumber(3, 3)).toBe(1);
    expect(getRoundFromPickNumber(4, 3)).toBe(2);
  });
});
