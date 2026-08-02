import pg from "pg";

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("localhost")
    ? false
    : { rejectUnauthorized: false },
  max: 5,
});

export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS wa_message_queue (
      id SERIAL PRIMARY KEY,
      phone TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      error TEXT,
      campaign_id TEXT,
      scheduled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      sent_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS wa_reminders (
      id SERIAL PRIMARY KEY,
      titulo TEXT NOT NULL,
      mensaje TEXT NOT NULL,
      phone TEXT,
      phones TEXT[],
      tipo TEXT NOT NULL DEFAULT 'recordatorio',
      fecha_hora TIMESTAMPTZ NOT NULL,
      recurrente TEXT,
      activo BOOLEAN NOT NULL DEFAULT TRUE,
      last_sent_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS wa_settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_wa_queue_pending
      ON wa_message_queue (status, scheduled_at)
      WHERE status = 'pending';

    CREATE INDEX IF NOT EXISTS idx_wa_reminders_due
      ON wa_reminders (activo, fecha_hora);
  `);
}

export const q = (sql, params) => pool.query(sql, params);
