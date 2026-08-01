import { useState, useEffect } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";
import { setBaseUrl } from "@workspace/api-client-react";

// Configure API base URL for production
const API_URL = import.meta.env.VITE_API_URL as string | undefined;
if (API_URL) setBaseUrl(API_URL);
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import Dashboard from "@/pages/dashboard";
import Clientes from "@/pages/clientes";
import Proveedores from "@/pages/proveedores";
import Productos from "@/pages/productos";
import Cartera from "@/pages/cartera";
import CRM from "@/pages/crm";
import Facturacion from "@/pages/facturacion";
import Compras from "@/pages/compras";
import Contabilidad from "@/pages/contabilidad";
import Deudores from "@/pages/deudores";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, type User } from "firebase/auth";
import { Component, type ReactNode } from "react";

// ─── Error Boundary ────────────────────────────────────────────────────────────
class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: "" };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: "100vh",
          background: "linear-gradient(135deg, #0f0c29, #302b63)",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexDirection: "column", gap: "12px", padding: "20px",
          fontFamily: "Inter, sans-serif",
        }}>
          <div style={{ fontSize: "48px" }}>⚠️</div>
          <h2 style={{ color: "#fff", fontSize: "20px", margin: 0 }}>Error al cargar la página</h2>
          <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "13px", margin: 0, textAlign: "center", maxWidth: "300px" }}>
            {this.state.error}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: "" })}
            style={{
              marginTop: "8px", padding: "10px 24px", borderRadius: "8px",
              background: "#6366f1", color: "#fff", border: "none",
              cursor: "pointer", fontSize: "14px", fontWeight: "600",
            }}
          >
            Reintentar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Query Client ───────────────────────────────────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

// ─── Router ─────────────────────────────────────────────────────────────────────
function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/clientes" component={Clientes} />
        <Route path="/deudores" component={Deudores} />
        <Route path="/proveedores" component={Proveedores} />
        <Route path="/productos" component={Productos} />
        <Route path="/cartera" component={Cartera} />
        <Route path="/crm" component={CRM} />
        <Route path="/facturacion" component={Facturacion} />
        <Route path="/compras" component={Compras} />
        <Route path="/contabilidad" component={Contabilidad} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

// ─── App ────────────────────────────────────────────────────────────────────────
function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.documentElement.classList.add("dark");
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexDirection: "column", gap: "16px",
      }}>
        <div style={{
          width: "48px", height: "48px", borderRadius: "50%",
          border: "3px solid rgba(99,102,241,0.3)",
          borderTopColor: "#6366f1",
          animation: "spin 0.8s linear infinite",
        }} />
        <p style={{ color: "rgba(255,255,255,0.5)", fontFamily: "Inter, sans-serif", fontSize: "14px" }}>
          Cargando ContaNova...
        </p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!user) {
    return <ErrorBoundary><Login onLogin={() => {}} /></ErrorBoundary>;
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
