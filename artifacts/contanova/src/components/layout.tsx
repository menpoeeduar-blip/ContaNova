import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, Users, Building2, Package, FileText,
  ShoppingCart, Wallet, BookOpen, PieChart, ShieldAlert,
  LogOut, Menu, X, ChevronRight, Zap, Target,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";

// ─── Nav items ─────────────────────────────────────────────────────────────────
const NAV_SECTIONS = [
  {
    title: "Principal",
    items: [
      { href: "/",              label: "Dashboard",     icon: LayoutDashboard, color: "#00f5ff" },
    ],
  },
  {
    title: "Clientes & Ventas",
    items: [
      { href: "/clientes",     label: "Clientes",      icon: Users,         color: "#00ff88" },
      { href: "/crm",          label: "CRM",           icon: Target,        color: "#00ff88" },
      { href: "/deudores",     label: "Deudores",      icon: ShieldAlert,   color: "#ff006e" },
      { href: "/facturacion",  label: "Facturación",   icon: FileText,      color: "#00f5ff" },
      { href: "/cartera",      label: "Cartera",       icon: Wallet,        color: "#ffd600" },
    ],
  },
  {
    title: "Compras & Stock",
    items: [
      { href: "/proveedores",  label: "Proveedores",   icon: Building2,     color: "#bf00ff" },
      { href: "/productos",    label: "Productos",     icon: Package,       color: "#ff6b00" },
      { href: "/compras",      label: "Compras",       icon: ShoppingCart,  color: "#0084ff" },
    ],
  },
  {
    title: "Finanzas",
    items: [
      { href: "/contabilidad", label: "Contabilidad",  icon: BookOpen,      color: "#00f5ff" },
      { href: "/reportes",     label: "Reportes",      icon: PieChart,      color: "#bf00ff" },
    ],
  },
];

// ─── Sidebar Link ───────────────────────────────────────────────────────────────
function NavLink({ item, active, onClick }: {
  item: (typeof NAV_SECTIONS)[0]["items"][0];
  active: boolean;
  onClick?: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link href={item.href}>
      <a
        onClick={onClick}
        style={{
          display: "flex", alignItems: "center", gap: "0.7rem",
          padding: "0.6rem 0.875rem", margin: "2px 8px",
          borderRadius: "8px", fontSize: "0.82rem", fontWeight: 500,
          cursor: "pointer", transition: "all 0.2s ease",
          textDecoration: "none", position: "relative",
          border: active ? `1px solid ${item.color}40` : "1px solid transparent",
          background: active ? `${item.color}12` : "transparent",
          color: active ? item.color : "rgba(136,146,176,0.9)",
          boxShadow: active ? `inset 0 0 20px ${item.color}08, 0 0 12px ${item.color}20` : "none",
        }}
        onMouseEnter={(e) => {
          if (!active) {
            (e.currentTarget as HTMLElement).style.color = item.color;
            (e.currentTarget as HTMLElement).style.background = `${item.color}08`;
            (e.currentTarget as HTMLElement).style.borderColor = `${item.color}20`;
          }
        }}
        onMouseLeave={(e) => {
          if (!active) {
            (e.currentTarget as HTMLElement).style.color = "rgba(136,146,176,0.9)";
            (e.currentTarget as HTMLElement).style.background = "transparent";
            (e.currentTarget as HTMLElement).style.borderColor = "transparent";
          }
        }}
      >
        {/* Active indicator */}
        {active && (
          <span style={{
            position: "absolute", left: -8, top: "50%", transform: "translateY(-50%)",
            width: 3, height: "55%", borderRadius: "0 2px 2px 0",
            background: item.color, boxShadow: `0 0 10px ${item.color}`,
          }} />
        )}
        <Icon
          style={{
            width: 15, height: 15, flexShrink: 0,
            filter: active ? `drop-shadow(0 0 5px ${item.color})` : "none",
          }}
        />
        <span style={{ flex: 1 }}>{item.label}</span>
        {active && (
          <ChevronRight style={{ width: 12, height: 12, opacity: 0.5 }} />
        )}
      </a>
    </Link>
  );
}

