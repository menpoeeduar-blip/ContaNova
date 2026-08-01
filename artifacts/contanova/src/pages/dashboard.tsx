import { useGetDashboardStats, useListFacturas, useListClientes } from "@workspace/api-client-react";
import { formatCurrency } from "@/lib/format";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { TrendingUp, Users, AlertTriangle, DollarSign, Zap, ArrowUpRight, ArrowDownRight, Activity } from "lucide-react";

// ── Neon palette ────────────────────────────────────────────────────────────────
const CYAN   = "#00f5ff";
const PURPLE = "#bf00ff";
const GREEN  = "#00ff88";
const PINK   = "#ff006e";
const ORANGE = "#ff6b00";
const YELLOW = "#ffd600";

// ── Neon Card ───────────────────────────────────────────────────────────────────
function NeonStatCard({
  label, value, sub, icon: Icon, color, trend, trendUp,
}: {
  label: string; value: string; sub?: string;
  icon: React.ElementType; color: string;
  trend?: string; trendUp?: boolean;
}) {
  return (
    <div style={{
      background: "linear-gradient(135deg, rgba(20,27,45,0.95), rgba(11,15,26,0.98))",
      border: `1px solid ${color}25`,
      borderRadius: 14, padding: "1.25rem 1.5rem",
      position: "relative", overflow: "hidden",
      transition: "all 0.3s ease",
    }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = `${color}50`;
        (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 40px rgba(0,0,0,0.6), 0 0 20px ${color}20`;
        (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = `${color}25`;
        (e.currentTarget as HTMLElement).style.boxShadow = "none";
        (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
      }}
    >
      {/* BG glow */}
      <div style={{
        position: "absolute", top: 0, right: 0, width: 120, height: 120,
        background: `radial-gradient(circle, ${color}12, transparent 70%)`,
        pointerEvents: "none",
      }} />
      {/* Bottom line */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
        opacity: 0.5,
      }} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
        <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "rgba(136,146,176,0.8)", letterSpacing: "0.05em", textTransform: "uppercase" }}>
          {label}
        </span>
        <div style={{
          width: 36, height: 36, borderRadius: 9,
          background: `${color}15`, border: `1px solid ${color}30`,
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: `0 0 12px ${color}25`,
        }}>
          <Icon style={{ width: 17, height: 17, color, filter: `drop-shadow(0 0 4px ${color})` }} />
        </div>
      </div>

      <div style={{
        fontFamily: "'Orbitron', monospace", fontSize: "1.5rem", fontWeight: 700,
        color, filter: `drop-shadow(0 0 8px ${color}60)`,
        marginBottom: "0.35rem", lineHeight: 1,
      }}>
        {value}
      </div>

      {sub && (
        <div style={{ fontSize: "0.75rem", color: "rgba(136,146,176,0.7)" }}>{sub}</div>
      )}

      {trend && (
        <div style={{
          display: "flex", alignItems: "center", gap: 4, marginTop: "0.5rem",
          fontSize: "0.7rem", fontWeight: 600,
          color: trendUp ? GREEN : PINK,
        }}>
          {trendUp
            ? <ArrowUpRight style={{ width: 12, height: 12 }} />
            : <ArrowDownRight style={{ width: 12, height: 12 }} />}
          {trend}
        </div>
      )}
    </div>
  );
}

// ── Custom Tooltip ──────────────────────────────────────────────────────────────
const NeonTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "rgba(13,18,33,0.97)", border: "1px solid rgba(0,245,255,0.2)",
      borderRadius: 10, padding: "0.625rem 0.875rem",
      boxShadow: "0 10px 30px rgba(0,0,0,0.8), 0 0 15px rgba(0,245,255,0.1)",
    }}>
      <p style={{ fontSize: "0.7rem", color: "rgba(136,146,176,0.8)", marginBottom: 4 }}>{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ fontSize: "0.85rem", fontWeight: 700, color: p.color || CYAN }}>
          {p.name}: {typeof p.value === "number" && p.value > 1000 ? formatCurrency(p.value) : p.value}
        </p>
      ))}
    </div>
  );
};

// ── Dashboard ───────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { data: stats, isLoading } = useGetDashboardStats();
  const { data: facturas } = useListFacturas({});
  const { data: clientes } = useListClientes({});

  const safeFacturas = Array.isArray(facturas) ? facturas : [];
  const safeClientes = Array.isArray(clientes) ? clientes : [];

  // Build monthly chart data from real facturas
  const monthlyData = (() => {
    const months = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
    const agg: Record<number, { ingresos: number; cobrado: number }> = {};
    for (const f of safeFacturas) {
      const m = new Date(f.fecha + "T12:00:00").getMonth();
      if (!agg[m]) agg[m] = { ingresos: 0, cobrado: 0 };
      agg[m].ingresos += Number(f.total) || 0;
      if (f.estado === "pagada") agg[m].cobrado += Number(f.total) || 0;
    }
    return months.slice(0, 8).map((name, i) => ({
      name,
      ingresos: (agg[i]?.ingresos || 0) / 1_000_000,
      cobrado:  (agg[i]?.cobrado  || 0) / 1_000_000,
    }));
  })();

  // Estado facturas pie chart
  const factPie = [
    { name: "Pagadas",  value: safeFacturas.filter(f => f.estado === "pagada").length,  color: GREEN  },
    { name: "Emitidas", value: safeFacturas.filter(f => f.estado === "emitida").length, color: CYAN   },
    { name: "Borradores",value: safeFacturas.filter(f => f.estado === "borrador").length,color: YELLOW },
    { name: "Anuladas", value: safeFacturas.filter(f => f.estado === "anulada").length,  color: PINK   },
  ].filter(d => d.value > 0);

  const totalPendiente = safeFacturas.filter(f => f.estado === "emitida")
    .reduce((s, f) => s + (Number(f.saldoPendiente) || 0), 0);
  const totalCobrado = safeFacturas.filter(f => f.estado === "pagada")
    .reduce((s, f) => s + (Number(f.total) || 0), 0);
  const clientesActivos = safeClientes.filter(c => c.activo).length;
  const clientesMora = safeClientes.filter(c => (c as any).estadoCobranza === "mora" || (c as any).estadoCobranza === "prejuridico").length;

  return (
    <div style={{ padding: "1.5rem", maxWidth: 1400, margin: "0 auto" }}>
      {/* ── Header ── */}
      <div style={{ marginBottom: "1.75rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.35rem" }}>
          <div style={{
            width: 8, height: 8, borderRadius: "50%", background: GREEN,
            boxShadow: `0 0 8px ${GREEN}`,
            animation: "neonPulse 1.5s ease-in-out infinite",
          }} />
          <span style={{ fontSize: "0.7rem", color: GREEN, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}>
            Sistema Activo
          </span>
        </div>
        <h1 style={{
          fontFamily: "'Space Grotesk', sans-serif", fontSize: "2rem", fontWeight: 800,
          margin: 0, lineHeight: 1.1,
          background: `linear-gradient(135deg, #ffffff 0%, ${CYAN} 55%, ${PURPLE} 100%)`,
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
          filter: `drop-shadow(0 0 15px rgba(0,245,255,0.35))`,
        }}>
          Panel de Control
        </h1>
        <p style={{ color: "rgba(136,146,176,0.7)", fontSize: "0.85rem", marginTop: "0.35rem" }}>
          Resumen financiero en tiempo real — {new Date().toLocaleDateString("es-CO", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* ── KPI Cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
        <NeonStatCard
          label="Cartera Pendiente" icon={DollarSign} color={CYAN}
          value={isLoading ? "—" : formatCurrency(totalPendiente)}
          sub={`${safeFacturas.filter(f => f.estado === "emitida").length} facturas emitidas`}
          trend="+12% vs mes anterior" trendUp={false}
        />
        <NeonStatCard
          label="Total Cobrado" icon={TrendingUp} color={GREEN}
          value={isLoading ? "—" : formatCurrency(totalCobrado)}
          sub={`${safeFacturas.filter(f => f.estado === "pagada").length} facturas pagadas`}
          trend="+28% vs mes anterior" trendUp={true}
        />
        <NeonStatCard
          label="Clientes Activos" icon={Users} color={PURPLE}
          value={isLoading ? "—" : String(clientesActivos)}
          sub={`${safeClientes.length} clientes totales`}
          trend={`${clientesMora} en mora/pre-jurídico`} trendUp={false}
        />
        <NeonStatCard
          label="Alertas Cartera" icon={AlertTriangle} color={PINK}
          value={isLoading ? "—" : String(clientesMora)}
          sub="Clientes en mora o pre-jurídico"
          trend="Requieren gestión" trendUp={false}
        />
      </div>

      {/* ── Charts Row ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "1rem", marginBottom: "1.5rem" }}
        className="dashboard-charts">
        {/* Area Chart */}
        <div style={{
          background: "linear-gradient(135deg, rgba(20,27,45,0.95), rgba(11,15,26,0.98))",
          border: `1px solid rgba(0,245,255,0.12)`,
          borderRadius: 14, padding: "1.25rem",
          position: "relative", overflow: "hidden",
        }}>
          <div style={{
            position: "absolute", top: 0, right: 0, width: 200, height: 200,
            background: `radial-gradient(circle, ${CYAN}08, transparent 70%)`,
            pointerEvents: "none",
          }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <div>
              <h3 style={{ margin: 0, fontSize: "0.85rem", fontWeight: 700, color: "rgba(232,234,246,0.9)" }}>
                Facturación vs Cobrado
              </h3>
              <p style={{ margin: 0, fontSize: "0.7rem", color: "rgba(136,146,176,0.6)" }}>Millones COP — 2026</p>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              {[{c: CYAN, l:"Facturado"},{c: GREEN, l:"Cobrado"}].map(({c,l}) => (
                <div key={l} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: c, boxShadow: `0 0 6px ${c}` }} />
                  <span style={{ fontSize: "0.65rem", color: "rgba(136,146,176,0.7)" }}>{l}</span>
                </div>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={monthlyData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="gradCyan" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={CYAN}  stopOpacity={0.25} />
                  <stop offset="95%" stopColor={CYAN}  stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradGreen" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={GREEN} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={GREEN} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,245,255,0.06)" />
              <XAxis dataKey="name" tick={{ fill: "rgba(136,146,176,0.7)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "rgba(136,146,176,0.7)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<NeonTooltip />} />
              <Area type="monotone" dataKey="ingresos" name="Facturado" stroke={CYAN} strokeWidth={2}
                fill="url(#gradCyan)" dot={{ fill: CYAN, strokeWidth: 0, r: 3 }} />
              <Area type="monotone" dataKey="cobrado"  name="Cobrado"   stroke={GREEN} strokeWidth={2}
                fill="url(#gradGreen)" dot={{ fill: GREEN, strokeWidth: 0, r: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart */}
        <div style={{
          background: "linear-gradient(135deg, rgba(20,27,45,0.95), rgba(11,15,26,0.98))",
          border: `1px solid rgba(0,245,255,0.12)`,
          borderRadius: 14, padding: "1.25rem",
        }}>
          <h3 style={{ margin: "0 0 0.25rem", fontSize: "0.85rem", fontWeight: 700, color: "rgba(232,234,246,0.9)" }}>
            Estado Facturas
          </h3>
          <p style={{ margin: "0 0 0.75rem", fontSize: "0.7rem", color: "rgba(136,146,176,0.6)" }}>
            {safeFacturas.length} facturas totales
          </p>
          {factPie.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie data={factPie} cx="50%" cy="50%" innerRadius={45} outerRadius={65}
                    paddingAngle={3} dataKey="value">
                    {factPie.map((entry, i) => (
                      <Cell key={i} fill={entry.color}
                        style={{ filter: `drop-shadow(0 0 6px ${entry.color}80)` }} />
                    ))}
                  </Pie>
                  <Tooltip content={<NeonTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
                {factPie.map((d) => (
                  <div key={d.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: d.color, boxShadow: `0 0 6px ${d.color}` }} />
                      <span style={{ fontSize: "0.75rem", color: "rgba(136,146,176,0.8)" }}>{d.name}</span>
                    </div>
                    <span style={{ fontSize: "0.8rem", fontWeight: 700, color: d.color }}>{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ textAlign: "center", color: "rgba(136,146,176,0.5)", fontSize: "0.8rem", marginTop: "2rem" }}>
              Sin datos de facturas
            </div>
          )}
        </div>
      </div>

      {/* ── Recent Facturas ── */}
      <div style={{
        background: "linear-gradient(135deg, rgba(20,27,45,0.95), rgba(11,15,26,0.98))",
        border: "1px solid rgba(0,245,255,0.12)", borderRadius: 14, overflow: "hidden",
      }}>
        <div style={{
          padding: "1rem 1.25rem", borderBottom: "1px solid rgba(0,245,255,0.08)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Activity style={{ width: 16, height: 16, color: CYAN, filter: `drop-shadow(0 0 4px ${CYAN})` }} />
            <h3 style={{ margin: 0, fontSize: "0.85rem", fontWeight: 700, color: "rgba(232,234,246,0.9)" }}>
              Últimas Facturas
            </h3>
          </div>
          <span style={{ fontSize: "0.7rem", color: "rgba(0,245,255,0.5)" }}>
            {safeFacturas.length} registros
          </span>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "rgba(0,245,255,0.04)" }}>
                {["Número","Cliente","Fecha","Estado","Total"].map(h => (
                  <th key={h} style={{
                    padding: "0.625rem 1rem", textAlign: "left",
                    fontSize: "0.65rem", fontWeight: 700,
                    color: "rgba(0,245,255,0.7)", textTransform: "uppercase", letterSpacing: "0.1em",
                    borderBottom: "1px solid rgba(0,245,255,0.08)",
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {safeFacturas.slice(0, 6).map((f, i) => {
                const stateColor = f.estado === "pagada" ? GREEN : f.estado === "emitida" ? CYAN : f.estado === "anulada" ? PINK : YELLOW;
                const stateLabel = f.estado === "pagada" ? "Pagada" : f.estado === "emitida" ? "Emitida" : f.estado === "anulada" ? "Anulada" : "Borrador";
                return (
                  <tr key={f.id} style={{
                    borderBottom: "1px solid rgba(0,245,255,0.04)",
                    transition: "background 0.15s",
                  }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(0,245,255,0.03)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                  >
                    <td style={{ padding: "0.75rem 1rem", fontFamily: "monospace", fontSize: "0.8rem", color: CYAN }}>
                      {f.numero}
                    </td>
                    <td style={{ padding: "0.75rem 1rem", fontSize: "0.82rem", color: "rgba(232,234,246,0.85)", fontWeight: 500 }}>
                      {f.clienteNombre}
                    </td>
                    <td style={{ padding: "0.75rem 1rem", fontSize: "0.78rem", color: "rgba(136,146,176,0.7)" }}>
                      {new Date(f.fecha + "T12:00:00").toLocaleDateString("es-CO")}
                    </td>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <span style={{
                        fontSize: "0.7rem", fontWeight: 600, padding: "2px 10px", borderRadius: 6,
                        background: `${stateColor}15`, color: stateColor,
                        border: `1px solid ${stateColor}30`,
                        boxShadow: `0 0 8px ${stateColor}20`,
                      }}>
                        {stateLabel}
                      </span>
                    </td>
                    <td style={{ padding: "0.75rem 1rem", fontSize: "0.82rem", fontWeight: 700, color: "rgba(232,234,246,0.9)", textAlign: "right" }}>
                      {formatCurrency(Number(f.total))}
                    </td>
                  </tr>
                );
              })}
              {safeFacturas.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: "2rem", textAlign: "center", color: "rgba(136,146,176,0.5)", fontSize: "0.85rem" }}>
                    No hay facturas registradas
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .dashboard-charts { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
