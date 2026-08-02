import { useState } from "react";
import {
  useListOportunidades,
  useGetCrmStats,
  useCreateOportunidad,
  useUpdateOportunidad,
  useDeleteOportunidad,
  useListClientes,
  type Oportunidad,
} from "@workspace/api-client-react";
import { formatCurrency } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar, Target, User, TrendingUp, Plus, Trash2 } from "lucide-react";

const STAGES = [
  { id: "prospecto", label: "Prospecto", color: "bg-slate-500/10 text-slate-500 border-slate-500/20" },
  { id: "calificado", label: "Calificado", color: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  { id: "propuesta", label: "Propuesta", color: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20" },
  { id: "negociacion", label: "Negociación", color: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
  { id: "ganado", label: "Ganado", color: "bg-green-500/10 text-green-500 border-green-500/20" },
  { id: "perdido", label: "Perdido", color: "bg-red-500/10 text-red-500 border-red-500/20" },
];

const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

function matchesStage(etapa: string, stageId: string) {
  if (etapa === stageId) return true;
  if (stageId === "ganado" && (etapa === "ganada" || etapa === "ganado")) return true;
  if (stageId === "perdido" && (etapa === "perdida" || etapa === "perdido")) return true;
  return false;
}

function formatFechaCierre(fecha: string | null | undefined) {
  if (!fecha) return "—";
  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function toDateInputValue(fecha: string | null | undefined) {
  if (!fecha) return "";
  return fecha.slice(0, 10);
}

export default function CRM() {
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useGetCrmStats();
  const { data: oportunidades, isLoading, refetch } = useListOportunidades();
  const { data: clientes } = useListClientes({});
  const deleteMutation = useDeleteOportunidad();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Oportunidad | null>(null);

  const safeOportunidades = Array.isArray(oportunidades) ? oportunidades : [];
  const safeClientes = Array.isArray(clientes) ? clientes : [];

  const refresh = () => {
    refetch();
    refetchStats();
  };

  const handleDelete = (op: Oportunidad, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!confirm(`¿Eliminar la oportunidad "${op.titulo}"?`)) return;
    deleteMutation.mutate(
      { id: op.id },
      {
        onSuccess: () => {
          if (editing?.id === op.id) setEditing(null);
          refresh();
        },
      }
    );
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto h-full flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">CRM & Ventas</h1>
          <p className="text-muted-foreground mt-1">Pipeline comercial y seguimiento de oportunidades.</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm">
              <Plus className="h-4 w-4 mr-2" />
              Nueva oportunidad
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[520px] bg-card border-border max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nueva oportunidad</DialogTitle>
            </DialogHeader>
            <OportunidadForm
              clientes={safeClientes}
              onSuccess={() => {
                setIsCreateOpen(false);
                refresh();
              }}
              onCancel={() => setIsCreateOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border shadow-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Valor Pipeline (Activo)</p>
              {statsLoading ? <Skeleton className="h-8 w-32 mt-1" /> : <h3 className="text-2xl font-bold mt-1 text-primary">{formatCurrency(stats?.valorPipeline || 0)}</h3>}
            </div>
            <div className="p-3 bg-primary/10 rounded-lg text-primary"><Target className="w-5 h-5" /></div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border shadow-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Oportunidades</p>
              {statsLoading ? <Skeleton className="h-8 w-20 mt-1" /> : <h3 className="text-2xl font-bold mt-1">{stats?.totalOportunidades}</h3>}
            </div>
            <div className="p-3 bg-secondary rounded-lg text-foreground"><TrendingUp className="w-5 h-5" /></div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border shadow-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Tasa Conversión</p>
              {statsLoading ? <Skeleton className="h-8 w-20 mt-1" /> : <h3 className="text-2xl font-bold mt-1 text-green-500">{(stats?.tasaConversion ?? 0).toFixed(1)}%</h3>}
            </div>
            <div className="p-3 bg-green-500/10 rounded-lg text-green-500"><TrendingUp className="w-5 h-5" /></div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border shadow-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Negocios Cerrados</p>
              {statsLoading ? <Skeleton className="h-8 w-20 mt-1" /> : <h3 className="text-2xl font-bold mt-1">{stats?.ganadas}</h3>}
            </div>
            <div className="p-3 bg-green-500/10 rounded-lg text-green-500"><Target className="w-5 h-5" /></div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-[520px] bg-card border-border max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar oportunidad</DialogTitle>
          </DialogHeader>
          {editing && (
            <OportunidadForm
              oportunidad={editing}
              clientes={safeClientes}
              onSuccess={() => {
                setEditing(null);
                refresh();
              }}
              onCancel={() => setEditing(null)}
              onDelete={() => handleDelete(editing)}
            />
          )}
        </DialogContent>
      </Dialog>

      <div className="flex-1 overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-max h-full min-h-[500px]">
          {STAGES.map(stage => {
            const cols = safeOportunidades.filter(o => matchesStage(o.etapa, stage.id));
            return (
              <div key={stage.id} className="w-80 flex flex-col gap-3">
                <div className="flex items-center justify-between bg-muted/50 rounded-t-lg border-b-2 border-b-primary/20 p-3">
                  <h3 className="font-semibold text-sm tracking-tight">{stage.label}</h3>
                  <Badge variant="secondary" className="text-xs bg-background">{cols.length}</Badge>
                </div>

                <div className="flex-1 bg-muted/20 rounded-b-lg p-2 space-y-3 overflow-y-auto">
                  {isLoading ? (
                    Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-lg" />)
                  ) : cols.length === 0 ? (
                    <div className="text-center p-4 text-sm text-muted-foreground">Sin oportunidades</div>
                  ) : cols.map(op => (
                    <Card
                      key={op.id}
                      className="border border-border shadow-sm cursor-pointer hover:border-primary/50 transition-colors bg-card hover-elevate"
                      onClick={() => setEditing(op)}
                    >
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <Badge variant="outline" className={`text-[10px] ${stage.color}`}>{stage.label}</Badge>
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-medium text-muted-foreground">{op.probabilidad}%</span>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 text-destructive hover:text-destructive"
                              onClick={(e) => handleDelete(op, e)}
                              disabled={deleteMutation.isPending}
                              title="Eliminar"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                        <h4 className="font-bold text-sm leading-tight mb-1 line-clamp-2">{op.titulo}</h4>
                        <div className="flex items-center text-xs text-muted-foreground mb-3">
                          <User className="w-3 h-3 mr-1" />
                          <span className="truncate">{op.clienteNombre}</span>
                        </div>
                        <div className="flex justify-between items-end mt-auto pt-3 border-t border-border">
                          <div className="text-primary font-bold text-sm">
                            {formatCurrency(op.valor)}
                          </div>
                          <div className="flex items-center text-xs text-muted-foreground">
                            <Calendar className="w-3 h-3 mr-1" />
                            {formatFechaCierre(op.fechaCierre as string | null)}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

type ClienteOption = { id: number; nombre: string };

function OportunidadForm({
  oportunidad,
  clientes,
  onSuccess,
  onCancel,
  onDelete,
}: {
  oportunidad?: Oportunidad;
  clientes: ClienteOption[];
  onSuccess: () => void;
  onCancel: () => void;
  onDelete?: () => void;
}) {
  const createMutation = useCreateOportunidad();
  const updateMutation = useUpdateOportunidad();
  const isEdit = !!oportunidad;

  const [formData, setFormData] = useState({
    titulo: oportunidad?.titulo || "",
    clienteId: oportunidad?.clienteId ? String(oportunidad.clienteId) : "",
    etapa: oportunidad?.etapa || "prospecto",
    valor: oportunidad?.valor ?? 0,
    probabilidad: oportunidad?.probabilidad ?? 25,
    fechaCierre: toDateInputValue(oportunidad?.fechaCierre as string | null),
    responsable: oportunidad?.responsable || "",
    descripcion: oportunidad?.descripcion || "",
  });

  const pending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.titulo.trim() || !formData.clienteId || !formData.fechaCierre) return;

    const payload = {
      titulo: formData.titulo.trim(),
      etapa: formData.etapa as Oportunidad["etapa"],
      valor: Number(formData.valor) || 0,
      probabilidad: Number(formData.probabilidad) || 0,
      fechaCierre: formData.fechaCierre,
      responsable: formData.responsable || undefined,
      descripcion: formData.descripcion || undefined,
    };

    if (isEdit && oportunidad) {
      updateMutation.mutate(
        { id: oportunidad.id, data: payload },
        { onSuccess }
      );
    } else {
      createMutation.mutate(
        {
          data: {
            ...payload,
            clienteId: Number(formData.clienteId),
          },
        },
        { onSuccess }
      );
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Título</label>
        <Input
          required
          value={formData.titulo}
          onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
          className="bg-background"
          placeholder="Nombre de la oportunidad"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Cliente</label>
        <select
          required
          className={selectClass}
          value={formData.clienteId}
          onChange={(e) => setFormData({ ...formData, clienteId: e.target.value })}
          disabled={isEdit}
        >
          <option value="">Seleccionar cliente...</option>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>{c.nombre}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Etapa</label>
          <select
            className={selectClass}
            value={formData.etapa}
            onChange={(e) => setFormData({ ...formData, etapa: e.target.value })}
          >
            {STAGES.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Fecha de cierre</label>
          <Input
            type="date"
            required
            value={formData.fechaCierre}
            onChange={(e) => setFormData({ ...formData, fechaCierre: e.target.value })}
            className="bg-background"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Valor</label>
          <Input
            type="number"
            min={0}
            step="0.01"
            value={formData.valor}
            onChange={(e) => setFormData({ ...formData, valor: Number(e.target.value) })}
            className="bg-background"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Probabilidad (%)</label>
          <Input
            type="number"
            min={0}
            max={100}
            value={formData.probabilidad}
            onChange={(e) => setFormData({ ...formData, probabilidad: Number(e.target.value) })}
            className="bg-background"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Responsable</label>
        <Input
          value={formData.responsable}
          onChange={(e) => setFormData({ ...formData, responsable: e.target.value })}
          className="bg-background"
          placeholder="Nombre del responsable"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Descripción</label>
        <Textarea
          value={formData.descripcion}
          onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
          className="bg-background min-h-[80px]"
          placeholder="Notas o detalles de la oportunidad"
        />
      </div>

      <div className="pt-4 flex justify-between gap-2">
        <div>
          {isEdit && onDelete && (
            <Button
              type="button"
              variant="destructive"
              onClick={onDelete}
              disabled={pending}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Eliminar
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear oportunidad"}
          </Button>
        </div>
      </div>
    </form>
  );
}
