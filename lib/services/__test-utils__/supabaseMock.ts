import { vi } from "vitest";

/**
 * Minimal chainable mock for the subset of the Supabase query builder used by
 * lib/services/*. Each table can have queued responses for `.single()` (used
 * after insert/select chains); `.update()/.eq()` chains resolve to `{ error: null }`
 * by default. All calls are recorded on `calls` for assertions.
 */
export function createSupabaseMock(singleResponses: Record<string, unknown[]> = {}) {
  const queue: Record<string, unknown[]> = {};
  for (const [table, responses] of Object.entries(singleResponses)) {
    queue[table] = [...responses];
  }

  const calls: { table: string; method: string; args: unknown[] }[] = [];

  function from(table: string) {
    const builder: Record<string, unknown> = {};
    const record = (method: string, args: unknown[]) => {
      calls.push({ table, method, args });
      return builder;
    };

    builder.insert = (...args: unknown[]) => record("insert", args);
    builder.update = (...args: unknown[]) => record("update", args);
    builder.select = (...args: unknown[]) => record("select", args);
    builder.eq = (...args: unknown[]) => record("eq", args);
    builder.neq = (...args: unknown[]) => record("neq", args);
    builder.in = (...args: unknown[]) => record("in", args);
    builder.limit = (...args: unknown[]) => record("limit", args);
    builder.single = () => {
      record("single", []);
      const next = queue[table]?.shift();
      return Promise.resolve(next ?? { data: null, error: null });
    };
    // update()/insert() chains that don't call .single() are awaited directly
    builder.then = (resolve: (v: { data: null; error: null }) => unknown) =>
      resolve({ data: null, error: null });

    return builder;
  }

  return {
    client: { from: vi.fn(from) },
    calls,
  };
}
