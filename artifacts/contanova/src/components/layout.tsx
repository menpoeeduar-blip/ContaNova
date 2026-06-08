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
  PieChart 
} from "lucide-react";
import { cn } from "@/lib/utils";
import logoUrl from "@assets/image_1780897460881.png";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/clientes", label: "Clientes", icon: Users },
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