// ─── Sidebar Content ────────────────────────────────────────────────────────────
function SidebarContent({ location, onNavClick }: { location: string; onNavClick?: () => void }) {
  const user = auth.currentUser;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* ── Logo ── */}
      <div style={{
        padding: "1.25rem 1rem 1rem",
        borderBottom: "1px solid rgba(0,245,255,0.08)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <div style={{
            width: 34, height: 34, borderRadius: 8,
            background: "linear-gradient(135deg, rgba(0,245,255,0.2), rgba(191,0,255,0.2))",
            border: "1px solid rgba(0,245,255,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 15px rgba(0,245,255,0.2)",
          }}>
            <Zap style={{ width: 18, height: 18, color: "#00f5ff", filter: "drop-shadow(0 0 6px #00f5ff)" }} />
          </div>
          <div>
            <div style={{
              fontFamily: "'Orbitron', monospace", fontWeight: 900, fontSize: "1rem",
              background: "linear-gradient(135deg, #00f5ff, #bf00ff)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              filter: "drop-shadow(0 0 8px rgba(0,245,255,0.5))",
              letterSpacing: "0.04em",
            }}>
              CONTANOVA
            </div>
            <div style={{
              fontSize: "0.55rem", fontWeight: 700, color: "#00f5ff",
              background: "rgba(0,245,255,0.1)", border: "1px solid rgba(0,245,255,0.25)",
              borderRadius: 3, padding: "1px 5px", letterSpacing: "0.1em",
              display: "inline-block", marginTop: 1,
            }}>
              ERP v2.0
            </div>
          </div>
        </div>
      </div>

      {/* ── Nav ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0.75rem 0" }}>
        {NAV_SECTIONS.map((section) => (
          <div key={section.title} style={{ marginBottom: "0.5rem" }}>
            <div style={{
              fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.12em",
              textTransform: "uppercase", color: "rgba(74,85,104,0.8)",
              padding: "0.75rem 1.2rem 0.35rem",
            }}>
              {section.title}
            </div>
            {section.items.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                active={location === item.href}
                onClick={onNavClick}
              />
            ))}
          </div>
        ))}
      </div>

      {/* ── User / Sign-out ── */}
      <div style={{
        borderTop: "1px solid rgba(0,245,255,0.08)",
        padding: "0.875rem 1rem",
        background: "rgba(0,0,0,0.3)",
      }}>
        {user && (
          <div style={{ marginBottom: "0.6rem" }}>
            <div style={{
              display: "flex", alignItems: "center", gap: "0.6rem",
              padding: "0.5rem 0.75rem", borderRadius: 8,
              background: "rgba(0,245,255,0.04)",
              border: "1px solid rgba(0,245,255,0.08)",
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%",
                background: "linear-gradient(135deg, #00f5ff33, #bf00ff33)",
                border: "1px solid rgba(0,245,255,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "0.65rem", fontWeight: 700, color: "#00f5ff",
              }}>
                {user.email?.substring(0, 2).toUpperCase()}
              </div>
              <div style={{ flex: 1, overflow: "hidden" }}>
                <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "rgba(232,234,246,0.9)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {user.displayName || "Administrador"}
                </div>
                <div style={{ fontSize: "0.65rem", color: "rgba(136,146,176,0.7)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {user.email}
                </div>
              </div>
            </div>
          </div>
        )}
        <button
          onClick={() => signOut(auth)}
          style={{
            display: "flex", alignItems: "center", gap: "0.6rem",
            width: "100%", padding: "0.5rem 0.75rem", borderRadius: 8,
            background: "transparent", border: "1px solid rgba(255,0,110,0.2)",
            color: "rgba(255,0,110,0.7)", fontSize: "0.8rem", fontWeight: 500,
            cursor: "pointer", transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = "rgba(255,0,110,0.08)";
            (e.currentTarget as HTMLElement).style.color = "#ff006e";
            (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,0,110,0.4)";
            (e.currentTarget as HTMLElement).style.boxShadow = "0 0 12px rgba(255,0,110,0.2)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "transparent";
            (e.currentTarget as HTMLElement).style.color = "rgba(255,0,110,0.7)";
            (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,0,110,0.2)";
            (e.currentTarget as HTMLElement).style.boxShadow = "none";
          }}
        >
          <LogOut style={{ width: 14, height: 14 }} />
          Cerrar Sesión
        </button>
      </div>
    </div>
  );
}

