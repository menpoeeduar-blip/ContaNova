import {
  makeWASocket,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
} from "@whiskeysockets/baileys";
import qrcode from "qrcode";
import pino from "pino";
import { usePostgresAuthState } from "./auth-pg.js";

const logger = pino({ level: process.env.LOG_LEVEL || "info" });
const SESSION_ID = process.env.WA_SESSION_ID || "default";

let sock = null;
let latestQr = null;
let connectionStatus = "disconnected"; // disconnected | qr | connecting | connected
let lastError = null;
let restartTimer = null;
let clearAuthFn = null;

export function getWhatsAppState() {
  return {
    status: connectionStatus,
    hasQr: !!latestQr,
    qr: latestQr,
    error: lastError,
    connected: connectionStatus === "connected",
  };
}

export function normalizePhone(raw) {
  let digits = String(raw || "").replace(/\D/g, "");
  if (!digits) return null;
  if (digits.length === 10 && digits.startsWith("3")) digits = "57" + digits;
  if (digits.length === 11 && digits.startsWith("3")) digits = "57" + digits.slice(-10);
  return digits;
}

export function toJid(phone) {
  const n = normalizePhone(phone);
  if (!n) return null;
  return `${n}@s.whatsapp.net`;
}

export async function startWhatsApp() {
  const { state, saveCreds, clearAuth } = await usePostgresAuthState(SESSION_ID);
  clearAuthFn = clearAuth;

  const { version } = await fetchLatestBaileysVersion();

  connectionStatus = "connecting";
  latestQr = null;
  lastError = null;

  sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    logger,
    printQRInTerminal: false,
    syncFullHistory: false,
    markOnlineOnConnect: false,
    browser: ["ContaNova", "Chrome", "120.0.0"],
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      connectionStatus = "qr";
      try {
        latestQr = await qrcode.toDataURL(qr);
      } catch (e) {
        latestQr = null;
        lastError = e.message;
      }
    }

    if (connection === "open") {
      connectionStatus = "connected";
      latestQr = null;
      lastError = null;
      logger.info("WhatsApp connected");
    }

    if (connection === "close") {
      const code = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = code !== DisconnectReason.loggedOut;
      connectionStatus = "disconnected";
      latestQr = null;
      lastError = lastDisconnect?.error?.message || `closed:${code}`;
      logger.warn({ code }, "WhatsApp disconnected");

      if (!shouldReconnect && clearAuthFn) {
        await clearAuthFn();
      }

      if (restartTimer) clearTimeout(restartTimer);
      restartTimer = setTimeout(() => startWhatsApp().catch(logger.error), shouldReconnect ? 3000 : 1000);
    }
  });

  return sock;
}

export async function logoutWhatsApp() {
  try {
    if (sock) await sock.logout();
  } catch {}
  sock = null;
  connectionStatus = "disconnected";
  latestQr = null;
  if (clearAuthFn) await clearAuthFn();
  await startWhatsApp();
}

export async function sendTextMessage(phone, text) {
  if (!sock || connectionStatus !== "connected") {
    throw new Error("WhatsApp no está conectado. Escanea el QR primero.");
  }
  const jid = toJid(phone);
  if (!jid) throw new Error(`Teléfono inválido: ${phone}`);

  try {
    const [result] = await sock.onWhatsApp(jid.replace("@s.whatsapp.net", ""));
    if (result && result.exists === false) {
      throw new Error("El número no tiene WhatsApp");
    }
  } catch (e) {
    if (e.message?.includes("no tiene WhatsApp")) throw e;
  }

  await sock.sendMessage(jid, { text });
  return { ok: true, jid };
}

export function isConnected() {
  return connectionStatus === "connected" && !!sock;
}
