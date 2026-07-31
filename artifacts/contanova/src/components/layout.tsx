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
  LogOut
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

export function Sidebar() {
  const [location] = useLocation();

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Error al cerrar sesión:", err);
    }
  };

  return (
    <div className="w-64 border-r border-border bg-card h-screen flex flex-col">
      <div className="h-16 flex items-center px-6 border-b border-border">
        <img src={logoUrl} alt="ContaNova Logo" className="h-8" />
        <span className="ml-3 font-bold text-lg text-foreground tracking-tight">ContaNova</span>
      </div>
      <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href}>
              <span className={cn(
                "flex items-center px-3 py-2.5 rounded-md text-sm font-medium transition-colors cursor-pointer",
                isActive 
                  ? "bg-primary/10 text-primary" 
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}>
                <item.icon className={cn("mr-3 h-5 w-5", isActive ? "text-primary" : "text-muted-foreground")} />
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
      {/* User info + sign out */}
      <div className="border-t border-border p-4">
        <div className="flex items-center gap-3 mb-3 px-1">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-bold">
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
          className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors cursor-pointer"
        >
          <LogOut className="h-4 w-4" />
          Cerrar Sesión
        </button>
      </div>
    </div>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      <Sidebar />
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
