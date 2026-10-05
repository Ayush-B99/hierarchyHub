import { hash, verify } from '@node-rs/argon2';

// argon2id with the library defaults: 19 MiB of memory and 2 passes, the owasp recommendation.
// slow enough to make guessing expensive, quick enough (about 50 ms) for a person signing in

export const hashPassword = (password: string) => hash(password);

export async function passwordMatches(storedHash: string, password: string): Promise<boolean> {
  try {
    return await verify(storedHash, password);
  } catch {
    // a broken hash is a wrong password, never a crash
    return false;
  }
}

// checked when an email isn't found, so a wrong email takes as long as a wrong password and
// nobody can tell from the timing which emails have accounts
let dummyHash: Promise<string> | undefined;
export async function burnTime(password: string) {
  dummyHash ??= hash('not a real password, only used to take the same time');
  await passwordMatches(await dummyHash, password);
}
