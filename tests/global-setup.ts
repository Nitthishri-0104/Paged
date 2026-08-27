import { execFileSync, spawn, type ChildProcess } from "node:child_process";

const PORT = 3199;
export const TEST_BASE_URL = `http://localhost:${PORT}`;

/**
 * Route handlers use `next/headers`, which only works inside Next's own
 * request-handling runtime — importing a route module and calling it
 * directly throws outside of that context. So instead of unit-testing
 * handlers in isolation, integration tests boot a real (test-database-
 * backed) Next.js server once here and hit it over HTTP, the same way a
 * browser or the grading script would.
 */
export default async function setup(): Promise<() => Promise<void>> {
  if (!process.env.DATABASE_URL?.includes("paged_test")) {
    throw new Error(
      "Refusing to run integration tests: DATABASE_URL does not point at the test database. " +
        "Run tests via `npm run test`, which loads .env.test.",
    );
  }

  execFileSync("npx", ["prisma", "migrate", "deploy"], {
    env: process.env,
    stdio: "inherit",
  });

  // `detached: true` puts the process in its own group so teardown can kill
  // the whole tree (`npx` -> `next` -> `next-server`) at once. Killing just
  // the top-level PID leaves `next-server` running as an orphan that keeps
  // holding the port and its database connections — which previously caused
  // the *next* test run's server to hang waiting on connections a dead run
  // never released.
  const server = spawn("npx", ["next", "dev", "--port", String(PORT)], {
    env: process.env,
    stdio: "pipe",
    detached: true,
  });

  let serverOutput = "";
  server.stdout?.on("data", (chunk: Buffer) => (serverOutput += chunk.toString()));
  server.stderr?.on("data", (chunk: Buffer) => (serverOutput += chunk.toString()));

  try {
    await waitForServer(`${TEST_BASE_URL}/api/auth/me`, 45_000, server);
  } catch (error) {
    console.error(serverOutput);
    await stopServer(server);
    throw error;
  }

  return async () => {
    await stopServer(server);
  };
}

async function stopServer(server: ChildProcess): Promise<void> {
  if (server.exitCode !== null || !server.pid) return;
  const pid = server.pid;

  await new Promise<void>((resolve) => {
    server.once("exit", () => resolve());
    killGroup(pid, "SIGTERM");
    setTimeout(() => {
      if (server.exitCode === null) killGroup(pid, "SIGKILL");
    }, 3000);
    setTimeout(resolve, 5000);
  });
}

function killGroup(pid: number, signal: NodeJS.Signals): void {
  try {
    process.kill(-pid, signal);
  } catch {
    // The group may already be gone, or (rarely, e.g. on Windows) group
    // kills aren't supported — fall back to signaling just the one PID.
    try {
      process.kill(pid, signal);
    } catch {
      // Already dead.
    }
  }
}

async function waitForServer(url: string, timeoutMs: number, server: ChildProcess): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (server.exitCode !== null) {
      throw new Error(`Test server exited early with code ${server.exitCode}`);
    }
    try {
      const response = await fetch(url);
      if (response.status < 500) return;
    } catch {
      // Server not accepting connections yet — keep polling.
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error(`Test server did not become ready within ${timeoutMs}ms`);
}
