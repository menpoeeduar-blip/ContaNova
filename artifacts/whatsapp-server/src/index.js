import express from "express";
import cors from "cors";
import { initDb, q } from "./db.js";
import {
  startWhatsApp,
  getWhatsAppState,
  logoutWhatsApp,
  sendTextMessage,
  normalizePhone,
} from "./whatsapp.js";
import { enqueueMessages, startWorkers, getDefaultDelayMs } from "./queue.js";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const app = express();
const PORT = Number(process.env.PORT || 8090);

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));

app.get("/api/healthz", (_req, res) => {
  res.json({ status: "ok", service: "whatsapp-server" });
});

// ── WhatsApp connection ─────────────────────────────────────
app.get("/api/whatsapp/status", (_req, res) => {
  const s = getWhatsAppState();
  res.json({
    status: s.status,
    connected: s.connected,
    hasQr: s.hasQr,
    error: s.error,
  });
});

app.get("/api/whatsapp/qr", (_req, res) => {
  const s = getWhatsAppState();
  if (s.connected) return res.json({ connected: true, qr: null });
  if (!s.qr) return res.status(404).json({ error: "QR no disponible aún", status: s.status });
  res.json({ connected: false, qr: s.qr, status: s.status });
});

app.post("/api/whatsapp/logout", async (_req, res) => {
  try {
    await logoutWhatsApp();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/whatsapp/send", async (req, res) => {
  try {
    const { phone, message } = req.body || {};
    if (!phone || !message) return res.status(400).json({ error: "phone y message requeridos" });
    const result = await sendTextMessage(phone, message);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/whatsapp/send-bulk", async (req, res) => {
  try {
    const { phones, message, items, delayMs, campaignId } = req.body || {};
    const hasItems = Array.isArray(items) && items.length > 0;
    const hasPhones = Array.isArray(phones) && phones.length > 0 && message;
    if (!hasItems && !hasPhones) {
      return res.status(400).json({
        error: "Envía items[{phone,message}] o phones[] + message",
      });
    }
    const result = await enqueueMessages({ phones, message, items, delayMs, campaignId });
    res.status(201).json({
      ...result,
      hint: `Los mensajes se enviarán con ~${Math.round(result.delayMs / 1000)}s de intervalo para reducir riesgo de ban.`,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/whatsapp/queue", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const r = await q(
      `SELECT id, phone, LEFT(message, 80) AS preview, status, error, campaign_id AS "campaignId",
              scheduled_at AS "scheduledAt", sent_at AS "sentAt", created_at AS "createdAt"
       FROM wa_message_queue
       ORDER BY id DESC LIMIT $1`,
      [limit]
    );
    const counts = await q(
      `SELECT status, count(*)::int AS n FROM wa_message_queue GROUP BY status`
    );
    res.json({
      items: r.rows,
      counts: Object.fromEntries(counts.rows.map((x) => [x.status, x.n])),
      defaultDelayMs: getDefaultDelayMs(),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Reminders / notifications ───────────────────────────────
app.get("/api/reminders", async (_req, res) => {
  try {
    const r = await q(
      `SELECT id, titulo, mensaje, phone, phones, tipo,
              fecha_hora AS "fechaHora", recurrente, activo,
              last_sent_at AS "lastSentAt", created_at AS "createdAt"
       FROM wa_reminders ORDER BY fecha_hora DESC`
    );
    res.json(r.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/reminders", async (req, res) => {
  try {
    const b = req.body || {};
    if (!b.titulo || !b.mensaje || !b.fechaHora) {
      return res.status(400).json({ error: "titulo, mensaje y fechaHora requeridos" });
    }
    const phones = Array.isArray(b.phones)
      ? b.phones.map(normalizePhone).filter(Boolean)
      : b.phone
        ? [normalizePhone(b.phone)].filter(Boolean)
        : [];
    const r = await q(
      `INSERT INTO wa_reminders (titulo, mensaje, phone, phones, tipo, fecha_hora, recurrente, activo)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING id, titulo, mensaje, phone, phones, tipo,
                 fecha_hora AS "fechaHora", recurrente, activo,
                 last_sent_at AS "lastSentAt", created_at AS "createdAt"`,
      [
        b.titulo,
        b.mensaje,
        phones[0] || null,
        phones,
        b.tipo || "recordatorio",
        b.fechaHora,
        b.recurrente || null,
        b.activo !== false,
      ]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.patch("/api/reminders/:id", async (req, res) => {
  try {
    const b = req.body || {};
    const cur = await q(`SELECT * FROM wa_reminders WHERE id = $1`, [req.params.id]);
    if (!cur.rows[0]) return res.status(404).json({ error: "Not found" });
    const c = cur.rows[0];
    const phones = Array.isArray(b.phones)
      ? b.phones.map(normalizePhone).filter(Boolean)
      : b.phone !== undefined
        ? [normalizePhone(b.phone)].filter(Boolean)
        : c.phones;

    const r = await q(
      `UPDATE wa_reminders SET
         titulo = $1, mensaje = $2, phone = $3, phones = $4, tipo = $5,
         fecha_hora = $6, recurrente = $7, activo = $8
       WHERE id = $9
       RETURNING id, titulo, mensaje, phone, phones, tipo,
                 fecha_hora AS "fechaHora", recurrente, activo,
                 last_sent_at AS "lastSentAt", created_at AS "createdAt"`,
      [
        b.titulo ?? c.titulo,
        b.mensaje ?? c.mensaje,
        (phones && phones[0]) || null,
        phones || c.phones,
        b.tipo ?? c.tipo,
        b.fechaHora ?? c.fecha_hora,
        b.recurrente !== undefined ? b.recurrente : c.recurrente,
        b.activo !== undefined ? b.activo : c.activo,
        req.params.id,
      ]
    );
    res.json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete("/api/reminders/:id", async (req, res) => {
  try {
    await q(`DELETE FROM wa_reminders WHERE id = $1`, [req.params.id]);
    res.status(204).end();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/reminders/seed", async (_req, res) => {
  try {
    const samples = [
      {
        titulo: "Recordatorio de cobranza diaria",
        mensaje: "Buenos días. Le recordamos revisar saldos pendientes de cartera ContaNova.",
        tipo: "cobranza",
        recurrente: "daily",
        minutos: 2,
      },
      {
        titulo: "Cierre de caja",
        mensaje: "Recordatorio: realizar cierre de caja y conciliación bancaria.",
        tipo: "agenda",
        recurrente: "daily",
        minutos: 5,
      },
      {
        titulo: "Seguimiento CRM semanal",
        mensaje: "Revisar oportunidades en negociación y actualizar pipeline.",
        tipo: "notificacion",
        recurrente: "weekly",
        minutos: 10,
      },
      {
        titulo: "Pago a proveedores",
        mensaje: "Verificar cuentas por pagar próximas a vencer esta semana.",
        tipo: "recordatorio",
        recurrente: null,
        minutos: 15,
      },
      {
        titulo: "Reporte mensual inventario",
        mensaje: "Generar reporte de stock mínimo y valorización de inventario.",
        tipo: "notificacion",
        recurrente: "monthly",
        minutos: 20,
      },
    ];

    const created = [];
    for (const s of samples) {
      const fecha = new Date(Date.now() + s.minutos * 60 * 1000).toISOString();
      const r = await q(
        `INSERT INTO wa_reminders (titulo, mensaje, tipo, fecha_hora, recurrente, activo)
         VALUES ($1,$2,$3,$4,$5,TRUE)
         RETURNING id, titulo, tipo, fecha_hora AS "fechaHora", recurrente`,
        [s.titulo, s.mensaje, s.tipo, fecha, s.recurrente]
      );
      created.push(r.rows[0]);
    }
    res.status(201).json({ created });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

await initDb();
await startWhatsApp();
startWorkers();

app.listen(PORT, "0.0.0.0", () => {
  console.log(`WhatsApp server listening on :${PORT}`);

  // Keep-alive for free hosts (Render) that sleep after idle
  const selfUrl = process.env.RENDER_EXTERNAL_URL || process.env.KEEPALIVE_URL;
  if (selfUrl) {
    setInterval(() => {
      fetch(`${selfUrl.replace(/\/$/, "")}/api/healthz`).catch(() => {});
    }, 4 * 60 * 1000);
  }
});
