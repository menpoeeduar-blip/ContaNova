import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Bell,
  Plus,
  Trash2,
  Power,
  Sparkles,
  Clock,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";
import { WhatsAppConnectPanel } from "@/components/whatsapp-connect";
import {
  listReminders,
  createReminder,
  updateReminder,
  deleteReminder,
  seedReminders,
  getWhatsAppQueue,
  type Reminder,
} from "@/lib/whatsapp";

const TIPOS = [
  { value: "recordatorio", label: "Recordatorio" },
  { value: "notificacion", label: "Notificación" },
  { value: "cobranza", label: "Cobranza" },
  { value: "agenda", label: "Agenda" },
];

function toLocalInputValue(iso?: string) {
  const d = iso ? new Date(iso) : new Date(Date.now() + 5 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function RecordatoriosPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    titulo: "",
    mensaje: "",
    phone: "",
    phones: "",
    tipo: "recordatorio",
    fechaHora: toLocalInputValue(),
    recurrente: "none",
  });

  const { data: reminders = [], isLoading } = useQuery({
    queryKey: ["reminders"],
    queryFn: listReminders,
    refetchInterval: 10000,
  });

  const { data: queue } = useQuery({
    queryKey: ["wa-queue"],
    queryFn: () => getWhatsAppQueue(30),
    refetchInterval: 5000,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["reminders"] });
    queryClient.invalidateQueries({ queryKey: ["wa-queue"] });
  };

  const createMut = useMutation({
    mutationFn: createReminder,
    onSuccess: () => {
      toast.success("Recordatorio creado");
      setOpen(false);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const seedMut = useMutation({
    mutationFn: seedReminders,
    onSuccess: (r) => {
      toast.success(`${r.created.length} recordatorios de ejemplo creados`);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, activo }: { id: number; activo: boolean }) =>
      updateReminder(id, { activo }),
    onSuccess: () => invalidate(),
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: deleteReminder,
    onSuccess: () => {
      toast.success("Eliminado");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const submit = () => {
    if (!form.titulo.trim() || !form.mensaje.trim() || !form.fechaHora) {
      toast.warning("Completa título, mensaje y fecha");
      return;
    }
    const phones = form.phones
      .split(/[\n,;]+/)
      .map((p) => p.trim())
      .filter(Boolean);
    if (form.phone.trim()) phones.unshift(form.phone.trim());

    createMut.mutate({
      titulo: form.titulo.trim(),
      mensaje: form.mensaje.trim(),
      phone: form.phone.trim() || undefined,
      phones: phones.length ? phones : undefined,
      tipo: form.tipo,
      fechaHora: new Date(form.fechaHora).toISOString(),
      recurrente: form.recurrente === "none" ? null : form.recurrente,
      activo: true,
    } as any);
  };

  const tipoBadge = (tipo: string) => {
    const map: Record<string, string> = {
      cobranza: "bg-rose-600/80",
      notificacion: "bg-indigo-600/80",
      agenda: "bg-sky-600/80",
      recordatorio: "bg-amber-600/80",
    };
    return map[tipo] || "bg-slate-600";
  };

  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-6 rounded-2xl border border-slate-800 shadow-xl text-white">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-500/20 text-indigo-300 rounded-xl border border-indigo-500/30">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Recordatorios & Notificaciones</h1>
            <p className="text-slate-400 text-sm">
              Agenda avisos y envíos por WhatsApp (Baileys) con intervalos seguros.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="border-slate-700 bg-slate-800/80 text-white"
            disabled={seedMut.isPending}
            onClick={() => seedMut.mutate()}
          >
            <Sparkles className="w-4 h-4 mr-1.5" />
            Crear ejemplos
          </Button>
          <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => setOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" />
            Nuevo
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1">
          <WhatsAppConnectPanel />
        </div>
        <Card className="lg:col-span-2 border-slate-800 bg-slate-900/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-emerald-400" />
              Cola de envíos
            </CardTitle>
            <CardDescription>
              Pendientes: {queue?.counts?.pending ?? 0} · Enviados: {queue?.counts?.sent ?? 0} ·
              Fallidos: {queue?.counts?.failed ?? 0}
              {queue?.defaultDelayMs != null && (
                <> · Intervalo tipico ~{Math.round(queue.defaultDelayMs / 1000)}s</>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!queue?.items?.length ? (
              <p className="text-sm text-slate-500 py-6 text-center">Sin mensajes en cola aún.</p>
            ) : (
              <div className="rounded-xl border border-slate-800 overflow-hidden max-h-64 overflow-y-auto">
                <Table>
                  <TableHeader className="bg-slate-950">
                    <TableRow className="border-slate-800">
                      <TableHead>Teléfono</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Vista previa</TableHead>
                      <TableHead>Programado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {queue.items.map((it) => (
                      <TableRow key={it.id} className="border-slate-800/60">
                        <TableCell className="font-mono text-xs">{it.phone}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {it.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-slate-400 max-w-[220px] truncate">
                          {it.preview}
                        </TableCell>
                        <TableCell className="text-xs text-slate-500">
                          {new Date(it.scheduledAt).toLocaleString("es-CO")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-800 bg-slate-900/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-400" />
            Listado de recordatorios
          </CardTitle>
          <CardDescription>
            Si tienen teléfono, se encolan a WhatsApp al llegar la fecha. Sin teléfono quedan como
            aviso interno.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-slate-800 overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-950">
                <TableRow className="border-slate-800">
                  <TableHead>Título</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Recurrencia</TableHead>
                  <TableHead>Teléfonos</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                      Cargando...
                    </TableCell>
                  </TableRow>
                ) : reminders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                      No hay recordatorios. Crea uno o usa &quot;Crear ejemplos&quot;.
                    </TableCell>
                  </TableRow>
                ) : (
                  reminders.map((r: Reminder) => (
                    <TableRow key={r.id} className="border-slate-800/60">
                      <TableCell>
                        <div className="font-medium text-white">{r.titulo}</div>
                        <div className="text-xs text-slate-500 line-clamp-1 max-w-xs">{r.mensaje}</div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${tipoBadge(r.tipo)} text-white`}>{r.tipo}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-slate-300">
                        {new Date(r.fechaHora).toLocaleString("es-CO")}
                      </TableCell>
                      <TableCell className="text-sm text-slate-400">
                        {r.recurrente || "única"}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-slate-400">
                        {(r.phones?.length ? r.phones : r.phone ? [r.phone] : []).join(", ") || "—"}
                      </TableCell>
                      <TableCell>
                        {r.activo ? (
                          <Badge className="bg-emerald-600/80 text-white">Activo</Badge>
                        ) : (
                          <Badge variant="outline" className="text-slate-400">
                            Inactivo
                          </Badge>
                        )}
                        {r.lastSentAt && (
                          <div className="text-[10px] text-slate-500 mt-1">
                            Enviado {new Date(r.lastSentAt).toLocaleString("es-CO")}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 border-slate-700"
                            onClick={() => toggleMut.mutate({ id: r.id, activo: !r.activo })}
                          >
                            <Power className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 border-rose-800/50 text-rose-300"
                            onClick={() => {
                              if (confirm("¿Eliminar este recordatorio?")) deleteMut.mutate(r.id);
                            }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Nuevo recordatorio / notificación</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input
              placeholder="Título"
              className="bg-slate-950 border-slate-800"
              value={form.titulo}
              onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
            />
            <Textarea
              placeholder="Mensaje"
              rows={4}
              className="bg-slate-950 border-slate-800"
              value={form.mensaje}
              onChange={(e) => setForm((f) => ({ ...f, mensaje: e.target.value }))}
            />
            <div className="grid grid-cols-2 gap-3">
              <Select value={form.tipo} onValueChange={(v) => setForm((f) => ({ ...f, tipo: v }))}>
                <SelectTrigger className="bg-slate-950 border-slate-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-white">
                  {TIPOS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={form.recurrente}
                onValueChange={(v) => setForm((f) => ({ ...f, recurrente: v }))}
              >
                <SelectTrigger className="bg-slate-950 border-slate-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-white">
                  <SelectItem value="none">Una vez</SelectItem>
                  <SelectItem value="daily">Diario</SelectItem>
                  <SelectItem value="weekly">Semanal</SelectItem>
                  <SelectItem value="monthly">Mensual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Input
              type="datetime-local"
              className="bg-slate-950 border-slate-800"
              value={form.fechaHora}
              onChange={(e) => setForm((f) => ({ ...f, fechaHora: e.target.value }))}
            />
            <Input
              placeholder="Teléfono principal (ej. 3001234567)"
              className="bg-slate-950 border-slate-800"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
            <Textarea
              placeholder="Más teléfonos (uno por línea o separados por coma)"
              rows={2}
              className="bg-slate-950 border-slate-800"
              value={form.phones}
              onChange={(e) => setForm((f) => ({ ...f, phones: e.target.value }))}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-slate-700" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700"
              disabled={createMut.isPending}
              onClick={submit}
            >
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
