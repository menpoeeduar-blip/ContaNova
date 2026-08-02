import { pool, q } from "./db.js";
import { sendTextMessage, isConnected, normalizePhone } from "./whatsapp.js";

let queueBusy = false;
let reminderBusy = false;

/** Default delay between messages (ms) — anti-ban */
export function getDefaultDelayMs() {
  const min = Number(process.env.WA_DELAY_MIN_MS || 4000);
  const max = Number(process.env.WA_DELAY_MAX_MS || 9000);
  return min + Math.floor(Math.random() * Math.max(1, max - min));
}

/**
 * Enqueue bulk messages with staggered schedule.
 * Accepts either { phones, message } or { items: [{ phone, message }] }
 */
export async function enqueueMessages({ phones, message, items, delayMs, campaignId }) {
  const baseDelay = Number(delayMs) || getDefaultDelayMs();
  const now = Date.now();
  const ids = [];

  const jobs = [];
  if (Array.isArray(items) && items.length) {
    for (const it of items) {
      const phone = normalizePhone(it.phone);
      if (!phone || !it.message) continue;
      jobs.push({ phone, message: String(it.message) });
    }
  } else if (Array.isArray(phones) && message) {
    for (const raw of phones) {
      const phone = normalizePhone(raw);
      if (!phone) continue;
      jobs.push({ phone, message: String(message) });
    }
  }

  let i = 0;
  for (const job of jobs) {
    const scheduled = new Date(now + i * baseDelay);
    const r = await q(
      `INSERT INTO wa_message_queue (phone, message, campaign_id, scheduled_at)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [job.phone, job.message, campaignId || null, scheduled.toISOString()]
    );
    ids.push(r.rows[0].id);
    i += 1;
  }
  return { enqueued: ids.length, ids, delayMs: baseDelay };
}

export async function processQueueOnce() {
  if (queueBusy || !isConnected()) return;
  queueBusy = true;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const next = await client.query(
      `SELECT id, phone, message FROM wa_message_queue
       WHERE status = 'pending' AND scheduled_at <= NOW()
       ORDER BY scheduled_at ASC
       LIMIT 1
       FOR UPDATE SKIP LOCKED`
    );
    if (!next.rows[0]) {
      await client.query("COMMIT");
      return;
    }

    const job = next.rows[0];
    await client.query(`UPDATE wa_message_queue SET status = 'sending' WHERE id = $1`, [job.id]);
    await client.query("COMMIT");

    try {
      await sendTextMessage(job.phone, job.message);
      await q(
        `UPDATE wa_message_queue SET status = 'sent', sent_at = NOW(), error = NULL WHERE id = $1`,
        [job.id]
      );
    } catch (e) {
      await q(
        `UPDATE wa_message_queue SET status = 'failed', error = $2 WHERE id = $1`,
        [job.id, e.message || String(e)]
      );
    }
  } catch (e) {
    try {
      await client.query("ROLLBACK");
    } catch {}
    console.error("queue worker tx", e);
  } finally {
    client.release();
    queueBusy = false;
  }
}

export async function processRemindersOnce() {
  if (reminderBusy) return;
  reminderBusy = true;
  try {
    const due = await q(
      `SELECT * FROM wa_reminders
       WHERE activo = TRUE AND fecha_hora <= NOW()
         AND (last_sent_at IS NULL OR last_sent_at < fecha_hora)
       ORDER BY fecha_hora ASC
       LIMIT 20`
    );

    for (const rem of due.rows) {
      const phones = [];
      if (rem.phone) phones.push(rem.phone);
      if (Array.isArray(rem.phones)) phones.push(...rem.phones);
      const unique = [...new Set(phones.map(normalizePhone).filter(Boolean))];

      if (unique.length && isConnected()) {
        const text = `*${rem.titulo}*\n\n${rem.mensaje}`;
        await enqueueMessages({
          phones: unique,
          message: text,
          delayMs: getDefaultDelayMs(),
          campaignId: `reminder-${rem.id}`,
        });
      } else if (unique.length && !isConnected()) {
        // Keep due until WhatsApp connects — don't advance schedule
        continue;
      }

      if (rem.recurrente === "daily") {
        await q(
          `UPDATE wa_reminders SET last_sent_at = NOW(), fecha_hora = fecha_hora + INTERVAL '1 day' WHERE id = $1`,
          [rem.id]
        );
      } else if (rem.recurrente === "weekly") {
        await q(
          `UPDATE wa_reminders SET last_sent_at = NOW(), fecha_hora = fecha_hora + INTERVAL '7 days' WHERE id = $1`,
          [rem.id]
        );
      } else if (rem.recurrente === "monthly") {
        await q(
          `UPDATE wa_reminders SET last_sent_at = NOW(), fecha_hora = fecha_hora + INTERVAL '1 month' WHERE id = $1`,
          [rem.id]
        );
      } else if (unique.length === 0) {
        // No phones: mark as processed (in-app only)
        await q(
          `UPDATE wa_reminders SET last_sent_at = NOW(), activo = FALSE WHERE id = $1`,
          [rem.id]
        );
      } else {
        await q(
          `UPDATE wa_reminders SET last_sent_at = NOW(), activo = FALSE WHERE id = $1`,
          [rem.id]
        );
      }
    }
  } finally {
    reminderBusy = false;
  }
}

export function startWorkers() {
  setInterval(() => {
    processQueueOnce().catch((e) => console.error("queue worker", e));
  }, 2000);

  setInterval(() => {
    processRemindersOnce().catch((e) => console.error("reminder worker", e));
  }, 15000);
}
