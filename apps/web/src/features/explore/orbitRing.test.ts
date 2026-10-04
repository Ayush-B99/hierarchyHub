import { describe, expect, it } from 'vitest';
import { CENTRE_Z, RING, frontAngleFor, placeOnRing, slotAngle, startAngle } from './orbitRing';

const FRONT = Math.PI / 2;
const BACK = -Math.PI / 2;

describe('the orbit ring', () => {
  it('puts the front of the ring nearest you: lowest on screen, biggest and in front of the centre card', () => {
    const front = placeOnRing(FRONT);
    expect(front.y).toBeCloseTo(RING.cy + RING.ry);
    expect(front.scale).toBeCloseTo(1);
    expect(front.opacity).toBeCloseTo(1);
    expect(front.zIndex).toBeGreaterThan(CENTRE_Z);
  });

  it('puts the back of the ring furthest away: higher up, smaller, fainter and behind the centre card', () => {
    const back = placeOnRing(BACK);
    expect(back.y).toBeCloseTo(RING.cy - RING.ry);
    expect(back.scale).toBeLessThan(0.7);
    expect(back.opacity).toBeLessThan(0.5);
    expect(back.zIndex).toBeLessThan(CENTRE_Z);
  });

  it('draws nearer cards over further ones', () => {
    const near = placeOnRing(FRONT - 0.3);
    const far = placeOnRing(FRONT - 1.2);
    expect(near.zIndex).toBeGreaterThan(far.zIndex);
  });

  it('spaces the team evenly around the ring', () => {
    const angles = [0, 1, 2, 3].map((i) => slotAngle(0, i, 4));
    expect(angles[1]! - angles[0]!).toBeCloseTo(Math.PI / 2);
    expect(angles[3]! - angles[2]!).toBeCloseTo(Math.PI / 2);
  });

  it('starts an odd team with its middle person at the very front', () => {
    expect(slotAngle(startAngle(3), 1, 3)).toBeCloseTo(FRONT);
    expect(startAngle(1)).toBeCloseTo(FRONT);
  });

  it('starts a team of two turned a little, so nobody is parked flat at the sides', () => {
    const depths = [0, 1].map((i) => placeOnRing(slotAngle(startAngle(2), i, 2)).depth);
    expect(Math.max(...depths)).toBeGreaterThan(0.6);
  });

  it('brings a card to the front the short way round', () => {
    // card 0 of 4 sits just past the front, so it should turn back a little, not go round
    const now = FRONT + 0.4;
    const target = frontAngleFor(0, 4, now);
    expect(slotAngle(target, 0, 4) % (Math.PI * 2)).toBeCloseTo(FRONT);
    expect(Math.abs(target - now)).toBeLessThanOrEqual(Math.PI);

    // even after many turns, it still moves less than half a lap
    const later = frontAngleFor(2, 4, 40);
    expect(Math.abs(later - 40)).toBeLessThanOrEqual(Math.PI);
    expect(Math.sin(slotAngle(later, 2, 4))).toBeCloseTo(1);
  });
});
