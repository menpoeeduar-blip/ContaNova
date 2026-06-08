import { useGetDashboardStats, useGetVentasMensuales, useGetTopProductos, useGetFlujoCaja } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatNumber } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowUpRight, ArrowDownRight, DollarSign, Users, Package, FileText, Wallet, AlertCircle } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, LineChart, Line } from "recharts";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: ventasMensuales, isLoading: ventasLoading } = useGetVentasMensuales();
  const { data: topProductos, isLoading: topProductosLoading } = useGetTopProductos();
  const { data: flujoCaja, isLoading: flujoCajaLoading } = useGetFlujoCaja();

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Resumen ejecutivo del estado de la empresa.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Ventas del Mes" 
          value={stats?.ventasMes} 
          isCurrency 
          trend={stats?.variacionVentasMes} 
          icon={DollarSign} 
          loading={statsLoading} 
        />
        <StatCard 
          title="Utilidad del Mes" 
          value={stats?.utilidadMes} 
          isCurrency 
          icon={ArrowUpRight} 
          loading={statsLoading} 
        />
        <StatCard 
          title="Por Cobrar" 
          value={stats?.cuentasPorCobrar} 
          isCurrency 
          icon={Wallet} 
          loading={statsLoading} 
        />
        <StatCard 
          title="Por Pagar" 
          value={stats?.cuentasPorPagar} 
          isCurrency 
          icon={AlertCircle} 
          loading={statsLoading} 
        />
        <StatCard 
          title="Ventas Hoy" 
          value={stats?.ventasHoy} 
          isCurrency 
          icon={DollarSign} 
          loading={statsLoading} 
        />
        <StatCard 
          title="Clientes" 
          value={stats?.totalClientes} 
          icon={Users} 
          loading={statsLoading} 
        />
        <StatCard 
          title="Productos" 
          value={stats?.totalProductos} 
          icon={Package} 
          loading={statsLoading} 
        />
        <StatCard 
          title="Facturas Pendientes" 
          value={stats?.facturasPendientes} 
          icon={FileText} 
          loading={statsLoading} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="bg-card shadow-sm border-border">
          <CardHeader>
            <CardTitle>Ventas Mensuales</CardTitle>
          </CardHeader>
          <CardContent>
            {ventasLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={ventasMensuales} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v/1000000}M`} />
                    <RechartsTooltip 
                      formatter={(value: number) => [formatCurrency(value), "Ventas"]}
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                    />
                    <Area type="monotone" dataKey="total" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorVentas)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card shadow-sm border-border">
          <CardHeader>
            <CardTitle>Flujo de Caja</CardTitle>
          </CardHeader>
          <CardContent>
            {flujoCajaLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={flujoCaja} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="fecha" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v/1000000}M`} />
                    <RechartsTooltip 
                      formatter={(value: number, name: string) => [formatCurrency(value), name === 'ingresos' ? 'Ingresos' : 'Egresos']}
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                    />
                    <Line type="monotone" dataKey="ingresos" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="egresos" stroke="hsl(var(--destructive))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card shadow-sm border-border lg:col-span-2">
          <CardHeader>
            <CardTitle>Top Productos</CardTitle>
          </CardHeader>
          <CardContent>
            {topProductosLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topProductos} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="nombre" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v/1000000}M`} />
                    <RechartsTooltip 
                      formatter={(value: number) => [formatCurrency(value), "Total Ventas"]}
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                    />
                    <Bar dataKey="totalVentas" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ 
  title, 
  value, 
  isCurrency, 
  trend, 
  icon: Icon, 
  loading 
}: { 
  title: string; 
  value?: number; 
  isCurrency?: boolean; 
  trend?: number | null; 
  icon: any; 
  loading: boolean;
}) {
  return (
    <Card className="bg-card shadow-sm border-border relative overflow-hidden group hover:border-primary/50 transition-colors">
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-primary/10 transition-colors" />
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            {loading ? (
              <Skeleton className="h-8 w-32 mt-2" />
            ) : (
              <h3 className="text-2xl font-bold text-foreground mt-1">
                {value !== undefined ? (isCurrency ? formatCurrency(value) : formatNumber(value)) : '-'}
              </h3>
            )}
            
            {trend !== undefined && trend !== null && !loading && (
              <div className={`flex items-center mt-2 text-sm ${trend >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {trend >= 0 ? <ArrowUpRight className="w-4 h-4 mr-1" /> : <ArrowDownRight className="w-4 h-4 mr-1" />}
                <span>{Math.abs(trend).toFixed(1)}% vs mes anterior</span>
              </div>
            )}
          </div>
          <div className="p-3 bg-secondary rounded-lg text-primary">
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
