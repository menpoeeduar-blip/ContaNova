import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listClientes,
  updateCliente,
  useListFacturas,
  type Cliente,
  type ClienteUpdateEstadoCobranza,
  ClienteUpdateEstadoCobranza as EstadoCobranzaEnum,
} from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertTriangle,
  Send,
  MessageSquare,
  Mail,
  ShieldAlert,
  Search,
  CheckCircle2,
  Copy,
  DollarSign,
  Users,
  Clock,
} from "lucide-react";
import { toast } from "sonner";

function formatCurrency(val: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(val);
}

const TEMPLATES = [
  {
    id: "recordatorio",
    titulo: "📌 Recordatorio Preventivo de Pago",
    asunto: "Recordatorio de Pago - ContaNova",
    mensaje: "Hola {nombre_cliente}, le recordamos amablemente que registra un saldo pendiente de {monto_deuda}. Agradecemos su oportuno pago. ¡Muchas gracias!",
  },
  {
    id: "mora",
    titulo: "⚠️ Aviso de Mora",
    asunto: "URGENTE: Notificación de Cartera Vencida",
    mensaje: "Estimado(a) {nombre_cliente} ({nit_cedula}), su cuenta registra una mora de {dias_mora} días con saldo pendiente de {monto_deuda}. Le solicitamos regularizar su situación a la brevedad para evitar cobro prejurídico.",
  },
  {
    id: "reporte",
    titulo: "🚨 Notificación Reporte Centrales de Riesgo",
    asunto: "NOTIFICACIÓN OFICIAL: Reporte a DataCrédito / CIFIN",
    mensaje: "ATENCIÓN {nombre_cliente}: Por la deuda pendiente de {monto_deuda} con {dias_mora} días de mora, su obligación será reportada ante las Centrales de Riesgo (DataCrédito / CIFIN). Comuníquese inmediatamente para evitar afectación en su historial crediticio.",
  },
  {
    id: "acuerdo",
    titulo: "🤝 Propuesta de Acuerdo de Pago",
    asunto: "Oportunidad Especial de Normalización de Cartera",
    mensaje: "Estimado(a) {nombre_cliente}, le ofrecemos un acuerdo especial de pago con condonación de intereses de mora para sanear su crédito de {monto_deuda}. Responda este mensaje para coordinar su plan de pago.",
  },
];

type EstadoCobranza = "activo" | "deudor" | "reportado" | "inactivo";

type DeudaInfo = {
  totalDeuda: number;
  diasMora: number;
  facturasPendientes: number;
};