// ─── Main Layout ────────────────────────────────────────────────────────────────
export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#030409" }}>
      {/* ── Desktop Sidebar ── */}
      <aside style={{
        width: 220, flexShrink: 0,
        background: "linear-gradient(180deg, #07090f 0%, #0a0d19 100%)",
        borderRight: "1px solid rgba(0,245,255,0.1)",
        boxShadow: "4px 0 30px rgba(0,0,0,0.8), inset -1px 0 0 rgba(0,245,255,0.05)",
        position: "sticky", top: 0, height: "100vh", overflowY: "auto",
        display: "flex", flexDirection: "column",
      }}
        className="hidden md:flex"
      >
        {/* Scanning top line animation */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 2,
          background: "linear-gradient(90deg, transparent, #00f5ff, #bf00ff, transparent)",
          opacity: 0.6,
          animation: "neonPulse 3s ease-in-out infinite",
        }} />
        <SidebarContent location={location} />
      </aside>

      {/* ── Mobile Overlay ── */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 40,
            background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)",
          }}
        />
      )}

      {/* ── Mobile Drawer ── */}
      <aside style={{
        position: "fixed", top: 0, left: 0, bottom: 0,
        width: 240, zIndex: 50,
        background: "linear-gradient(180deg, #07090f 0%, #0a0d19 100%)",
        borderRight: "1px solid rgba(0,245,255,0.15)",
        boxShadow: mobileOpen ? "8px 0 40px rgba(0,0,0,0.9), 0 0 30px rgba(0,245,255,0.1)" : "none",
        transform: mobileOpen ? "translateX(0)" : "translateX(-100%)",
        transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)",
        overflowY: "auto",
        display: "flex", flexDirection: "column",
      }}
        className="md:hidden"
      >
        <SidebarContent location={location} onNavClick={() => setMobileOpen(false)} />
      </aside>

      {/* ── Main Content ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* Mobile top bar */}
        <header style={{
          height: 56, display: "flex", alignItems: "center",
          padding: "0 1rem", gap: "0.75rem",
          background: "rgba(7,9,15,0.95)", backdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(0,245,255,0.1)",
          boxShadow: "0 2px 20px rgba(0,0,0,0.8)",
          position: "sticky", top: 0, zIndex: 30,
        }}
          className="md:hidden"
        >
          <button
            onClick={() => setMobileOpen(true)}
            style={{
              width: 36, height: 36, borderRadius: 8,
              background: "rgba(0,245,255,0.08)", border: "1px solid rgba(0,245,255,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: "#00f5ff",
            }}
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>

          <div style={{
            fontFamily: "'Orbitron', monospace", fontWeight: 900, fontSize: "0.9rem",
            background: "linear-gradient(135deg, #00f5ff, #bf00ff)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            filter: "drop-shadow(0 0 6px rgba(0,245,255,0.4))",
            letterSpacing: "0.04em",
          }}>
            CONTANOVA
          </div>

          <div style={{ flex: 1 }} />

          {/* Current page indicator */}
          <div style={{
            fontSize: "0.7rem", color: "rgba(0,245,255,0.6)",
            background: "rgba(0,245,255,0.06)", border: "1px solid rgba(0,245,255,0.15)",
            borderRadius: 6, padding: "3px 8px",
          }}>
            {NAV_SECTIONS.flatMap(s => s.items).find(i => i.href === location)?.label ?? "Panel"}
          </div>
        </header>

        {/* Page content */}
        <main style={{
          flex: 1,
          background: "transparent",
          minHeight: "calc(100vh - 56px)",
        }}>
          {children}
        </main>
      </div>
    </div>
  );
}

export default Layout;
