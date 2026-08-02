import { useState } from "react";
import {
  useGetFacturasResumen,
  useListFacturas,
  useCreateFactura,
  useUpdateFactura,
  useDeleteFactura,
  useListClientes,
  type Factura,
} from "@workspace/api-client-react";
import { formatCurrency, formatNumber } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Search, FileText, CheckCircle2, Clock, Ban, Pencil, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export default function Facturacion() {
  const [search, setSearch] = useState("");
  const { data: resumen, isLoading: resumenLoading, refetch: refetchResumen } = useGetFacturasResumen();
  const { data: facturas, isLoading, refetch } = useListFacturas({ search });
  const deleteMutation = useDeleteFactura();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Factura | null>(null);

  const safeFacturas = Array.isArray(facturas) ? facturas : [];
  const invalidate = () => {
    refetch();
    refetchResumen();
  };

  const handleAnular = (f: Factura) => {
    if (f.estado === "anulada") return;
    if (!confirm(`¿Anular la factura ${f.numero}?`)) return;
    deleteMutation.mutate({ id: f.id }, { onSuccess: () => invalidate() });
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Facturación</h1>
          <p className="text-muted-foreground mt-1">Gestión de facturas de venta y estado de cobros.</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar factura..."
              className="pl-9 bg-card border-border"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm">
                <Plus className="h-4 w-4 mr-2" />
                Nueva Factura
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[620px] bg-card border-border">
              <DialogHeader>
                <DialogTitle>Crear Factura de Venta</DialogTitle>
              </DialogHeader>
              <CreateFacturaForm
                onSuccess={() => {
                  setIsCreateOpen(false);
                  invalidate();
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-[425px] bg-card border-border">
          <DialogHeader>
            <DialogTitle>Editar Factura {editing?.numero}</DialogTitle>
          </DialogHeader>
          {editing && (
            <EditFacturaForm
              factura={editing}
              onSuccess={() => {
                setEditing(null);
                invalidate();
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border shadow-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Borradores</p>
              {resumenLoading ? <Skeleton className="h-8 w-20 mt-1" /> : (
                <>
                  <h3 className="text-2xl font-bold mt-1">{formatNumber(resumen?.totalBorrador || 0)}</h3>
                  <p className="text-xs text-muted-foreground mt-1">facturas</p>
                </>
              )}
            </div>
            <div className="p-3 bg-muted rounded-lg text-muted-foreground"><FileText className="w-5 h-5" /></div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border shadow-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Emitidas</p>
              {resumenLoading ? <Skeleton className="h-8 w-20 mt-1" /> : (
                <>
                  <h3 className="text-2xl font-bold mt-1 text-primary">{formatNumber(resumen?.totalEmitidas || 0)}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{formatCurrency(resumen?.montoPendiente || 0)} pendiente</p>
                </>
              )}
            </div>
            <div className="p-3 bg-primary/10 rounded-lg text-primary"><Clock className="w-5 h-5" /></div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border shadow-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Pagadas</p>
              {resumenLoading ? <Skeleton className="h-8 w-20 mt-1" /> : (
                <>
                  <h3 className="text-2xl font-bold mt-1 text-green-500">{formatNumber(resumen?.totalPagadas || 0)}</h3>
                  <p className="text-xs text-muted-foreground mt-1">facturas cobradas</p>
                </>
              )}
            </div>
            <div className="p-3 bg-green-500/10 rounded-lg text-green-500"><CheckCircle2 className="w-5 h-5" /></div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border shadow-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Este Mes</p>
              {resumenLoading ? <Skeleton className="h-8 w-32 mt-1" /> : (
                <>
                  <h3 className="text-2xl font-bold mt-1 text-foreground">{formatCurrency(resumen?.montoMes || 0)}</h3>
                  <p className="text-xs text-muted-foreground mt-1">total facturado</p>
                </>
              )}
            </div>
            <div className="p-3 bg-secondary rounded-lg text-foreground"><Ban className="w-5 h-5" /></div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border shadow-sm overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow className="border-border">
                <TableHead>Número</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Vencimiento</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Saldo Pendiente</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className="border-border">
                    <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-[80px] ml-auto" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-[80px] ml-auto" /></TableCell>
                    <TableCell />
                  </TableRow>
                ))
              ) : safeFacturas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                    No se encontraron facturas.
                  </TableCell>
                </TableRow>
              ) : (
                safeFacturas.map((factura) => (
                  <TableRow key={factura.id} className="border-border hover:bg-muted/30 transition-colors">
                    <TableCell className="font-mono text-sm font-medium">{factura.numero}</TableCell>
                    <TableCell className="font-medium">{factura.clienteNombre}</TableCell>
                    <TableCell>{new Date(factura.fecha + "T12:00:00").toLocaleDateString("es-CO")}</TableCell>
                    <TableCell>{new Date(factura.fechaVencimiento + "T12:00:00").toLocaleDateString("es-CO")}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={
                        factura.estado === "pagada" ? "bg-green-500/10 text-green-500 border-green-500/20" :
                        factura.estado === "emitida" ? "bg-primary/10 text-primary border-primary/20" :
                        factura.estado === "anulada" ? "bg-destructive/10 text-destructive border-destructive/20" :
                        "bg-muted text-muted-foreground"
                      }>
                        {factura.estado === "pagada" ? "Pagada" :
                         factura.estado === "emitida" ? "Emitida" :
                         factura.estado === "anulada" ? "Anulada" : "Borrador"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(factura.total)}</TableCell>
                    <TableCell className="text-right font-bold">
                      {factura.saldoPendiente !== null && factura.saldoPendiente !== undefined
                        ? formatCurrency(factura.saldoPendiente)
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          disabled={factura.estado === "anulada"}
                          onClick={() => setEditing(factura)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          disabled={factura.estado === "anulada" || deleteMutation.isPending}
                          onClick={() => handleAnular(factura)}
                          title="Anular"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}

function EditFacturaForm({ factura, onSuccess }: { factura: Factura; onSuccess: () => void }) {
  const updateMutation = useUpdateFactura();
  const [formData, setFormData] = useState({
    estado: factura.estado,
    notas: factura.notas || "",
    fechaVencimiento: String(factura.fechaVencimiento).slice(0, 10),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(
      {
        id: factura.id,
        data: {
          estado: formData.estado as Factura["estado"],
          notas: formData.notas || undefined,
          fechaVencimiento: formData.fechaVencimiento,
        },
      },
      { onSuccess }
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Estado</label>
        <select
          className={selectClass}
          value={formData.estado}
          onChange={(e) => setFormData({ ...formData, estado: e.target.value as Factura["estado"] })}
        >
          <option value="borrador">Borrador</option>
          <option value="emitida">Emitida</option>
          <option value="pagada">Pagada</option>
          <option value="anulada">Anulada</option>
        </select>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Fecha de Vencimiento</label>
        <Input
          type="date"
          value={formData.fechaVencimiento}
          onChange={(e) => setFormData({ ...formData, fechaVencimiento: e.target.value })}
          className="bg-background"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Notas</label>
        <Input
          value={formData.notas}
          onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
          className="bg-background"
        />
      </div>
      <div className="pt-4 flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onSuccess}>
          Cancelar
        </Button>
        <Button type="submit" disabled={updateMutation.isPending}>
          {updateMutation.isPending ? "Guardando..." : "Guardar cambios"}
        </Button>
      </div>
    </form>
  );
}

function CreateFacturaForm({ onSuccess }: { onSuccess: () => void }) {
  const createMutation = useCreateFactura();
  const { data: clientes } = useListClientes({});
  const safeClientes = Array.isArray(clientes) ? clientes : [];
  const [formData, setFormData] = useState({
    clienteId: 0,
    fecha: new Date().toISOString().split("T")[0],
    fechaVencimiento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    items: [{ descripcion: "", cantidad: 1, precioUnitario: 0 }],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.clienteId) return;
    createMutation.mutate(
      { data: { ...formData } },
      { onSuccess: () => onSuccess() }
    );
  };

  const addItem = () =>
    setFormData({ ...formData, items: [...formData.items, { descripcion: "", cantidad: 1, precioUnitario: 0 }] });

  const removeItem = (index: number) => {
    if (formData.items.length === 1) return;
    setFormData({ ...formData, items: formData.items.filter((_, i) => i !== index) });
  };

  const subtotal = formData.items.reduce((acc, item) => acc + item.cantidad * item.precioUnitario, 0);
  const iva = subtotal * 0.19;
  const total = subtotal + iva;

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-2 max-h-[75vh] overflow-y-auto pr-1">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2 col-span-2">
          <label className="text-sm font-medium">Cliente *</label>
          <select
            required
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={formData.clienteId || ""}
            onChange={(e) => setFormData({ ...formData, clienteId: Number(e.target.value) })}
          >
            <option value="">-- Seleccionar cliente --</option>
            {safeClientes.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre} ({c.tipoDocumento} {c.numeroDocumento})</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Fecha de Emisión *</label>
          <Input
            type="date" required
            value={formData.fecha}
            onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
            className="bg-background"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Fecha de Vencimiento *</label>
          <Input
            type="date" required
            value={formData.fechaVencimiento}
            onChange={(e) => setFormData({ ...formData, fechaVencimiento: e.target.value })}
            className="bg-background"
          />
        </div>
      </div>

      <div className="space-y-3 pt-2">
        <div className="flex justify-between items-center">
          <h4 className="font-semibold text-sm">Líneas de Factura</h4>
          <Button type="button" variant="outline" size="sm" onClick={addItem}>
            <Plus className="w-3 h-3 mr-1" /> Añadir Línea
          </Button>
        </div>
        <div className="grid grid-cols-12 gap-1 text-xs text-muted-foreground px-2">
          <span className="col-span-6">Descripción</span>
          <span className="col-span-2 text-center">Cant.</span>
          <span className="col-span-3 text-right">Precio Unit.</span>
          <span className="col-span-1" />
        </div>
        {formData.items.map((item, index) => (
          <div key={index} className="grid grid-cols-12 gap-2 items-center bg-muted/20 p-2 rounded-md border border-border">
            <div className="col-span-6">
              <Input
                placeholder="Descripción del concepto" required
                value={item.descripcion}
                onChange={(e) => {
                  const newItems = [...formData.items];
                  newItems[index].descripcion = e.target.value;
                  setFormData({ ...formData, items: newItems });
                }}
                className="bg-background text-sm h-9"
              />
            </div>
            <div className="col-span-2">
              <Input
                type="number" placeholder="Cant" required min="1"
                value={item.cantidad || ""}
                onChange={(e) => {
                  const newItems = [...formData.items];
                  newItems[index].cantidad = Number(e.target.value);
                  setFormData({ ...formData, items: newItems });
                }}
                className="bg-background text-sm h-9"
              />
            </div>
            <div className="col-span-3">
              <Input
                type="number" placeholder="Precio" required min="0"
                value={item.precioUnitario || ""}
                onChange={(e) => {
                  const newItems = [...formData.items];
                  newItems[index].precioUnitario = Number(e.target.value);
                  setFormData({ ...formData, items: newItems });
                }}
                className="bg-background text-sm h-9"
              />
            </div>
            <div className="col-span-1 flex justify-center">
              <button type="button" onClick={() => removeItem(index)}
                className="text-muted-foreground hover:text-destructive transition-colors text-lg leading-none">×</button>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-muted/30 rounded-lg p-4 space-y-1 text-sm">
        <div className="flex justify-between text-muted-foreground">
          <span>Subtotal</span><span>{formatCurrency(subtotal)}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>IVA 19%</span><span>{formatCurrency(iva)}</span>
        </div>
        <div className="flex justify-between font-bold text-base pt-1 border-t border-border">
          <span>Total</span><span className="text-primary">{formatCurrency(total)}</span>
        </div>
      </div>

      <div className="pt-2 flex justify-end gap-2 border-t border-border">
        <Button type="button" variant="outline" onClick={onSuccess}>Cancelar</Button>
        <Button type="submit" disabled={createMutation.isPending || !formData.clienteId}>
          {createMutation.isPending ? "Guardando..." : "Emitir Factura"}
        </Button>
      </div>
    </form>
  );
}
