import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListClientes,
  useCreateCliente,
  useUpdateCliente,
  useDeleteCliente,
  getListClientesQueryKey,
  type Cliente,
} from "@workspace/api-client-react";
import { formatCurrency } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Search, Mail, Phone, MapPin, Building, Pencil, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

export default function Clientes() {
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();
  const { data: clientes, isLoading, refetch } = useListClientes({ search });
  const deleteMutation = useDeleteCliente();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Cliente | null>(null);

  const safeClientes = Array.isArray(clientes) ? clientes : [];

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getListClientesQueryKey() });
    refetch();
  };

  const handleDelete = (cliente: Cliente) => {
    if (!confirm(`¿Desactivar el cliente "${cliente.nombre}"?`)) return;
    deleteMutation.mutate(
      { id: cliente.id },
      { onSuccess: () => invalidate() }
    );
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground mt-1">Gestiona tu cartera de clientes empresariales.</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar cliente..."
              className="pl-9 bg-card border-border"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm">
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Cliente
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-card border-border">
              <DialogHeader>
                <DialogTitle>Crear Cliente</DialogTitle>
              </DialogHeader>
              <ClienteForm
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
            <DialogTitle>Editar Cliente</DialogTitle>
          </DialogHeader>
          {editing && (
            <ClienteForm
              cliente={editing}
              onSuccess={() => {
                setEditing(null);
                invalidate();
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <Card className="border-border shadow-sm overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow className="border-border">
                <TableHead>Nombre / Razón Social</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Ubicación</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Saldo Pendiente</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className="border-border">
                    <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[60px]" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-[80px] ml-auto" /></TableCell>
                    <TableCell />
                  </TableRow>
                ))
              ) : safeClientes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    No se encontraron clientes.
                  </TableCell>
                </TableRow>
              ) : (
                safeClientes.map((cliente) => (
                  <TableRow key={cliente.id} className="border-border hover:bg-muted/30 transition-colors">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs uppercase">
                          {cliente.nombre.substring(0, 2)}
                        </div>
                        {cliente.nombre}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {cliente.tipoDocumento} {cliente.numeroDocumento}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col text-sm">
                        {cliente.email && (
                          <span className="flex items-center text-muted-foreground">
                            <Mail className="w-3 h-3 mr-1" /> {cliente.email}
                          </span>
                        )}
                        {cliente.telefono && (
                          <span className="flex items-center text-muted-foreground">
                            <Phone className="w-3 h-3 mr-1" /> {cliente.telefono}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col text-sm">
                        {cliente.ciudad && (
                          <span className="flex items-center text-muted-foreground">
                            <Building className="w-3 h-3 mr-1" /> {cliente.ciudad}
                          </span>
                        )}
                        {cliente.direccion && (
                          <span className="flex items-center text-muted-foreground">
                            <MapPin className="w-3 h-3 mr-1" /> {cliente.direccion}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={cliente.activo ? "default" : "secondary"}
                        className={cliente.activo ? "bg-green-500/10 text-green-500 hover:bg-green-500/20" : ""}
                      >
                        {cliente.activo ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      <span
                        className={
                          cliente.saldoPendiente && cliente.saldoPendiente > 0
                            ? "text-orange-500"
                            : "text-muted-foreground"
                        }
                      >
                        {formatCurrency(cliente.saldoPendiente || 0)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => setEditing(cliente)} title="Editar">
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(cliente)}
                          disabled={deleteMutation.isPending}
                          title="Eliminar"
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

function ClienteForm({ cliente, onSuccess }: { cliente?: Cliente; onSuccess: () => void }) {
  const createMutation = useCreateCliente();
  const updateMutation = useUpdateCliente();
  const isEdit = !!cliente;
  const [formData, setFormData] = useState({
    nombre: cliente?.nombre || "",
    tipoDocumento: cliente?.tipoDocumento || "NIT",
    numeroDocumento: cliente?.numeroDocumento || "",
    email: cliente?.email || "",
    telefono: cliente?.telefono || "",
    direccion: cliente?.direccion || "",
    ciudad: cliente?.ciudad || "",
    activo: cliente?.activo ?? true,
  });

  const pending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEdit && cliente) {
      updateMutation.mutate({ id: cliente.id, data: formData }, { onSuccess });
    } else {
      createMutation.mutate({ data: formData }, { onSuccess });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Nombre / Razón Social</label>
        <Input
          required
          value={formData.nombre}
          onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
          className="bg-background"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Tipo Doc</label>
          <select
            className={selectClass}
            value={formData.tipoDocumento}
            onChange={(e) => setFormData({ ...formData, tipoDocumento: e.target.value })}
          >
            <option value="NIT">NIT</option>
            <option value="CC">CC</option>
            <option value="CE">CE</option>
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Número</label>
          <Input
            required
            value={formData.numeroDocumento}
            onChange={(e) => setFormData({ ...formData, numeroDocumento: e.target.value })}
            className="bg-background"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Email</label>
          <Input
            type="email"
            value={formData.email || ""}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="bg-background"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Teléfono</label>
          <Input
            value={formData.telefono || ""}
            onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
            className="bg-background"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Ciudad</label>
          <Input
            value={formData.ciudad || ""}
            onChange={(e) => setFormData({ ...formData, ciudad: e.target.value })}
            className="bg-background"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Dirección</label>
          <Input
            value={formData.direccion || ""}
            onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
            className="bg-background"
          />
        </div>
      </div>
      {isEdit && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Estado</label>
          <select
            className={selectClass}
            value={formData.activo ? "true" : "false"}
            onChange={(e) => setFormData({ ...formData, activo: e.target.value === "true" })}
          >
            <option value="true">Activo</option>
            <option value="false">Inactivo</option>
          </select>
        </div>
      )}
      <div className="pt-4 flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onSuccess}>
          Cancelar
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear Cliente"}
        </Button>
      </div>
    </form>
  );
}
