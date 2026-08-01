import { useState } from "react";
import { useGetCarteraStats, useListCuentasCobrar, useListCuentasPagar, useCreateAbono } from "@workspace/api-client-react";
import { formatCurrency } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ArrowDownRight, ArrowUpRight, Clock, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export default function Cartera() {
  const { data: stats, isLoading: statsLoading } = useGetCarteraStats();
  const [tab, setTab] = useState("cobrar");

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Cartera</h1>
        <p className="text-muted-foreground mt-1">Gestión de cuentas por cobrar y pagar.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card border-border shadow-sm">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total por Cobrar</p>
                {statsLoading ? <Skeleton className="h-8 w-32 mt-2" /> : <h3 className="text-2xl font-bold text-green-500 mt-1">{formatCurrency(stats?.totalPorCobrar || 0)}</h3>}
                <p className="text-xs text-muted-foreground mt-2">{stats?.cantidadPorCobrar || 0} facturas</p>
              </div>
              <div className="p-3 bg-green-500/10 rounded-lg text-green-500"><ArrowUpRight className="w-5 h-5" /></div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-sm">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Vencido por Cobrar</p>
                {statsLoading ? <Skeleton className="h-8 w-32 mt-2" /> : <h3 className="text-2xl font-bold text-destructive mt-1">{formatCurrency(stats?.vencidasPorCobrar || 0)}</h3>}
                <p className="text-xs text-muted-foreground mt-2">Atención requerida</p>
              </div>
              <div className="p-3 bg-destructive/10 rounded-lg text-destructive"><ShieldAlert className="w-5 h-5" /></div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-sm">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total por Pagar</p>
                {statsLoading ? <Skeleton className="h-8 w-32 mt-2" /> : <h3 className="text-2xl font-bold text-orange-500 mt-1">{formatCurrency(stats?.totalPorPagar || 0)}</h3>}
                <p className="text-xs text-muted-foreground mt-2">{stats?.cantidadPorPagar || 0} facturas</p>
              </div>
              <div className="p-3 bg-orange-500/10 rounded-lg text-orange-500"><ArrowDownRight className="w-5 h-5" /></div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-sm">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Vencido por Pagar</p>
                {statsLoading ? <Skeleton className="h-8 w-32 mt-2" /> : <h3 className="text-2xl font-bold text-destructive mt-1">{formatCurrency(stats?.vencidasPorPagar || 0)}</h3>}
                <p className="text-xs text-muted-foreground mt-2">Urgente</p>
              </div>
              <div className="p-3 bg-destructive/10 rounded-lg text-destructive"><Clock className="w-5 h-5" /></div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="grid w-[400px] grid-cols-2 bg-muted/50 border border-border">
          <TabsTrigger value="cobrar" className="data-[state=active]:bg-card">Por Cobrar (Clientes)</TabsTrigger>
          <TabsTrigger value="pagar" className="data-[state=active]:bg-card">Por Pagar (Proveedores)</TabsTrigger>
        </TabsList>
        <div className="mt-6">
          <TabsContent value="cobrar">
            <CuentasCobrarList />
          </TabsContent>
          <TabsContent value="pagar">
            <CuentasPagarList />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

function CuentasCobrarList() {
  const { data, isLoading } = useListCuentasCobrar({});
  const safeData = Array.isArray(data) ? data : [];
  return (
    <Card className="border-border shadow-sm overflow-hidden bg-card">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow className="border-border">
              <TableHead>Factura #</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Vencimiento</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Total Factura</TableHead>
              <TableHead className="text-right">Saldo Pendiente</TableHead>
              <TableHead className="text-right">Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
               <TableRow><TableCell colSpan={7} className="text-center h-24"><Skeleton className="w-full h-8" /></TableCell></TableRow>
            ) : safeData.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center h-24 text-muted-foreground">No hay cuentas por cobrar pendientes.</TableCell></TableRow>
            ) : (
              safeData.map(c => (
                <TableRow key={c.facturaId} className="border-border">
                  <TableCell className="font-mono text-sm">{c.numero}</TableCell>
                  <TableCell className="font-medium">{c.clienteNombre}</TableCell>
                  <TableCell>{new Date(c.fechaVencimiento).toLocaleDateString()}</TableCell>
                  <TableCell>
                    {c.diasVencida > 0 ? (
                      <Badge variant="destructive" className="bg-destructive/10 text-destructive hover:bg-destructive/20">{c.diasVencida} días vencida</Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">Al día</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">{formatCurrency(c.total)}</TableCell>
                  <TableCell className="text-right font-bold text-foreground">{formatCurrency(c.saldoPendiente)}</TableCell>
                  <TableCell className="text-right">
                    <RegistrarAbonoModal facturaId={c.facturaId} saldo={c.saldoPendiente} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}

function CuentasPagarList() {
  const { data, isLoading } = useListCuentasPagar({});
  const safeData = Array.isArray(data) ? data : [];
  return (
    <Card className="border-border shadow-sm overflow-hidden bg-card">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow className="border-border">
              <TableHead>Compra #</TableHead>
              <TableHead>Proveedor</TableHead>
              <TableHead>Vencimiento</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Total Compra</TableHead>
              <TableHead className="text-right">Saldo Pendiente</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
               <TableRow><TableCell colSpan={6} className="text-center h-24"><Skeleton className="w-full h-8" /></TableCell></TableRow>
            ) : safeData.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center h-24 text-muted-foreground">No hay cuentas por pagar pendientes.</TableCell></TableRow>
            ) : (
              safeData.map(c => (
                <TableRow key={c.compraId} className="border-border">
                  <TableCell className="font-mono text-sm">{c.numero}</TableCell>
                  <TableCell className="font-medium">{c.proveedorNombre}</TableCell>
                  <TableCell>{new Date(c.fechaVencimiento).toLocaleDateString()}</TableCell>
                  <TableCell>
                    {c.diasVencida > 0 ? (
                      <Badge variant="destructive" className="bg-destructive/10 text-destructive hover:bg-destructive/20">{c.diasVencida} días vencida</Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">Al día</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">{formatCurrency(c.total)}</TableCell>
                  <TableCell className="text-right font-bold text-foreground">{formatCurrency(c.saldoPendiente)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}

function RegistrarAbonoModal({ facturaId, saldo }: { facturaId: number, saldo: number }) {
  const [open, setOpen] = useState(false);
  const [monto, setMonto] = useState(saldo);
  const abonoMutation = useCreateAbono();

  const handleGuardar = () => {
    abonoMutation.mutate({
      data: {
        facturaId,
        monto,
        fecha: new Date().toISOString(),
        descripcion: "Abono a cuenta"
      }
    }, {
      onSuccess: () => setOpen(false)
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-8">Abonar</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xs bg-card border-border">
        <DialogHeader>
          <DialogTitle>Registrar Abono</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Monto a abonar (COP)</label>
            <Input 
              type="number" 
              value={monto} 
              onChange={e => setMonto(Number(e.target.value))} 
              max={saldo}
            />
            <p className="text-xs text-muted-foreground">Saldo actual: {formatCurrency(saldo)}</p>
          </div>
          <Button className="w-full" onClick={handleGuardar} disabled={abonoMutation.isPending}>
            Confirmar Pago
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
