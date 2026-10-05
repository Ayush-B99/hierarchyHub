/**
 * who can see and change whom (adr 0017). used by the api, the mock api and the screens, so
 * all three always agree. the api checks the same rules again against the database
 *
 * the idea: your reach is everyone below you in the organisation. you can change people in
 * your reach, and only ever move them to a manager who is also in your reach (or you). about
 * yourself you can only change your name and email. nobody can change anyone above or beside
 * them, so a junior can never make their boss report to them
 */

interface Person {
  id: string;
  managerId: string | null;
}

/** who is looking: their employee record and whether they're an admin */
export interface Viewer {
  employeeId: string;
  isAdmin: boolean;
}

/** the only fields you can change about yourself */
export const CONTACT_FIELDS = ['firstName', 'lastName', 'email'] as const;

/** fields only you and the people above you can see */
export const PRIVATE_FIELDS = ['salary', 'birthDate'] as const;

/** true when `employeeId` sits somewhere below `managerId`, at any depth (never themselves) */
export function isBelow(
  managerId: string,
  employeeId: string,
  byId: ReadonlyMap<string, Person>,
): boolean {
  const seen = new Set<string>();
  let current = byId.get(employeeId)?.managerId ?? null;
  while (current && !seen.has(current)) {
    if (current === managerId) return true;
    seen.add(current);
    current = byId.get(current)?.managerId ?? null;
  }
  return false;
}

/** at the top of the organisation, with no manager, like the ceo */
export const isAtTop = (viewer: Viewer, byId: ReadonlyMap<string, Person>) =>
  byId.has(viewer.employeeId) && byId.get(viewer.employeeId)?.managerId === null;

export interface Permissions {
  /** see their salary and birth date */
  seePrivate: boolean;
  /** change their name and email */
  editContact: boolean;
  /** change anything else: role, salary, birth date, employee number */
  editAll: boolean;
  /** give them a new manager */
  move: boolean;
  /** delete them */
  remove: boolean;
  /** make them an admin, or turn their account off */
  manageAccount: boolean;
}

export function permissionsFor(
  viewer: Viewer,
  targetId: string,
  byId: ReadonlyMap<string, Person>,
): Permissions {
  const self = viewer.employeeId === targetId;
  const below = isBelow(viewer.employeeId, targetId, byId);
  return {
    seePrivate: self || below,
    editContact: self || below,
    editAll: below,
    move: below,
    remove: below && viewer.isAdmin,
    manageAccount: below && viewer.isAdmin,
  };
}

/**
 * can someone in your reach be given this manager? only you or someone below you, so nobody
 * can be moved out of your part of the organisation or put under someone senior. no manager
 * at all (the very top) is only for people who are at the top themselves
 */
export function canBeTheirManager(
  viewer: Viewer,
  managerId: string | null,
  byId: ReadonlyMap<string, Person>,
): boolean {
  if (managerId === null) return isAtTop(viewer, byId);
  return managerId === viewer.employeeId || isBelow(viewer.employeeId, managerId, byId);
}

/** only admins add people, and only into their own part of the organisation */
export const canAdd = (
  viewer: Viewer,
  managerId: string | null,
  byId: ReadonlyMap<string, Person>,
) => viewer.isAdmin && canBeTheirManager(viewer, managerId, byId);

/** anything a manager can do (edit or move) to at least one person */
export const managesAnyone = (viewer: Viewer, people: readonly Person[]) =>
  people.some((p) => p.managerId === viewer.employeeId);

/** the fields in a change you aren't allowed to make about yourself */
export function fieldsYouCantChangeAboutYourself(changes: object): string[] {
  return Object.keys(changes).filter(
    (field) => !(CONTACT_FIELDS as readonly string[]).includes(field),
  );
}
