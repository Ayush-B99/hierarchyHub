import { describe, expect, it } from 'vitest';
import {
  canAdd,
  canBeTheirManager,
  fieldsYouCantChangeAboutYourself,
  isAtTop,
  isBelow,
  permissionsFor,
} from './permissions';

//   ceo
//   ├── cto
//   │   ├── manager
//   │   │   └── engineer
//   │   └── product
//   └── cfo
const people = [
  { id: 'ceo', managerId: null },
  { id: 'cto', managerId: 'ceo' },
  { id: 'cfo', managerId: 'ceo' },
  { id: 'manager', managerId: 'cto' },
  { id: 'product', managerId: 'cto' },
  { id: 'engineer', managerId: 'manager' },
];
const byId = new Map(people.map((p) => [p.id, p]));
const as = (employeeId: string, isAdmin = false) => ({ employeeId, isAdmin });

describe('isBelow', () => {
  it('follows the chain up, at any depth', () => {
    expect(isBelow('ceo', 'engineer', byId)).toBe(true);
    expect(isBelow('cto', 'engineer', byId)).toBe(true);
    expect(isBelow('manager', 'engineer', byId)).toBe(true);
  });

  it('is never true for yourself, someone above, or someone beside', () => {
    expect(isBelow('engineer', 'engineer', byId)).toBe(false);
    expect(isBelow('engineer', 'manager', byId)).toBe(false);
    expect(isBelow('cto', 'cfo', byId)).toBe(false);
    expect(isBelow('product', 'engineer', byId)).toBe(false);
  });

  it('stops instead of looping forever on bad data', () => {
    const loop = new Map([
      ['a', { id: 'a', managerId: 'b' }],
      ['b', { id: 'b', managerId: 'a' }],
    ]);
    expect(isBelow('x', 'a', loop)).toBe(false);
  });
});

describe('permissionsFor', () => {
  it('about yourself: see everything, change only your name and email', () => {
    expect(permissionsFor(as('manager', true), 'manager', byId)).toEqual({
      seePrivate: true,
      editContact: true,
      editAll: false,
      move: false,
      remove: false,
      manageAccount: false,
    });
  });

  it('people below you: change and move them, and delete them if you’re an admin', () => {
    expect(permissionsFor(as('cto'), 'engineer', byId)).toMatchObject({
      seePrivate: true,
      editAll: true,
      move: true,
      remove: false,
    });
    expect(permissionsFor(as('cto', true), 'engineer', byId)).toMatchObject({
      remove: true,
      manageAccount: true,
    });
  });

  it('people above or beside you: nothing, even as an admin', () => {
    for (const target of ['ceo', 'cfo', 'product']) {
      expect(Object.values(permissionsFor(as('manager', true), target, byId)).some(Boolean)).toBe(
        false,
      );
    }
  });
});

describe('choosing a manager', () => {
  it('only yourself or someone below you', () => {
    expect(canBeTheirManager(as('cto'), 'cto', byId)).toBe(true);
    expect(canBeTheirManager(as('cto'), 'manager', byId)).toBe(true);
    expect(canBeTheirManager(as('cto'), 'cfo', byId)).toBe(false);
    expect(canBeTheirManager(as('cto'), 'ceo', byId)).toBe(false);
  });

  it('no manager at all only for someone at the top', () => {
    expect(isAtTop(as('ceo'), byId)).toBe(true);
    expect(canBeTheirManager(as('ceo'), null, byId)).toBe(true);
    expect(canBeTheirManager(as('cto'), null, byId)).toBe(false);
  });

  it('adding people is for admins, into their own part of the organisation', () => {
    expect(canAdd(as('cto', true), 'manager', byId)).toBe(true);
    expect(canAdd(as('cto'), 'manager', byId)).toBe(false);
    expect(canAdd(as('cto', true), 'cfo', byId)).toBe(false);
  });
});

describe('fieldsYouCantChangeAboutYourself', () => {
  it('allows your name and email, and names everything else', () => {
    expect(fieldsYouCantChangeAboutYourself({ firstName: 'a', email: 'b@c.co' })).toEqual([]);
    expect(
      fieldsYouCantChangeAboutYourself({ firstName: 'a', salary: 1, managerId: null }),
    ).toEqual(['salary', 'managerId']);
  });
});
