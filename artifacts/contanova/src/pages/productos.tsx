import { useState } from "react";
import { useListProductos, useGetInventarioStats, useCreateProducto } from "@workspace/api-client-react";
import { formatCurrency, formatNumber } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Search, AlertTriangle, PackageOpen, Layers, DollarSign } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function Productos() {
  const [search, setSearch] = useState("");
  const { data: stats, isLoading: statsLoading } = useGetInventarioStats();
  const { data: productos, isLoading } = useListProductos({ search });
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Catálogo de Productos</h1>
        <p className="text-muted-foreground mt-1">Control de inventario y precios.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border shadow-sm">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Productos</p>
                {statsLoading ? <Skeleton className="h-8 w-20 mt-2" /> : <h3 className="text-2xl font-bold mt-1">{stats?.totalProductos}</h3>}
              </div>
              <div className="p-3 bg-secondary rounded-lg text-primary"><PackageOpen className="w-5 h-5" /></div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border shadow-sm">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Categorías</p>
                {statsLoading ? <Skeleton className="h-8 w-20 mt-2" /> : <h3 className="text-2xl font-bold mt-1">{stats?.categorias}</h3>}
              </div>
              <div className="p-3 bg-secondary rounded-lg text-primary"><Layers className="w-5 h-5" /></div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border shadow-sm">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Valor Inventario</p>
                {statsLoading ? <Skeleton className="h-8 w-32 mt-2" /> : <h3 className="text-2xl font-bold mt-1">{formatCurrency(stats?.valorInventario || 0)}</h3>}
              </div>
              <div className="p-3 bg-secondary rounded-lg text-primary"><DollarSign className="w-5 h-5" /></div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-destructive/5 border-destructive/20 shadow-sm relative overflow-hidden group">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-destructive">Alertas Stock</p>
                {statsLoading ? <Skeleton className="h-8 w-20 mt-2" /> : <h3 className="text-2xl font-bold text-destructive mt-1">{stats?.productosBajoStock}</h3>}
              </div>
              <div className="p-3 bg-destructive/10 rounded-lg text-destructive"><AlertTriangle className="w-5 h-5" /></div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            type="search" 
            placeholder="Buscar por código o nombre..." 
            className="pl-9 bg-card border-border"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm">
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Producto
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] bg-card border-border">
            <DialogHeader>
              <DialogTitle>Añadir Producto al Catálogo</DialogTitle>
            </DialogHeader>
            <CreateProductoForm onSuccess={() => setIsCreateOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-border shadow-sm overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow className="border-border">
                <TableHead>Código</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead className="text-right">Precio Venta</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className="border-border">
                    <TableCell><Skeleton className="h-4 w-[60px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[200px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-[80px] ml-auto" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-[40px] ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[60px]" /></TableCell>
                  </TableRow>
                ))
              ) : productos?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    No se encontraron productos.
                  </TableCell>
                </TableRow>
              ) : (
                productos?.map((producto) => (
                  <TableRow key={producto.id} className="border-border hover:bg-muted/30 transition-colors">
                    <TableCell className="font-medium font-mono text-sm text-muted-foreground">{producto.codigo}</TableCell>
                    <TableCell className="font-medium">{producto.nombre}</TableCell>
                    <TableCell>
                      {producto.categoria ? (
                        <Badge variant="outline" className="bg-secondary/50 text-secondary-foreground">{producto.categoria}</Badge>
                      ) : <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(producto.precioVenta)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {producto.stockMinimo && producto.stock <= producto.stockMinimo && (
                          <AlertTriangle className="w-4 h-4 text-destructive" />
                        )}
                        <span className={producto.stockMinimo && producto.stock <= producto.stockMinimo ? "text-destructive font-bold" : ""}>
                          {formatNumber(producto.stock)} {producto.unidad}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={producto.activo ? "default" : "secondary"} className={producto.activo ? "bg-green-500/10 text-green-500 hover:bg-green-500/20" : ""}>
                        {producto.activo ? "Activo" : "Inactivo"}
                      </Badge>
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

function CreateProductoForm({ onSuccess }: { onSuccess: () => void }) {
  const createMutation = useCreateProducto();
  const [formData, setFormData] = useState({
    codigo: "",
    nombre: "",
    categoria: "",
    unidad: "UND",
    precioVenta: 0,
    precioCosto: 0,
    stock: 0,
    stockMinimo: 0,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(
      { data: formData },
      { onSuccess: () => onSuccess() }
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Código</label>
          <Input 
            required 
            value={formData.codigo} 
            onChange={(e) => setFormData({...formData, codigo: e.target.value})}
            className="bg-background uppercase"
          />
        </div>
        <div className="space-y-2 col-span-2">
          <label className="text-sm font-medium">Nombre de Producto</label>
          <Input 
            required 
            value={formData.nombre} 
            onChange={(e) => setFormData({...formData, nombre: e.target.value})} 
            className="bg-background"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Categoría</label>
          <Input 
            value={formData.categoria} 
            onChange={(e) => setFormData({...formData, categoria: e.target.value})}
            className="bg-background"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Unidad de Medida</label>
          <Input 
            value={formData.unidad} 
            onChange={(e) => setFormData({...formData, unidad: e.target.value})}
            className="bg-background"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Precio Venta (COP)</label>
          <Input 
            type="number" required min="0"
            value={formData.precioVenta || ""} 
            onChange={(e) => setFormData({...formData, precioVenta: Number(e.target.value)})}
            className="bg-background"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Precio Costo (COP)</label>
          <Input 
            type="number" min="0"
            value={formData.precioCosto || ""} 
            onChange={(e) => setFormData({...formData, precioCosto: Number(e.target.value)})}
            className="bg-background"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Stock Inicial</label>
          <Input 
            type="number" min="0"
            value={formData.stock || ""} 
            onChange={(e) => setFormData({...formData, stock: Number(e.target.value)})}
            className="bg-background"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Stock Mínimo</label>
          <Input 
            type="number" min="0"
            value={formData.stockMinimo || ""} 
            onChange={(e) => setFormData({...formData, stockMinimo: Number(e.target.value)})}
            className="bg-background"
          />
        </div>
      </div>
      <div className="pt-4 flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onSuccess}>Cancelar</Button>
        <Button type="submit" disabled={createMutation.isPending}>
          {createMutation.isPending ? "Guardando..." : "Crear Producto"}
        </Button>
      </div>
    </form>
  );
}
