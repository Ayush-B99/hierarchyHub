import type { AccountSummary, Me } from '@hierarchy-hub/shared';
import { SEED_IDS } from './seed';

/** the password every mock account has, the same as the local sample accounts */
export const MOCK_PASSWORD = 'hierarchy hub demo';

interface MockAccount extends AccountSummary {
  password: string;
}

let rows: MockAccount[] = [];
let signedIn: string | null = null;

const now = () => new Date().toISOString();

function seed(): MockAccount[] {
  const active = (
    id: string,
    name: string,
    email: string,
    employeeId: string,
    isAdmin: boolean,
  ) => ({
    id,
    name,
    email,
    status: 'active' as const,
    isAdmin,
    employeeId,
    createdAt: '2026-10-01T08:00:00.000Z',
    approvedAt: '2026-10-01T09:00:00.000Z',
    lastLoginAt: null,
    password: MOCK_PASSWORD,
  });
  return [
    active(
      'a0000000-0000-4000-8000-000000000001',
      'Thandi Nkosi',
      'thandi.nkosi@example.com',
      SEED_IDS.ceo,
      true,
    ),
    active(
      'a0000000-0000-4000-8000-000000000002',
      'Sipho Dlamini',
      'sipho.dlamini@example.com',
      SEED_IDS.cto,
      true,
    ),
    active(
      'a0000000-0000-4000-8000-000000000005',
      'Johan van der Merwe',
      'johan.vandermerwe@example.com',
      SEED_IDS.engineeringManager,
      false,
    ),
    active(
      'a0000000-0000-4000-8000-000000000007',
      'Ruan Botha',
      'ruan.botha@example.com',
      SEED_IDS.seniorEngineer,
      false,
    ),
    {
      id: 'a0000000-0000-4000-8000-000000000099',
      name: 'Amara Okafor',
      email: 'amara.okafor@example.com',
      status: 'pending',
      isAdmin: false,
      employeeId: null,
      createdAt: '2026-10-04T08:00:00.000Z',
      approvedAt: null,
      lastLoginAt: null,
      password: MOCK_PASSWORD,
    },
  ];
}

const toMe = (row: MockAccount): Me => ({
  id: row.id,
  name: row.name,
  email: row.email,
  isAdmin: row.isAdmin,
  employeeId: row.employeeId ?? '',
});

const summary = ({ password: _password, ...row }: MockAccount): AccountSummary => row;

/** in-memory accounts for the mock api. tests start signed in as the ceo, an admin */
export const accounts = {
  reset() {
    rows = seed();
    signedIn = rows[0]!.id;
  },
  /** sign in as someone by email, or sign out with null. for tests */
  signInAs(email: string | null) {
    signedIn = email ? (rows.find((row) => row.email === email)?.id ?? null) : null;
  },
  me(): Me | null {
    const row = rows.find((r) => r.id === signedIn);
    return row && row.status === 'active' ? toMe(row) : null;
  },
  byEmail: (email: string) => rows.find((row) => row.email === email),
  find: (id: string) => rows.find((row) => row.id === id),
  all: () => rows.map(summary),
  start(id: string) {
    signedIn = id;
    rows = rows.map((row) => (row.id === id ? { ...row, lastLoginAt: now() } : row));
  },
  end() {
    signedIn = null;
  },
  add(name: string, email: string, password: string) {
    rows = [
      ...rows,
      {
        id: crypto.randomUUID(),
        name,
        email,
        status: 'pending',
        isAdmin: false,
        employeeId: null,
        createdAt: now(),
        approvedAt: null,
        lastLoginAt: null,
        password,
      },
    ];
  },
  approve(id: string, employeeId: string): AccountSummary {
    rows = rows.map((row) =>
      row.id === id ? { ...row, status: 'active', employeeId, approvedAt: now() } : row,
    );
    return summary(rows.find((row) => row.id === id)!);
  },
  update(
    id: string,
    changes: { isAdmin?: boolean; status?: 'active' | 'disabled' },
  ): AccountSummary {
    rows = rows.map((row) => (row.id === id ? { ...row, ...changes } : row));
    return summary(rows.find((row) => row.id === id)!);
  },
  remove(id: string) {
    rows = rows.filter((row) => row.id !== id);
  },
};

accounts.reset();
