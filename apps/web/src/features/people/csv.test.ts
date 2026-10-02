import { describe, expect, it } from 'vitest';
import { seedEmployees } from '../../mocks/seed';
import { csvCell, toCsv } from './csv';

describe('csv export', () => {
  it('quotes values with commas and quotes', () => {
    expect(csvCell('Smith, John')).toBe('"Smith, John"');
    expect(csvCell('He said "hi"')).toBe('"He said ""hi"""');
    expect(csvCell('plain')).toBe('plain');
  });

  it('stops spreadsheet formulas from running', () => {
    expect(csvCell('=SUM(A1:A9)')).toBe("'=SUM(A1:A9)");
    expect(csvCell('+27 12 345')).toBe("'+27 12 345");
  });

  it('writes a header and one row per person, with their manager', () => {
    const people = seedEmployees();
    const byId = new Map(people.map((p) => [p.id, p]));
    const lines = toCsv(people.slice(0, 2), byId).trim().split('\r\n');
    expect(lines[0]).toContain('Employee number,First name,Surname');
    expect(lines[1]).toBe(
      'EMP-0001,Thandi,Nkosi,thandi.nkosi@example.com,1975-04-12,Chief Executive Officer,185000.00,,',
    );
    expect(lines[2]).toContain('Thandi Nkosi,EMP-0001');
  });
});
