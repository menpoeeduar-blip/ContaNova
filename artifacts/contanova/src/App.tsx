import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
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

const queryClient = new QueryClient();

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

function App() {
  // Toggle dark mode initially
  if (typeof document !== 'undefined') {
    document.documentElement.classList.add('dark');
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
