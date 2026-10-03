import { describe, expect, it } from 'vitest';
import { seedEmployees } from '../../mocks/seed';
import { searchPeople, splitMatch } from './searchPeople';

const everyone = seedEmployees();
const names = (query: string) => searchPeople(everyone, query).map((e) => e.firstName);

describe('searchPeople', () => {
  it('puts names that start with the search first', () => {
    expect(names('na')[0]).toBe('Naledi');
  });

  it('finds people by role, employee number and email', () => {
    expect(names('accountant')).toEqual(['Fatima']);
    expect(names('emp-0012')).toEqual(['Thabo']);
    expect(names('zulu@')).toEqual(['Bongani']);
  });

  it('returns nothing for an empty search', () => {
    expect(names('   ')).toEqual([]);
  });

  it('caps the number of results', () => {
    expect(searchPeople(everyone, 'e').length).toBeLessThanOrEqual(8);
  });
});

describe('splitMatch', () => {
  it('splits around the match, ignoring case', () => {
    expect(splitMatch('Priya Naidoo', 'nai')).toEqual(['Priya ', 'Nai', 'doo']);
  });

  it('leaves text alone when nothing matches', () => {
    expect(splitMatch('Priya', 'zz')).toEqual(['Priya', '', '']);
  });
});
