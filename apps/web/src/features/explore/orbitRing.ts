/**
 * the geometry of the 3d orbit: a tilted ring around the selected person, seen from slightly above.
 * angles are in radians. an angle of pi/2 is the front of the ring (nearest you),
 * -pi/2 is the back, behind the centre card
 */
export const RING = {
  cx: 390,
  // a little below the centre card, so cards passing in front only cover its bottom edge
  cy: 420,
  /** half the ring's width */
  rx: 300,
  /** half the ring's height, smaller than rx because the ring is tilted away from you */
  ry: 130,
};

/** how fast the ring turns on its own, one full turn about every 35 seconds */
export const AUTO_SPEED = -0.18;

/**
 * the ring starts turned a little, so a team of two isn't parked flat at the two sides
 * and bigger teams have one person clearly at the front
 */
const START_TWIST = 0.45;

const TURN = Math.PI * 2;

export interface Placement {
  x: number;
  y: number;
  /** 0 at the very back of the ring, 1 at the very front */
  depth: number;
  scale: number;
  opacity: number;
  zIndex: number;
}

/** the z-index of the centre card: cards on the back half go behind it, the front half in front */
export const CENTRE_Z = 100;

/** where a card at this angle sits on screen, and how near it looks */
export function placeOnRing(angle: number): Placement {
  const depth = (Math.sin(angle) + 1) / 2;
  return {
    x: RING.cx + RING.rx * Math.cos(angle),
    y: RING.cy + RING.ry * Math.sin(angle),
    depth,
    scale: 0.66 + 0.34 * depth,
    opacity: 0.45 + 0.55 * depth,
    zIndex: (depth >= 0.5 ? CENTRE_Z + 1 : 1) + Math.round(depth * 98),
  };
}

/** the angle of card i when the ring is turned to `base`, cards are spaced evenly */
export function slotAngle(base: number, index: number, count: number): number {
  return base + (index * TURN) / count;
}

/** the starting turn: the team is spread evenly with the middle of it near the front */
export function startAngle(count: number): number {
  if (count <= 0) return Math.PI / 2;
  const centred = Math.PI / 2 - ((count - 1) / 2) * (TURN / count);
  // odd teams already have someone dead centre, so only twist even ones
  return count % 2 === 0 ? centred + START_TWIST : centred;
}

/**
 * the turn that brings card i to the front, picked so the ring takes the short way round
 * from where it is now instead of spinning almost a whole lap
 */
export function frontAngleFor(index: number, count: number, current: number): number {
  const wanted = Math.PI / 2 - (index * TURN) / count;
  const diff = wanted - current;
  const shortest = (((diff % TURN) + TURN * 1.5) % TURN) - TURN / 2;
  return current + shortest;
}
