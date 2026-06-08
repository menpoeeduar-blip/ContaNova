import { useState } from "react";
import { useListCompras, useCreateCompra } from "@workspace/api-client-react";
import { formatCurrency } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Search, ShoppingCart } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function Compras() {
  const [search, setSearch] = useState("");
  const { data: compras, isLoading } = useListCompras({  }); // search param not supported in type, so not using it for now
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Órdenes de Compra</h1>
          <p className="text-muted-foreground mt-1">Gestión de adquisiciones y abastecimiento.</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm">
                <Plus className="h-4 w-4 mr-2" />
                Nueva Orden
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] bg-card border-border">
              <DialogHeader>
                <DialogTitle>Crear Orden de Compra</DialogTitle>
              </DialogHeader>
              <CreateCompraForm onSuccess={() => setIsCreateOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="border-border shadow-sm overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow className="border-border">
                <TableHead>Número</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Vencimiento</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Total</TableHead>
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
                  </TableRow>
                ))
              ) : compras?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    No se encontraron órdenes de compra.
                  </TableCell>
                </TableRow>
              ) : (
                compras?.map((compra) => (
                  <TableRow key={compra.id} className="border-border hover:bg-muted/30 transition-colors">
                    <TableCell className="font-mono text-sm font-medium">{compra.numero}</TableCell>
                    <TableCell className="font-medium">{compra.proveedorNombre}</TableCell>
                    <TableCell>{new Date(compra.fecha).toLocaleDateString()}</TableCell>
                    <TableCell>{compra.fechaVencimiento ? new Date(compra.fechaVencimiento).toLocaleDateString() : '-'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={
                        compra.estado === 'pagada' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                        compra.estado === 'recibida' ? 'bg-primary/10 text-primary border-primary/20' :
                        compra.estado === 'anulada' ? 'bg-destructive/10 text-destructive border-destructive/20' :
                        'bg-orange-500/10 text-orange-500 border-orange-500/20'
                      }>
                        {compra.estado.charAt(0).toUpperCase() + compra.estado.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(compra.total)}</TableCell>
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

function CreateCompraForm({ onSuccess }: { onSuccess: () => void }) {
  const createMutation = useCreateCompra();
  const [formData, setFormData] = useState({
    proveedorId: 1, // placeholder
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
          <label className="text-sm font-medium">Proveedor ID (Temporal)</label>
          <Input 
            type="number" required 
            value={formData.proveedorId} 
            onChange={(e) => setFormData({...formData, proveedorId: Number(e.target.value)})}
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
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <h4 className="font-semibold text-sm">Artículos</h4>
          <Button type="button" variant="outline" size="sm" onClick={addItem}><Plus className="w-3 h-3 mr-1"/> Añadir Artículo</Button>
        </div>
        {formData.items.map((item, index) => (
          <div key={index} className="grid grid-cols-12 gap-2 items-center bg-muted/20 p-2 rounded-md border border-border">
            <div className="col-span-6">
              <Input 
                placeholder="Descripción del artículo" required
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
                type="number" placeholder="Precio Costo" required min="0"
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
          {createMutation.isPending ? "Guardando..." : "Crear Orden"}
        </Button>
      </div>
    </form>
  );
}
