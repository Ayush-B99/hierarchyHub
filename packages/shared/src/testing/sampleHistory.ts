const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const DAY = 86_400_000;

const THANDI = { employeeId: id(1), name: 'Thandi Nkosi' };

export interface SampleHistoryEvent {
  at: Date;
  action: 'employee.created' | 'employee.updated' | 'employee.deleted';
  actor: { employeeId: string; name: string };
  subjectEmployeeId: string;
  subjectName: string;
  scope: string[];
  changes: Record<string, { from: unknown; to: unknown }>;
  details: Record<string, unknown>;
}

const manager = (n: number, name: string) => ({ id: id(n), name });

function created(
  n: number,
  first: string,
  last: string,
  role: string,
  managerRef: { id: string; name: string },
  salary: number,
  birthDate: string,
) {
  const value = (to: unknown) => ({ from: null, to });
  return {
    employeeNumber: value(`EMP-${String(n).padStart(4, '0')}`),
    firstName: value(first),
    lastName: value(last),
    email: value(`${first}.${last.replace(/\s+/g, '')}@example.com`.toLowerCase()),
    birthDate: value(birthDate),
    salary: value(salary),
    role: value(role),
    managerId: value(managerRef),
  };
}

export function sampleHistory(now = new Date()): SampleHistoryEvent[] {
  const daysAgo = (days: number) => new Date(now.getTime() - days * DAY);
  const chain = (...ns: number[]) => ns.map(id);
  const pieter = {
    id: id(15),
    firstName: 'Pieter',
    lastName: 'Vosloo',
    email: 'pieter.vosloo@example.com',
    employeeNumber: 'EMP-0015',
    role: 'Finance Manager',
    managerId: id(3),
  };

  const events: Omit<SampleHistoryEvent, 'actor'>[] = [
    {
      at: daysAgo(40),
      action: 'employee.created',
      subjectEmployeeId: id(11),
      subjectName: 'Megan Fourie',
      scope: chain(11, 6, 2, 1),
      changes: created(
        11,
        'Megan',
        'Fourie',
        'Product Designer',
        manager(6, 'Naledi Khumalo'),
        58000,
        '1992-05-14',
      ),
      details: {},
    },
    {
      at: daysAgo(33),
      action: 'employee.updated',
      subjectEmployeeId: id(10),
      subjectName: 'Priya Naidoo',
      scope: chain(10, 5, 2, 1),
      changes: { role: { from: 'Junior QA Engineer', to: 'QA Engineer' } },
      details: {},
    },
    {
      at: daysAgo(26),
      action: 'employee.updated',
      subjectEmployeeId: id(7),
      subjectName: 'Ruan Botha',
      scope: chain(7, 5, 2, 1),
      changes: {
        managerId: { from: manager(6, 'Naledi Khumalo'), to: manager(5, 'Johan van der Merwe') },
      },
      details: {},
    },
    {
      at: daysAgo(19),
      action: 'employee.deleted',
      subjectEmployeeId: id(15),
      subjectName: 'Pieter Vosloo',
      scope: chain(15, 3, 1),
      changes: {
        role: { from: 'Finance Manager', to: null },
        managerId: { from: manager(3, 'Ayesha Patel'), to: null },
      },
      details: {
        employeeNumber: 'EMP-0015',
        teamMovedTo: manager(3, 'Ayesha Patel'),
        team: ['Thabo Sithole', 'Fatima Adams'],
        teamIds: [id(12), id(13)],
        person: pieter,
      },
    },
    {
      at: daysAgo(12),
      action: 'employee.created',
      subjectEmployeeId: id(9),
      subjectName: 'Kagiso Molefe',
      scope: chain(9, 5, 2, 1),
      changes: created(
        9,
        'Kagiso',
        'Molefe',
        'Software Engineer',
        manager(5, 'Johan van der Merwe'),
        51000,
        '1996-12-05',
      ),
      details: {},
    },
    {
      at: daysAgo(5),
      action: 'employee.updated',
      subjectEmployeeId: id(4),
      subjectName: 'Lerato Mokoena',
      scope: chain(4, 1),
      changes: { role: { from: 'HR Manager', to: 'Head of People' } },
      details: {},
    },
  ];

  return events.map((event) => ({
    ...event,
    actor: THANDI,
    details: { ...event.details, seeded: true },
  }));
}
