export interface AppConfig {
  port: number;
  databaseUrl: string;
}

const DEFAULT_DATABASE_URL = 'postgres://tickets:tickets@localhost:5434/tickets';

/** Reads and validates the process environment once at startup, failing fast on bad input. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const port = Number(env.PORT ?? 3000);
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error(`Invalid PORT: "${env.PORT}"`);
  }

  return {
    port,
    databaseUrl: env.DATABASE_URL ?? DEFAULT_DATABASE_URL,
  };
}
