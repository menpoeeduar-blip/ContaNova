import { useState } from "react";
import { useGetFacturasResumen, useListFacturas, useCreateFactura } from "@workspace/api-client-react";
import { formatCurrency } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Search, FileText, CheckCircle2, Clock, Ban } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function Facturacion() {
  const [search, setSearch] = useState("");
  const { data: resumen, isLoading: resumenLoading } = useGetFacturasResumen();
  const { data: facturas, isLoading } = useListFacturas({ search });
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
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
            <DialogContent className="sm:max-w-[600px] bg-card border-border">
              <DialogHeader>
                <DialogTitle>Crear Factura</DialogTitle>
              </DialogHeader>
              <CreateFacturaForm onSuccess={() => setIsCreateOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border shadow-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Borrador</p>
              {resumenLoading ? <Skeleton className="h-8 w-20 mt-1" /> : <h3 className="text-2xl font-bold mt-1">{formatCurrency(resumen?.totalBorrador || 0)}</h3>}
            </div>
            <div className="p-3 bg-muted rounded-lg text-muted-foreground"><FileText className="w-5 h-5" /></div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border shadow-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Emitidas</p>
              {resumenLoading ? <Skeleton className="h-8 w-20 mt-1" /> : <h3 className="text-2xl font-bold mt-1 text-primary">{formatCurrency(resumen?.totalEmitidas || 0)}</h3>}
            </div>
            <div className="p-3 bg-primary/10 rounded-lg text-primary"><Clock className="w-5 h-5" /></div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border shadow-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Pagadas</p>
              {resumenLoading ? <Skeleton className="h-8 w-20 mt-1" /> : <h3 className="text-2xl font-bold mt-1 text-green-500">{formatCurrency(resumen?.totalPagadas || 0)}</h3>}
            </div>
            <div className="p-3 bg-green-500/10 rounded-lg text-green-500"><CheckCircle2 className="w-5 h-5" /></div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border shadow-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Anuladas</p>
              {resumenLoading ? <Skeleton className="h-8 w-20 mt-1" /> : <h3 className="text-2xl font-bold mt-1 text-destructive">{formatCurrency(resumen?.totalAnuladas || 0)}</h3>}
            </div>
            <div className="p-3 bg-destructive/10 rounded-lg text-destructive"><Ban className="w-5 h-5" /></div>
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className="border-border">
                    <TableCell><Skeleton className="h-4 w-[60px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-[80px] ml-auto" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-[80px] ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : facturas?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    No se encontraron facturas.
                  </TableCell>
                </TableRow>
              ) : (
                facturas?.map((factura) => (
                  <TableRow key={factura.id} className="border-border hover:bg-muted/30 transition-colors cursor-pointer">
                    <TableCell className="font-mono text-sm font-medium">{factura.numero}</TableCell>
                    <TableCell className="font-medium">{factura.clienteNombre}</TableCell>
                    <TableCell>{new Date(factura.fecha).toLocaleDateString()}</TableCell>
                    <TableCell>{new Date(factura.fechaVencimiento).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={
                        factura.estado === 'pagada' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                        factura.estado === 'emitida' ? 'bg-primary/10 text-primary border-primary/20' :
                        factura.estado === 'anulada' ? 'bg-destructive/10 text-destructive border-destructive/20' :
                        'bg-muted text-muted-foreground'
                      }>
                        {factura.estado.charAt(0).toUpperCase() + factura.estado.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(factura.total)}</TableCell>
                    <TableCell className="text-right font-bold text-foreground">
                      {factura.saldoPendiente !== null ? formatCurrency(factura.saldoPendiente) : '-'}
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

function CreateFacturaForm({ onSuccess }: { onSuccess: () => void }) {
  const createMutation = useCreateFactura();
  const [formData, setFormData] = useState({
    clienteId: 1, // placeholder for a real select
    fecha: new Date().toISOString().split('T')[0],
    fechaVencimiento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    items: [{ descripcion: "", cantidad: 1, precioUnitario: 0 }]
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(
      { data: { ...formData, fecha: new Date(formData.fecha).toISOString(), fechaVencimiento: new Date(formData.fechaVencimiento).toISOString() } },
      { onSuccess: () => onSuccess() }
    );
  };

  const addItem = () => setFormData({ ...formData, items: [...formData.items, { descripcion: "", cantidad: 1, precioUnitario: 0 }] });

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Cliente ID (Temporal)</label>
          <Input 
            type="number" required 
            value={formData.clienteId} 
            onChange={(e) => setFormData({...formData, clienteId: Number(e.target.value)})}
            className="bg-background"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Fecha Emisión</label>
          <Input 
            type="date" required 
            value={formData.fecha} 
            onChange={(e) => setFormData({...formData, fecha: e.target.value})}
            className="bg-background"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Fecha Vencimiento</label>
          <Input 
            type="date" required 
            value={formData.fechaVencimiento} 
            onChange={(e) => setFormData({...formData, fechaVencimiento: e.target.value})}
            className="bg-background"
          />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <h4 className="font-semibold text-sm">Líneas de Factura</h4>
          <Button type="button" variant="outline" size="sm" onClick={addItem}><Plus className="w-3 h-3 mr-1"/> Añadir Línea</Button>
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
                  setFormData({...formData, items: newItems});
                }}
              />
            </div>
            <div className="col-span-2">
              <Input 
                type="number" placeholder="Cant" required min="1"
                value={item.cantidad || ""}
                onChange={(e) => {
                  const newItems = [...formData.items];
                  newItems[index].cantidad = Number(e.target.value);
                  setFormData({...formData, items: newItems});
                }}
              />
            </div>
            <div className="col-span-4">
              <Input 
                type="number" placeholder="Precio Unit" required min="0"
                value={item.precioUnitario || ""}
                onChange={(e) => {
                  const newItems = [...formData.items];
                  newItems[index].precioUnitario = Number(e.target.value);
                  setFormData({...formData, items: newItems});
                }}
              />
            </div>
          </div>
        ))}
      </div>
      
      <div className="pt-4 flex justify-end gap-2 border-t border-border mt-6">
        <Button type="button" variant="outline" onClick={onSuccess}>Cancelar</Button>
        <Button type="submit" disabled={createMutation.isPending}>
          {createMutation.isPending ? "Guardando..." : "Emitir Factura"}
        </Button>
      </div>
    </form>
  );
}
