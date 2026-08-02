import baileys from "@whiskeysockets/baileys";
import { q } from "./db.js";

const { BufferJSON, initAuthCreds, proto } = baileys;

/**
 * Baileys auth state persisted in Postgres (survives Render/Railway restarts).
 */
export async function usePostgresAuthState(sessionId = "default") {
  await q(`
    CREATE TABLE IF NOT EXISTS wa_auth_state (
      session_id TEXT NOT NULL,
      key TEXT NOT NULL,
      value JSONB,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (session_id, key)
    )
  `);

  const read = async (key) => {
    const r = await q(
      `SELECT value FROM wa_auth_state WHERE session_id = $1 AND key = $2`,
      [sessionId, key]
    );
    if (!r.rows[0]?.value) return null;
    return JSON.parse(JSON.stringify(r.rows[0].value), BufferJSON.reviver);
  };

  const write = async (key, value) => {
    const payload = JSON.parse(JSON.stringify(value, BufferJSON.replacer));
    await q(
      `INSERT INTO wa_auth_state (session_id, key, value, updated_at)
       VALUES ($1, $2, $3::jsonb, NOW())
       ON CONFLICT (session_id, key)
       DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
      [sessionId, key, JSON.stringify(payload)]
    );
  };

  const remove = async (key) => {
    await q(`DELETE FROM wa_auth_state WHERE session_id = $1 AND key = $2`, [
      sessionId,
      key,
    ]);
  };

  const creds = (await read("creds")) || initAuthCreds();

  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const data = {};
          await Promise.all(
            ids.map(async (id) => {
              let value = await read(`${type}-${id}`);
              if (type === "app-state-sync-key" && value) {
                value = proto.Message.AppStateSyncKeyData.fromObject(value);
              }
              data[id] = value;
            })
          );
          return data;
        },
        set: async (data) => {
          const tasks = [];
          for (const category of Object.keys(data)) {
            for (const id of Object.keys(data[category])) {
              const value = data[category][id];
              const key = `${category}-${id}`;
              tasks.push(value ? write(key, value) : remove(key));
            }
          }
          await Promise.all(tasks);
        },
      },
    },
    saveCreds: async () => write("creds", creds),
    clearAuth: async () => {
      await q(`DELETE FROM wa_auth_state WHERE session_id = $1`, [sessionId]);
    },
  };
}
