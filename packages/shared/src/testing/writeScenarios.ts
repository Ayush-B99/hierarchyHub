/**
 * the api contract for changing employees, as examples against the 14 sample people.
 * like the list examples, both the mock api's tests and the real api's tests run every one,
 * so the two can't drift apart. each starts from the untouched sample people
 */
export interface WriteScenario {
  name: string;
  method: 'POST' | 'PATCH' | 'DELETE';
  /** under /api */
  path: string;
  ifMatch?: string;
  body?: Record<string, unknown>;
  status: number;
  /** the form field the problem is reported on, for 400s and 409s that have one */
  field?: string;
}

const SIPHO = '00000000-0000-4000-8000-000000000002';
const JOHAN = '00000000-0000-4000-8000-000000000005';
const RUAN = '00000000-0000-4000-8000-000000000007';
const NOBODY = '00000000-0000-4000-8000-999999999999';

const newPerson = {
  employeeNumber: 'EMP-0100',
  firstName: 'Lindiwe',
  lastName: 'Mahlangu',
  email: 'lindiwe.mahlangu@example.com',
  birthDate: '1994-03-02',
  salary: 61000,
  role: 'Data Analyst',
  managerId: SIPHO,
};

export const WRITE_SCENARIOS: WriteScenario[] = [
  { name: 'add someone', method: 'POST', path: '/employees', body: newPerson, status: 201 },
  {
    name: 'refuse a field the client must not set',
    method: 'POST',
    path: '/employees',
    body: { ...newPerson, version: 5 },
    status: 400,
  },
  {
    name: 'refuse a duplicate email',
    method: 'POST',
    path: '/employees',
    body: { ...newPerson, email: 'thandi.nkosi@example.com' },
    status: 409,
    field: 'email',
  },
  {
    name: 'refuse a manager who does not exist',
    method: 'POST',
    path: '/employees',
    body: { ...newPerson, managerId: NOBODY },
    status: 404,
    field: 'managerId',
  },
  {
    name: 'save a change with the right version',
    method: 'PATCH',
    path: `/employees/${JOHAN}`,
    ifMatch: '"v1"',
    body: { role: 'Lead' },
    status: 200,
  },
  {
    name: 'refuse a change without If-Match',
    method: 'PATCH',
    path: `/employees/${JOHAN}`,
    body: { role: 'Lead' },
    status: 428,
  },
  {
    name: 'refuse a change from an old version',
    method: 'PATCH',
    path: `/employees/${JOHAN}`,
    ifMatch: '"v9"',
    body: { role: 'Lead' },
    status: 412,
  },
  {
    name: 'refuse an empty change',
    method: 'PATCH',
    path: `/employees/${JOHAN}`,
    ifMatch: '"v1"',
    body: {},
    status: 400,
  },
  {
    name: 'refuse being your own manager',
    method: 'PATCH',
    path: `/employees/${JOHAN}`,
    ifMatch: '"v1"',
    body: { managerId: JOHAN },
    status: 400,
    field: 'managerId',
  },
  {
    name: 'refuse a reporting loop',
    method: 'PATCH',
    path: `/employees/${SIPHO}`,
    ifMatch: '"v1"',
    body: { managerId: RUAN },
    status: 400,
    field: 'managerId',
  },
  {
    name: 'change someone who is not there',
    method: 'PATCH',
    path: `/employees/${NOBODY}`,
    ifMatch: '"v1"',
    body: { role: 'X' },
    status: 404,
  },
  {
    name: 'delete with the right version',
    method: 'DELETE',
    path: `/employees/${JOHAN}`,
    ifMatch: '"v1"',
    status: 204,
  },
  {
    name: 'refuse a delete without If-Match',
    method: 'DELETE',
    path: `/employees/${RUAN}`,
    status: 428,
  },
  {
    name: 'refuse a delete from an old version',
    method: 'DELETE',
    path: `/employees/${RUAN}`,
    ifMatch: '"v2"',
    status: 412,
  },
  {
    name: 'delete someone who is not there',
    method: 'DELETE',
    path: `/employees/${NOBODY}`,
    ifMatch: '"v1"',
    status: 404,
  },
];
