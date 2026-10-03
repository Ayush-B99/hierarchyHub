// hosts that can only be your own machine (or the local docker database)
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);
const LOCAL_DATABASES = new Set(['hierarchy_hub', 'hierarchy_hub_test']);

/**
 * sample data must never reach a real database (srs constraint c-01), so the seed
 * script refuses to run unless the target is clearly a local development database
 * returns the reason it's unsafe, or null when it's fine
 */
export function whyNotSafeToSeed(
  databaseUrl: string | undefined,
  nodeEnv: string | undefined,
): string | null {
  if (nodeEnv === 'production') return 'NODE_ENV is production';
  if (!databaseUrl) return 'DATABASE_URL is not set';

  let url: URL;
  try {
    url = new URL(databaseUrl);
  } catch {
    return 'DATABASE_URL is not a valid url';
  }
  if (!LOCAL_HOSTS.has(url.hostname))
    return `the database host "${url.hostname}" is not this machine`;

  const database = url.pathname.replace(/^\//, '');
  if (!LOCAL_DATABASES.has(database))
    return `the database "${database}" is not one of the local ones`;
  return null;
}
