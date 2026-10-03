// sample organisation for local development only, the same people the web app's mock api uses
// never loaded anywhere but your own machine, see seed.ts

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

type Row = [
  n: number,
  first: string,
  last: string,
  role: string,
  manager: number | null,
  salary: number,
  birth: string,
];

const ROWS: Row[] = [
  [1, 'Thandi', 'Nkosi', 'Chief Executive Officer', null, 185000, '1975-04-12'],
  [2, 'Sipho', 'Dlamini', 'Chief Technology Officer', 1, 162000, '1979-09-03'],
  [3, 'Ayesha', 'Patel', 'Chief Financial Officer', 1, 158000, '1981-01-21'],
  [4, 'Lerato', 'Mokoena', 'Head of People', 1, 121000, '1984-06-08'],
  [5, 'Johan', 'van der Merwe', 'Engineering Manager', 2, 98000, '1986-11-17'],
  [6, 'Naledi', 'Khumalo', 'Head of Product', 2, 104000, '1985-03-30'],
  [7, 'Ruan', 'Botha', 'Senior Engineer', 5, 76000, '1990-02-02'],
  [8, 'Zanele', 'Mthembu', 'Software Engineer', 5, 54000, '1995-07-19'],
  [9, 'Kagiso', 'Molefe', 'Software Engineer', 5, 51000, '1996-12-05'],
  [10, 'Priya', 'Naidoo', 'QA Engineer', 5, 47000, '1993-08-23'],
  [11, 'Megan', 'Fourie', 'Product Designer', 6, 58000, '1992-05-14'],
  [12, 'Thabo', 'Sithole', 'Financial Analyst', 3, 49000, '1994-10-09'],
  [13, 'Fatima', 'Adams', 'Accountant', 3, 45000, '1991-02-27'],
  [14, 'Bongani', 'Zulu', 'HR Partner', 4, 44000, '1997-01-11'],
];

export const SAMPLE_EMPLOYEES = ROWS.map(
  ([n, firstName, lastName, role, manager, salary, birth]) => ({
    id: id(n),
    employeeNumber: `EMP-${String(n).padStart(4, '0')}`,
    firstName,
    lastName,
    email: `${firstName}.${lastName.replace(/\s+/g, '')}@example.com`.toLowerCase(),
    birthDate: new Date(`${birth}T00:00:00Z`),
    salary,
    role,
    managerId: manager === null ? null : id(manager),
  }),
);
