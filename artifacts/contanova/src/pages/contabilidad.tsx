import { useState } from "react";
import { useListCuentas, useListMovimientos, useCreateCuenta, useCreateMovimiento } from "@workspace/api-client-react";
import { formatCurrency } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, FolderTree, Activity } from "lucide-react";

const TIPO_COLORS: Record<string, string> = {
  activo: "bg-blue-500/10 text-blue-500",
  pasivo: "bg-orange-500/10 text-orange-500",
  patrimonio: "bg-purple-500/10 text-purple-500",
  ingreso: "bg-green-500/10 text-green-500",
  egreso: "bg-red-500/10 text-red-500",
};

const TIPO_LABEL: Record<string, string> = {
  activo: "Activo",
  pasivo: "Pasivo",
  patrimonio: "Patrimonio",
  ingreso: "Ingreso",
  egreso: "Egreso",
};

export default function Contabilidad() {
  const [tab, setTab] = useState("cuentas");

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Contabilidad</h1>
        <p className="text-muted-foreground mt-1">Plan de cuentas y libro diario.</p>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="grid w-[400px] grid-cols-2 bg-muted/50 border border-border">
          <TabsTrigger value="cuentas" className="data-[state=active]:bg-card">
            <FolderTree className="w-4 h-4 mr-2" /> Plan de Cuentas
          </TabsTrigger>
          <TabsTrigger value="movimientos" className="data-[state=active]:bg-card">
            <Activity className="w-4 h-4 mr-2" /> Comprobantes
          </TabsTrigger>
        </TabsList>
        <div className="mt-6">
          <TabsContent value="cuentas">
            <CuentasList />
          </TabsContent>
          <TabsContent value="movimientos">
            <MovimientosList />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

function CuentasList() {
  const { data, isLoading } = useListCuentas({});
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground shadow-sm">
              <Plus className="h-4 w-4 mr-2" /> Nueva Cuenta
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md bg-card border-border">
            <DialogHeader><DialogTitle>Crear Cuenta Contable</DialogTitle></DialogHeader>
            <CreateCuentaForm onSuccess={() => setIsCreateOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>
      <Card className="border-border shadow-sm overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow className="border-border">
                <TableHead>Código</TableHead>
                <TableHead>Nombre de la Cuenta</TableHead>
                <TableHead>Naturaleza</TableHead>
                <TableHead className="text-right">Saldo Actual</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={4} className="text-center h-24"><Skeleton className="w-full h-8" /></TableCell></TableRow>
              ) : data?.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center h-24 text-muted-foreground">No hay cuentas creadas.</TableCell></TableRow>
              ) : (
                data?.map((c) => (
                  <TableRow key={c.id} className="border-border hover:bg-muted/30">
                    <TableCell className="font-mono text-sm font-bold">{c.codigo}</TableCell>
                    <TableCell className="font-medium">{c.nombre}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs capitalize ${TIPO_COLORS[c.tipo] ?? "bg-muted"}`}>
                        {TIPO_LABEL[c.tipo] ?? c.tipo}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {c.saldo !== null && c.saldo !== undefined ? formatCurrency(c.saldo) : "$ 0"}
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

function CreateCuentaForm({ onSuccess }: { onSuccess: () => void }) {
  const createMutation = useCreateCuenta();
  const [formData, setFormData] = useState({ codigo: "", nombre: "", tipo: "activo" as const });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({ data: formData }, { onSuccess: () => onSuccess() });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Código Contable *</label>
        <Input required value={formData.codigo} onChange={(e) => setFormData({ ...formData, codigo: e.target.value })} placeholder="Ej: 110505" className="bg-background" />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Nombre de la Cuenta *</label>
        <Input required value={formData.nombre} onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} placeholder="Ej: Caja General" className="bg-background" />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Naturaleza / Tipo *</label>
        <select
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          value={formData.tipo}
          onChange={(e) => setFormData({ ...formData, tipo: e.target.value as any })}
        >
          <option value="activo">Activo</option>
          <option value="pasivo">Pasivo</option>
          <option value="patrimonio">Patrimonio</option>
          <option value="ingreso">Ingreso</option>
          <option value="egreso">Egreso</option>
        </select>
      </div>
      <div className="pt-4 flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onSuccess}>Cancelar</Button>
        <Button type="submit" disabled={createMutation.isPending}>
          {createMutation.isPending ? "Guardando..." : "Crear Cuenta"}
        </Button>
      </div>
    </form>
  );
}

function MovimientosList() {
  const { data, isLoading } = useListMovimientos({});
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground shadow-sm">
              <Plus className="h-4 w-4 mr-2" /> Nuevo Comprobante
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[700px] bg-card border-border">
            <DialogHeader><DialogTitle>Asentar Comprobante Manual</DialogTitle></DialogHeader>
            <CreateMovimientoForm onSuccess={() => setIsCreateOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>
      <Card className="border-border shadow-sm overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow className="border-border">
                <TableHead>Número</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Débitos</TableHead>
                <TableHead className="text-right">Créditos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center h-24"><Skeleton className="w-full h-8" /></TableCell></TableRow>
              ) : data?.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center h-24 text-muted-foreground">No hay comprobantes registrados.</TableCell></TableRow>
              ) : (
                data?.map((m) => (
                  <TableRow key={m.id} className="border-border hover:bg-muted/30">
                    <TableCell className="font-mono text-sm font-medium">{m.numero}</TableCell>
                    <TableCell>{new Date(m.fecha + "T12:00:00").toLocaleDateString("es-CO")}</TableCell>
                    <TableCell className="font-medium">{m.descripcion}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{m.tipo}</Badge></TableCell>
                    <TableCell className="text-right text-green-600">{formatCurrency(m.totalDebito)}</TableCell>
                    <TableCell className="text-right text-orange-500">{formatCurrency(m.totalCredito)}</TableCell>
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

function CreateMovimientoForm({ onSuccess }: { onSuccess: () => void }) {
  const createMutation = useCreateMovimiento();
  const { data: cuentas } = useListCuentas({});
  const [formData, setFormData] = useState({
    tipo: "Comprobante Diario",
    fecha: new Date().toISOString().split("T")[0],
    descripcion: "",
    lineas: [{ cuentaId: 0, debito: 0, credito: 0, descripcion: "" }],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const totalDeb = formData.lineas.reduce((s, l) => s + l.debito, 0);
    const totalCred = formData.lineas.reduce((s, l) => s + l.credito, 0);
    if (Math.abs(totalDeb - totalCred) > 0.01) {
      alert("El comprobante no cuadra: débitos y créditos deben ser iguales.");
      return;
    }
    createMutation.mutate(
      { data: { ...formData } },
      { onSuccess: () => onSuccess() }
    );
  };

  const addLinea = () =>
    setFormData({ ...formData, lineas: [...formData.lineas, { cuentaId: 0, debito: 0, credito: 0, descripcion: "" }] });

  const removeLinea = (index: number) => {
    if (formData.lineas.length === 1) return;
    setFormData({ ...formData, lineas: formData.lineas.filter((_, i) => i !== index) });
  };

  const totalDebito = formData.lineas.reduce((s, l) => s + l.debito, 0);
  const totalCredito = formData.lineas.reduce((s, l) => s + l.credito, 0);
  const cuadra = Math.abs(totalDebito - totalCredito) < 0.01;

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-2 max-h-[75vh] overflow-y-auto pr-1">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Fecha *</label>
          <Input type="date" required value={formData.fecha} onChange={(e) => setFormData({ ...formData, fecha: e.target.value })} className="bg-background" />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Tipo de Comprobante *</label>
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={formData.tipo}
            onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
          >
            <option value="Comprobante Diario">Comprobante Diario</option>
            <option value="Nota Contable">Nota Contable</option>
            <option value="Apertura">Apertura</option>
            <option value="Ajuste">Ajuste</option>
            <option value="Cierre">Cierre</option>
          </select>
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Descripción *</label>
        <Input required value={formData.descripcion} onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })} placeholder="Ej: Pago nómina enero 2026" className="bg-background" />
      </div>

      <div className="space-y-3 pt-2 border-t border-border">
        <div className="flex justify-between items-center">
          <h4 className="font-semibold text-sm">Líneas Contables</h4>
          <Button type="button" variant="outline" size="sm" onClick={addLinea}>
            <Plus className="w-3 h-3 mr-1" /> Añadir Línea
          </Button>
        </div>
        <div className="grid grid-cols-12 gap-1 text-xs text-muted-foreground px-2">
          <span className="col-span-4">Cuenta</span>
          <span className="col-span-3">Descripción</span>
          <span className="col-span-2 text-right">Débito</span>
          <span className="col-span-2 text-right">Crédito</span>
          <span className="col-span-1" />
        </div>
        {formData.lineas.map((linea, index) => (
          <div key={index} className="grid grid-cols-12 gap-2 items-center bg-muted/20 p-2 rounded-md border border-border">
            <div className="col-span-4">
              <select
                required
                className="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={linea.cuentaId || ""}
                onChange={(e) => {
                  const newLineas = [...formData.lineas];
                  newLineas[index].cuentaId = Number(e.target.value);
                  setFormData({ ...formData, lineas: newLineas });
                }}
              >
                <option value="">-- Cuenta --</option>
                {cuentas?.map((c) => (
                  <option key={c.id} value={c.id}>{c.codigo} - {c.nombre}</option>
                ))}
              </select>
            </div>
            <div className="col-span-3">
              <Input
                placeholder="Descripción" value={linea.descripcion}
                onChange={(e) => {
                  const newLineas = [...formData.lineas];
                  newLineas[index].descripcion = e.target.value;
                  setFormData({ ...formData, lineas: newLineas });
                }}
                className="bg-background text-xs h-9"
              />
            </div>
            <div className="col-span-2">
              <Input
                type="number" placeholder="Débito" min="0"
                value={linea.debito || ""}
                onChange={(e) => {
                  const newLineas = [...formData.lineas];
                  newLineas[index].debito = Number(e.target.value);
                  setFormData({ ...formData, lineas: newLineas });
                }}
                className="bg-background text-xs h-9"
              />
            </div>
            <div className="col-span-2">
              <Input
                type="number" placeholder="Crédito" min="0"
                value={linea.credito || ""}
                onChange={(e) => {
                  const newLineas = [...formData.lineas];
                  newLineas[index].credito = Number(e.target.value);
                  setFormData({ ...formData, lineas: newLineas });
                }}
                className="bg-background text-xs h-9"
              />
            </div>
            <div className="col-span-1 flex justify-center">
              <button type="button" onClick={() => removeLinea(index)}
                className="text-muted-foreground hover:text-destructive transition-colors text-lg leading-none">×</button>
            </div>
          </div>
        ))}
      </div>

      <div className={`rounded-lg p-3 text-sm flex justify-between items-center border ${cuadra ? "bg-green-500/10 border-green-500/20 text-green-600" : "bg-destructive/10 border-destructive/20 text-destructive"}`}>
        <span className="font-medium">{cuadra ? "Comprobante cuadra" : "Débitos y créditos no cuadran"}</span>
        <span className="font-mono text-xs">
          DB: {totalDebito.toLocaleString("es-CO")} | CR: {totalCredito.toLocaleString("es-CO")}
        </span>
      </div>

      <div className="pt-2 flex justify-end gap-2 border-t border-border">
        <Button type="button" variant="outline" onClick={onSuccess}>Cancelar</Button>
        <Button type="submit" disabled={createMutation.isPending || !cuadra || !formData.descripcion}>
          {createMutation.isPending ? "Asentando..." : "Asentar Comprobante"}
        </Button>
      </div>
    </form>
  );
}
