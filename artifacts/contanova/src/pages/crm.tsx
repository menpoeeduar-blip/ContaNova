import { useListOportunidades, useGetCrmStats } from "@workspace/api-client-react";
import { formatCurrency } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Target, User, TrendingUp } from "lucide-react";

const STAGES = [
  { id: "prospecto", label: "Prospecto", color: "bg-slate-500/10 text-slate-500 border-slate-500/20" },
  { id: "calificado", label: "Calificado", color: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  { id: "propuesta", label: "Propuesta", color: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20" },
  { id: "negociacion", label: "Negociación", color: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
  { id: "ganado", label: "Ganado", color: "bg-green-500/10 text-green-500 border-green-500/20" },
  { id: "perdido", label: "Perdido", color: "bg-red-500/10 text-red-500 border-red-500/20" },
];

export default function CRM() {
  const { data: stats, isLoading: statsLoading } = useGetCrmStats();
  const { data: oportunidades, isLoading } = useListOportunidades();

  return (
    <div className="p-8 space-y-6 max-w-[1600px] mx-auto h-full flex flex-col">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">CRM & Ventas</h1>
        <p className="text-muted-foreground mt-1">Pipeline comercial y seguimiento de oportunidades.</p>
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
              {statsLoading ? <Skeleton className="h-8 w-20 mt-1" /> : <h3 className="text-2xl font-bold mt-1 text-green-500">{stats?.tasaConversion.toFixed(1)}%</h3>}
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

      <div className="flex-1 overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-max h-full min-h-[500px]">
          {STAGES.map(stage => {
            const cols = oportunidades?.filter(o => o.etapa === stage.id) || [];
            return (
              <div key={stage.id} className="w-80 flex flex-col gap-3">
                <div className="flex items-center justify-between bg-muted/50 rounded-t-lg border-b-2 border-b-primary/20 p-3">
                  <h3 className="font-semibold text-sm tracking-tight">{stage.label}</h3>
                  <Badge variant="secondary" className="text-xs bg-background">{cols.length}</Badge>
                </div>
                
                <div className="flex-1 bg-muted/20 rounded-b-lg p-2 space-y-3 overflow-y-auto">
                  {isLoading ? (
                    Array.from({length: 2}).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-lg" />)
                  ) : cols.length === 0 ? (
                    <div className="text-center p-4 text-sm text-muted-foreground">Sin oportunidades</div>
                  ) : cols.map(op => (
                    <Card key={op.id} className="border border-border shadow-sm cursor-grab hover:border-primary/50 transition-colors bg-card hover-elevate">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <Badge variant="outline" className={`text-[10px] ${stage.color}`}>{stage.label}</Badge>
                          <span className="text-xs font-medium text-muted-foreground">{op.probabilidad}%</span>
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
                            {new Date(op.fechaCierre).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
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
