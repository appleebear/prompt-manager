import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { PromptManagerStateSnapshot } from '../prompt-manager';

declare global {
  // eslint-disable-next-line no-var
  var __promptManagerStateDb: DatabaseSync | undefined;
}

const DEFAULT_DB_PATH = resolve(process.cwd(), 'data', 'prompt-manager.sqlite');

function getDatabase(): DatabaseSync {
  if (globalThis.__promptManagerStateDb) {
    return globalThis.__promptManagerStateDb;
  }

  const dbPath = process.env.PROMPT_MANAGER_DB_PATH?.trim() || DEFAULT_DB_PATH;
  mkdirSync(dirname(dbPath), { recursive: true });

  const db = new DatabaseSync(dbPath);
  db.exec(`
    CREATE TABLE IF NOT EXISTS app_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  globalThis.__promptManagerStateDb = db;
  return db;
}

export function loadStateSnapshot(): PromptManagerStateSnapshot | null {
  const db = getDatabase();
  const row = db.prepare('SELECT json FROM app_state WHERE id = 1').get() as { json: string } | undefined;

  if (!row?.json) {
    return null;
  }

  try {
    return JSON.parse(row.json) as PromptManagerStateSnapshot;
  } catch {
    return null;
  }
}

export function saveStateSnapshot(snapshot: PromptManagerStateSnapshot): void {
  const db = getDatabase();
  const payload = JSON.stringify(snapshot);

  db.prepare(
    `
      INSERT INTO app_state (id, json, updated_at)
      VALUES (1, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        json = excluded.json,
        updated_at = excluded.updated_at
    `,
  ).run(payload, new Date().toISOString());
}
