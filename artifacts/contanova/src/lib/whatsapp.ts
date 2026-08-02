const WA_URL =
  import.meta.env.VITE_WHATSAPP_URL ||
  (typeof window !== "undefined" && (window as any).__WA_URL__) ||
  "https://contanova-whatsapp.onrender.com";

async function waFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${WA_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    let msg = `Error ${res.status}`;
    try {
      const j = await res.json();
      msg = j.error || msg;
    } catch {}
    throw new Error(msg);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export type WaStatus = {
  status: string;
  connected: boolean;
  hasQr: boolean;
  error: string | null;
};

export type Reminder = {
  id: number;
  titulo: string;
  mensaje: string;
  phone: string | null;
  phones: string[] | null;
  tipo: string;
  fechaHora: string;
  recurrente: string | null;
  activo: boolean;
  lastSentAt: string | null;
  createdAt: string;
};

export type QueueItem = {
  id: number;
  phone: string;
  preview: string;
  status: string;
  error: string | null;
  campaignId: string | null;
  scheduledAt: string;
  sentAt: string | null;
  createdAt: string;
};

export const getWhatsAppStatus = () => waFetch<WaStatus>("/api/whatsapp/status");

export const getWhatsAppQr = () =>
  waFetch<{ connected: boolean; qr: string | null; status?: string }>("/api/whatsapp/qr");

export const logoutWhatsApp = () =>
  waFetch<{ ok: boolean }>("/api/whatsapp/logout", { method: "POST" });

export const sendWhatsAppBulk = (body: {
  phones?: string[];
  message?: string;
  items?: { phone: string; message: string }[];
  delayMs?: number;
  campaignId?: string;
}) =>
  waFetch<{ enqueued: number; delayMs: number; hint?: string }>("/api/whatsapp/send-bulk", {
    method: "POST",
    body: JSON.stringify(body),
  });

export const sendWhatsAppOne = (phone: string, message: string) =>
  waFetch<{ ok: boolean }>("/api/whatsapp/send", {
    method: "POST",
    body: JSON.stringify({ phone, message }),
  });

export const getWhatsAppQueue = (limit = 40) =>
  waFetch<{ items: QueueItem[]; counts: Record<string, number>; defaultDelayMs: number }>(
    `/api/whatsapp/queue?limit=${limit}`
  );

export const listReminders = () => waFetch<Reminder[]>("/api/reminders");

export const createReminder = (body: Partial<Reminder> & { titulo: string; mensaje: string; fechaHora: string }) =>
  waFetch<Reminder>("/api/reminders", { method: "POST", body: JSON.stringify(body) });

export const updateReminder = (id: number, body: Partial<Reminder>) =>
  waFetch<Reminder>(`/api/reminders/${id}`, { method: "PATCH", body: JSON.stringify(body) });

export const deleteReminder = (id: number) =>
  waFetch<void>(`/api/reminders/${id}`, { method: "DELETE" });

export const seedReminders = () =>
  waFetch<{ created: Reminder[] }>("/api/reminders/seed", { method: "POST" });

export { WA_URL };