export default function DeudoresPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterState, setFilterState] = useState<"todos" | "deudor" | "reportado">("todos");
  const [selectedClientIds, setSelectedClientIds] = useState<number[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("mora");
  const [customMessage, setCustomMessage] = useState<string>(TEMPLATES[1].mensaje);
  const [selectedClientForAction, setSelectedClientForAction] = useState<Cliente | null>(null);
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<string>("deudor");
  const [actionNotes, setActionNotes] = useState("");

  const { data: rawClientes = [], isLoading: isLoadingClientes } = useQuery({
    queryKey: ["clientes"],
    queryFn: () => listClientes(),
  });

  const { data: rawFacturas = [] } = useListFacturas();

  const clientes = Array.isArray(rawClientes) ? rawClientes : [];
  const facturas = Array.isArray(rawFacturas) ? rawFacturas : [];

  const updateMutation = useMutation({
    mutationFn: ({ id, estadoCobranza, notasCobranza }: { id: number; estadoCobranza: string; notasCobranza?: string }) =>
      updateCliente(id, { estadoCobranza: estadoCobranza as ClienteUpdateEstadoCobranza, notasCobranza }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
      toast.success("Estado de cobranza actualizado correctamente");
      setActionModalOpen(false);
      setActionNotes("");
    },
    onError: () => toast.error("Error al actualizar el estado del cliente"),
  });

  // Deuda por cliente calculada desde facturas pendientes
  const deudasPorCliente = clientes.reduce<Record<number, DeudaInfo>>((acc, cliente) => {
    const facs = facturas.filter(
      (f) => f.clienteId === cliente.id && f.estado !== "anulada" && f.estado !== "pagada"
    );
    const totalDeuda = facs.reduce((sum, f) => sum + (f.saldoPendiente ?? f.total), 0);
    let diasMoraMax = 0;
    facs.forEach((f) => {
      if (f.fechaVencimiento) {
        const diff = Math.floor(
          (Date.now() - new Date(f.fechaVencimiento).getTime()) / (1000 * 3600 * 24)
        );
        if (diff > diasMoraMax) diasMoraMax = diff;
      }
    });
    acc[cliente.id] = { totalDeuda, diasMora: Math.max(0, diasMoraMax), facturasPendientes: facs.length };
    return acc;
  }, {});

  const getEstadoEfectivo = (c: Cliente): EstadoCobranza => {
    // Use the stored estadoCobranza if it's not "activo", otherwise derive from debt
    const stored = (c as any).estadoCobranza as EstadoCobranza | undefined;
    if (stored === "reportado") return "reportado";
    const info = deudasPorCliente[c.id] || { totalDeuda: 0, diasMora: 0 };
    if (stored === "deudor" || info.totalDeuda > 0 || info.diasMora > 0) return "deudor";
    return "activo";
  };

  const clientesFiltrados = clientes.filter((c) => {
    const estado = getEstadoEfectivo(c);
    const matchSearch =
      c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.numeroDocumento.includes(searchTerm) ||
      (c.telefono?.includes(searchTerm) ?? false);
    if (filterState === "deudor") return matchSearch && (estado === "deudor" || estado === "reportado");
    if (filterState === "reportado") return matchSearch && estado === "reportado";
    return matchSearch;
  });

  const clientesSeleccionados = clientes.filter((c) => selectedClientIds.includes(c.id));

  const totalDeudoresCount = clientes.filter((c) => {
    const estado = getEstadoEfectivo(c);
    return estado === "deudor" || estado === "reportado";
  }).length;
  const totalReportadosCount = clientes.filter((c) => getEstadoEfectivo(c) === "reportado").length;
  const carteraEnRiesgoMonto = Object.values(deudasPorCliente).reduce((s, d) => s + d.totalDeuda, 0);

  const toggleSelectAll = () => {
    if (selectedClientIds.length === clientesFiltrados.length) {
      setSelectedClientIds([]);
    } else {
      setSelectedClientIds(clientesFiltrados.map((c) => c.id));
    }
  };

  const toggleSelectClient = (id: number) => {
    setSelectedClientIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleTemplateChange = (tplId: string) => {
    setSelectedTemplateId(tplId);
    const tmpl = TEMPLATES.find((t) => t.id === tplId);
    if (tmpl) setCustomMessage(tmpl.mensaje);
  };

  const replaceVariables = (text: string, cliente: Cliente) => {
    const info = deudasPorCliente[cliente.id] || { totalDeuda: 0, diasMora: 0 };
    return text
      .replace(/{nombre_cliente}/g, cliente.nombre)
      .replace(/{nit_cedula}/g, cliente.numeroDocumento)
      .replace(/{monto_deuda}/g, formatCurrency(info.totalDeuda))
      .replace(/{dias_mora}/g, String(info.diasMora));
  };

  const sendWhatsApp = (cliente: Cliente) => {
    if (!cliente.telefono) {
      toast.error(`${cliente.nombre} no tiene número de teléfono registrado.`);
      return;
    }
    const clean = cliente.telefono.replace(/\D/g, "");
    const phone = clean.startsWith("57") ? clean : `57${clean}`;
    const msg = replaceVariables(customMessage, cliente);
    window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(msg)}`, "_blank");
  };

  const sendBulkWhatsApp = () => {
    if (clientesSeleccionados.length === 0) {
      toast.warning("Selecciona al menos un cliente.");
      return;
    }
    toast.info(`Iniciando envío a ${clientesSeleccionados.length} contactos por WhatsApp...`);
    clientesSeleccionados.forEach((c, i) => setTimeout(() => sendWhatsApp(c), i * 1200));
  };

  const sendEmail = (cliente: Cliente) => {
    if (!cliente.email) {
      toast.error(`${cliente.nombre} no tiene correo electrónico registrado.`);
      return;
    }
    const tmpl = TEMPLATES.find((t) => t.id === selectedTemplateId) || TEMPLATES[1];
    const subj = encodeURIComponent(tmpl.asunto);
    const body = encodeURIComponent(replaceVariables(customMessage, cliente));
    window.open(`mailto:${cliente.email}?subject=${subj}&body=${body}`, "_blank");
  };

  const sendBulkEmail = () => {
    if (clientesSeleccionados.length === 0) { toast.warning("Selecciona al menos un cliente."); return; }
    const emails = clientesSeleccionados.filter((c) => c.email).map((c) => c.email!);
    if (emails.length === 0) { toast.error("Ningún cliente seleccionado tiene correo registrado."); return; }
    const tmpl = TEMPLATES.find((t) => t.id === selectedTemplateId) || TEMPLATES[1];
    window.open(`mailto:${emails.join(",")}?subject=${encodeURIComponent(tmpl.asunto)}`, "_blank");
  };

  const copyMessage = (cliente: Cliente) => {
    navigator.clipboard.writeText(replaceVariables(customMessage, cliente));
    toast.success(`Mensaje copiado para ${cliente.nombre}`);
  };

  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-rose-950 p-6 rounded-2xl border border-slate-800 shadow-xl text-white">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-rose-500/20 text-rose-400 rounded-xl border border-rose-500/30">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Deudores & Centrales de Riesgo</h1>
            <p className="text-slate-400 text-sm">Control de mora, reporte y centro de cobro masivo.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-white text-sm" onClick={() => setFilterState("deudor")}>
            <AlertTriangle className="w-4 h-4 mr-1.5 text-amber-400" />Deudores ({totalDeudoresCount})
          </Button>
          <Button className="bg-rose-600 hover:bg-rose-700 text-white text-sm" onClick={() => setFilterState("reportado")}>
            <ShieldAlert className="w-4 h-4 mr-1.5" />Reportados ({totalReportadosCount})
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-slate-900/60 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Total Deudores</CardTitle>
            <Users className="w-4 h-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-400">{totalDeudoresCount}</div>
            <p className="text-xs text-slate-500 mt-1">Con saldo pendiente o mora activa</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/60 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Reportados en Centrales</CardTitle>
            <ShieldAlert className="w-4 h-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-500">{totalReportadosCount}</div>
            <p className="text-xs text-slate-500 mt-1">Notificados a DataCrédito / CIFIN</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/60 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Cartera en Riesgo</CardTitle>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-400">{formatCurrency(carteraEnRiesgoMonto)}</div>
            <p className="text-xs text-slate-500 mt-1">Monto total pendiente por recuperar</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="gestion" className="w-full">
        <TabsList className="bg-slate-900 p-1 border border-slate-800">
          <TabsTrigger value="gestion" className="data-[state=active]:bg-primary data-[state=active]:text-white">
            <Users className="w-4 h-4 mr-2" />Directorio de Deudores
          </TabsTrigger>
          <TabsTrigger value="mensajeria" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
            <Send className="w-4 h-4 mr-2" />Mensajería Masiva ({selectedClientIds.length})
          </TabsTrigger>
        </TabsList>

        {/* TAB: GESTION */}
        <TabsContent value="gestion" className="space-y-4 mt-4">
          <Card className="border-slate-800 bg-slate-900/40">
            <CardHeader className="pb-3">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle>Listado y Estado de Cobranza</CardTitle>
                  <CardDescription>Cambia la clasificación de clientes: activo, deudor o reportado en centrales de riesgo.</CardDescription>
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <Input placeholder="Buscar nombre, NIT o teléfono..." className="pl-9 bg-slate-950 border-slate-800 text-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                  </div>
                  <Select value={filterState} onValueChange={(v) => setFilterState(v as typeof filterState)}>
                    <SelectTrigger className="w-44 bg-slate-950 border-slate-800">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800 text-white">
                      <SelectItem value="todos">Todos los Clientes</SelectItem>
                      <SelectItem value="deudor">Solo Deudores</SelectItem>
                      <SelectItem value="reportado">Solo Reportados</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl border border-slate-800 overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-950">
                    <TableRow className="border-slate-800">
                      <TableHead className="w-12 text-center">
                        <Checkbox checked={clientesFiltrados.length > 0 && selectedClientIds.length === clientesFiltrados.length} onCheckedChange={toggleSelectAll} />
                      </TableHead>
                      <TableHead className="text-slate-300">Cliente</TableHead>
                      <TableHead className="text-slate-300">Documento</TableHead>
                      <TableHead className="text-slate-300">Contacto</TableHead>
                      <TableHead className="text-slate-300 text-right">Saldo Deuda</TableHead>
                      <TableHead className="text-slate-300 text-center">Días Mora</TableHead>
                      <TableHead className="text-slate-300 text-center">Estado</TableHead>
                      <TableHead className="text-slate-300 text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingClientes ? (
                      <TableRow><TableCell colSpan={8} className="text-center py-8 text-slate-500">Cargando...</TableCell></TableRow>
                    ) : clientesFiltrados.length === 0 ? (
                      <TableRow><TableCell colSpan={8} className="text-center py-8 text-slate-500">No se encontraron clientes con los filtros aplicados.</TableCell></TableRow>
                    ) : (
                      clientesFiltrados.map((cliente) => {
                        const info = deudasPorCliente[cliente.id] || { totalDeuda: 0, diasMora: 0 };
                        const estado = getEstadoEfectivo(cliente);
                        return (
                          <TableRow key={cliente.id} className="border-slate-800/60 hover:bg-slate-800/30">
                            <TableCell className="text-center">
                              <Checkbox checked={selectedClientIds.includes(cliente.id)} onCheckedChange={() => toggleSelectClient(cliente.id)} />
                            </TableCell>
                            <TableCell className="font-semibold text-white">
                              {cliente.nombre}
                              {cliente.ciudad && <span className="block text-xs font-normal text-slate-500">{cliente.ciudad}</span>}
                            </TableCell>
                            <TableCell className="text-slate-300 font-mono text-sm">
                              <div className="text-xs text-slate-500">{cliente.tipoDocumento}</div>
                              {cliente.numeroDocumento}
                            </TableCell>
                            <TableCell className="text-slate-300 text-sm">
                              <div>{cliente.telefono || "—"}</div>
                              <div className="text-xs text-slate-500">{cliente.email || "—"}</div>
                            </TableCell>
                            <TableCell className="text-right font-bold text-amber-400">
                              {info.totalDeuda > 0 ? formatCurrency(info.totalDeuda) : "—"}
                            </TableCell>
                            <TableCell className="text-center">
                              {info.diasMora > 0 ? (
                                <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30">
                                  <Clock className="w-3 h-3 mr-1" />{info.diasMora}d
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30">Al día</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {estado === "reportado" ? (
                                <Badge className="bg-rose-600 text-white"><ShieldAlert className="w-3 h-3 mr-1" />REPORTADO</Badge>
                              ) : estado === "deudor" ? (
                                <Badge variant="outline" className="bg-amber-500/20 text-amber-300 border-amber-500/40"><AlertTriangle className="w-3 h-3 mr-1" />DEUDOR</Badge>
                              ) : (
                                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30"><CheckCircle2 className="w-3 h-3 mr-1" />ACTIVO</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button size="sm" variant="outline" className="h-8 border-emerald-600/40 hover:bg-emerald-600/20 text-emerald-400 text-xs" onClick={() => sendWhatsApp(cliente)}>
                                  <MessageSquare className="w-3.5 h-3.5 mr-1" />WhatsApp
                                </Button>
                                <Button size="sm" variant="outline" className="h-8 border-slate-700 hover:bg-slate-800 text-slate-300 text-xs" onClick={() => { setSelectedClientForAction(cliente); setNewStatus(estado === "reportado" ? "activo" : "reportado"); setActionModalOpen(true); }}>
                                  <ShieldAlert className="w-3.5 h-3.5 mr-1 text-rose-400" />Estado
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: MENSAJERIA MASIVA */}
        <TabsContent value="mensajeria" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Configuración */}
            <Card className="md:col-span-1 border-slate-800 bg-slate-900/60">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2"><Send className="w-5 h-5 text-indigo-400" />Plantilla de Cobro</CardTitle>
                <CardDescription>Personaliza el mensaje de cobro con variables dinámicas.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300">Plantilla</label>
                  <Select value={selectedTemplateId} onValueChange={handleTemplateChange}>
                    <SelectTrigger className="bg-slate-950 border-slate-800 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800 text-white">
                      {TEMPLATES.map((t) => <SelectItem key={t.id} value={t.id}>{t.titulo}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300">Mensaje</label>
                  <Textarea rows={6} className="bg-slate-950 border-slate-800 text-sm font-mono text-slate-200" value={customMessage} onChange={(e) => setCustomMessage(e.target.value)} />
                  <p className="text-[11px] text-slate-500">
                    Variables: <code className="text-indigo-400">&#123;nombre_cliente&#125;</code> <code className="text-indigo-400">&#123;nit_cedula&#125;</code> <code className="text-indigo-400">&#123;monto_deuda&#125;</code> <code className="text-indigo-400">&#123;dias_mora&#125;</code>
                  </p>
                </div>
                <div className="pt-2 border-t border-slate-800 space-y-2">
                  <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold" onClick={sendBulkWhatsApp} disabled={selectedClientIds.length === 0}>
                    <MessageSquare className="w-4 h-4 mr-2" />WhatsApp Masivo ({selectedClientIds.length})
                  </Button>
                  <Button variant="outline" className="w-full border-slate-700 bg-slate-950 text-slate-200 hover:bg-slate-800" onClick={sendBulkEmail} disabled={selectedClientIds.length === 0}>
                    <Mail className="w-4 h-4 mr-2" />Correo Masivo ({selectedClientIds.length})
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Vista previa destinatarios */}
            <Card className="md:col-span-2 border-slate-800 bg-slate-900/60">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Destinatarios ({clientesSeleccionados.length})</CardTitle>
                    <CardDescription>Vista previa del mensaje personalizado por cada cliente.</CardDescription>
                  </div>
                  <Button size="sm" variant="outline" className="border-slate-700 text-slate-300" onClick={toggleSelectAll}>
                    {selectedClientIds.length === clientesFiltrados.length ? "Deseleccionar Todos" : "Seleccionar Todos"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {clientesSeleccionados.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-slate-800 rounded-xl">
                    <Users className="w-10 h-10 mx-auto text-slate-600 mb-3" />
                    <p className="text-slate-400 font-medium">No hay clientes seleccionados.</p>
                    <p className="text-xs text-slate-500 mt-1">Ve al "Directorio de Deudores" y marca los clientes a notificar.</p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                    {clientesSeleccionados.map((cliente) => {
                      const finalMsg = replaceVariables(customMessage, cliente);
                      const info = deudasPorCliente[cliente.id] || { totalDeuda: 0, diasMora: 0 };
                      return (
                        <div key={cliente.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col md:flex-row gap-4 justify-between">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-white text-sm">{cliente.nombre}</span>
                              <span className="text-xs text-slate-400 font-mono">({cliente.numeroDocumento})</span>
                              {info.totalDeuda > 0 && (
                                <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-xs">{formatCurrency(info.totalDeuda)}</Badge>
                              )}
                            </div>
                            <div className="p-3 bg-slate-900 rounded-lg text-xs text-slate-300 font-mono border border-slate-800/80 whitespace-pre-wrap">{finalMsg}</div>
                          </div>
                          <div className="flex md:flex-col items-center justify-center gap-2 border-t md:border-t-0 md:border-l border-slate-800 pt-2 md:pt-0 md:pl-4 min-w-[100px]">
                            <Button size="sm" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8" onClick={() => sendWhatsApp(cliente)}>
                              <MessageSquare className="w-3.5 h-3.5 mr-1" />WA
                            </Button>
                            <Button size="sm" variant="outline" className="w-full border-slate-700 text-xs h-8 text-slate-300" onClick={() => copyMessage(cliente)}>
                              <Copy className="w-3.5 h-3.5 mr-1" />Copiar
                            </Button>
                            <Button size="sm" variant="outline" className="w-full border-slate-700 text-xs h-8 text-slate-300" onClick={() => sendEmail(cliente)}>
                              <Mail className="w-3.5 h-3.5 mr-1" />Email
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Modal Cambio de Estado */}
      <Dialog open={actionModalOpen} onOpenChange={setActionModalOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-500" />Cambiar Estado de Cobranza
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Actualiza la clasificación crediticia de <strong>{selectedClientForAction?.nombre}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">Nuevo Estado</label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger className="bg-slate-950 border-slate-800 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-white">
                  <SelectItem value="activo">🟢 Activo — Al día / Paz y salvo</SelectItem>
                  <SelectItem value="deudor">🟡 Deudor — En Mora / Cartera Vencida</SelectItem>
                  <SelectItem value="reportado">🔴 Reportado — DataCrédito / CIFIN</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">Notas de Cobranza</label>
              <Textarea
                placeholder="Motivo del cambio, radicado de reporte, acuerdo alcanzado..."
                className="bg-slate-950 border-slate-800 text-sm text-slate-200"
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-slate-700 text-slate-300" onClick={() => setActionModalOpen(false)}>Cancelar</Button>
            <Button className="bg-rose-600 hover:bg-rose-700 text-white" disabled={updateMutation.isPending} onClick={() => {
              if (selectedClientForAction) {
                updateMutation.mutate({ id: selectedClientForAction.id, estadoCobranza: newStatus, notasCobranza: actionNotes });
              }
            }}>
              {updateMutation.isPending ? "Guardando..." : "Guardar Clasificación"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
