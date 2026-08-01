import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Users,
  Building2,
  Package,
  FileText,
  ShoppingCart,
  Wallet,
  BookOpen,
  PieChart,
  ShieldAlert,
  LogOut,
  Menu,
  X,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import logoUrl from "@assets/image_1780897460881.png";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/deudores", label: "Deudores & Cobro", icon: ShieldAlert },
  { href: "/proveedores", label: "Proveedores", icon: Building2 },
  { href: "/productos", label: "Productos", icon: Package },
  { href: "/facturacion", label: "Facturación", icon: FileText },
  { href: "/compras", label: "Compras", icon: ShoppingCart },
  { href: "/cartera", label: "Cartera", icon: Wallet },
  { href: "/contabilidad", label: "Contabilidad", icon: BookOpen },
  { href: "/crm", label: "CRM", icon: PieChart },
];

interface SidebarContentProps {
  location: string;
  onNavClick?: () => void;
}

function SidebarContent({ location, onNavClick }: SidebarContentProps) {
  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Error al cerrar sesión:", err);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="h-16 flex items-center px-5 border-b border-border shrink-0">
        <img src={logoUrl} alt="ContaNova Logo" className="h-8 w-auto" />
        <span className="ml-3 font-bold text-lg text-foreground tracking-tight">ContaNova</span>
      </div>

      {/* Nav Items */}
      <div className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive =
            location === item.href ||
            (item.href !== "/" && location.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href} onClick={onNavClick}>
              <span
                className={cn(
                  "flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer group",
                  isActive
                    ? "bg-primary/15 text-primary shadow-sm"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <item.icon
                  className={cn(
                    "mr-3 h-4 w-4 shrink-0",
                    isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                  )}
                />
                <span className="truncate">{item.label}</span>
                {isActive && (
                  <ChevronRight className="ml-auto h-3 w-3 text-primary" />
                )}
              </span>
            </Link>
          );
        })}
      </div>

      {/* User info + sign out */}
      <div className="border-t border-border p-4 shrink-0">
        <div className="flex items-center gap-3 mb-3 px-1">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-bold shrink-0">
            {auth.currentUser?.email?.[0]?.toUpperCase() ?? "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground truncate">
              {auth.currentUser?.email ?? "Usuario"}
            </p>
            <p className="text-xs text-muted-foreground">Administrador</p>
          </div>
        </div>
        <button
          id="signout-btn"
          onClick={handleSignOut}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors cursor-pointer"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Cerrar Sesión
        </button>
      </div>
    </div>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      {/* ── Desktop sidebar (always visible ≥ lg) ── */}
      <aside className="hidden lg:flex lg:w-64 lg:shrink-0 border-r border-border bg-card flex-col">
        <SidebarContent location={location} />
      </aside>

      {/* ── Mobile sidebar overlay ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={closeSidebar}
          aria-label="Cerrar menú"
        />
      )}

      {/* ── Mobile sidebar drawer ── */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-full w-72 bg-card border-r border-border flex flex-col lg:hidden",
          "transition-transform duration-300 ease-in-out",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Close button inside drawer */}
        <button
          onClick={closeSidebar}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          aria-label="Cerrar menú"
        >
          <X className="h-5 w-5" />
        </button>
        <SidebarContent location={location} onNavClick={closeSidebar} />
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* ── Mobile top bar ── */}
        <header className="lg:hidden h-14 flex items-center px-4 border-b border-border bg-card shrink-0 gap-3">
          <button
            id="mobile-menu-btn"
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            aria-label="Abrir menú"
          >
            <Menu className="h-5 w-5" />
          </button>
          <img src={logoUrl} alt="ContaNova Logo" className="h-7 w-auto" />
          <span className="font-bold text-base text-foreground tracking-tight">ContaNova</span>
        </header>

        {/* ── Page content ── */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

export { SidebarContent };
