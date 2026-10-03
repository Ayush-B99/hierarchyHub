import { Prisma } from '@prisma/client';
import { toEmployee } from './employee.mapper';

describe('toEmployee', () => {
  it('turns a database row into the api shape', () => {
    const employee = toEmployee({
      id: 'id-1',
      employeeNumber: 'EMP-0001',
      firstName: 'Thandi',
      lastName: 'Nkosi',
      email: 'thandi@example.com',
      birthDate: new Date('1975-04-12T00:00:00Z'),
      salary: new Prisma.Decimal('185000.50'),
      role: 'CEO',
      managerId: null,
      version: 3,
      createdAt: new Date('2026-10-01T08:00:00Z'),
      updatedAt: new Date('2026-10-02T09:30:00Z'),
    });
    expect(employee).toEqual({
      id: 'id-1',
      employeeNumber: 'EMP-0001',
      firstName: 'Thandi',
      lastName: 'Nkosi',
      email: 'thandi@example.com',
      birthDate: '1975-04-12',
      salary: 185000.5,
      role: 'CEO',
      managerId: null,
      version: 3,
      createdAt: '2026-10-01T08:00:00.000Z',
      updatedAt: '2026-10-02T09:30:00.000Z',
    });
  });
});
