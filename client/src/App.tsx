import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import CustomerSignup from "@/pages/customer/signup";
import CustomerDashboard from "@/pages/customer/dashboard";
import AdminDashboard from "@/pages/admin/dashboard";
import AdminLogin from "@/pages/admin/login";
import PartnerVerify from "@/pages/partner/verify";
import PartnerLogin from "@/pages/partner/login";
import PartnerDashboard from "@/pages/partner/dashboard";
import { useQuery } from "@tanstack/react-query";

function ProtectedAdminRoute({ component: Component }: { component: React.ComponentType }) {
  const { data: admin, isLoading } = useQuery({
    queryKey: ["/api/admin/me"],
    retry: false
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!admin) {
    return <Redirect to="/admin/login" />;
  }

  return <Component />;
}

function ProtectedPartnerRoute({ component: Component }: { component: React.ComponentType }) {
  const { data: partner, isLoading } = useQuery({
    queryKey: ["/api/partner/me"],
    retry: false
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!partner) {
    return <Redirect to="/partner/login" />;
  }

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={CustomerSignup} />
      <Route path="/dashboard/:mobile" component={CustomerDashboard} />
      <Route path="/partner" component={PartnerVerify} />
      <Route path="/partner/login" component={PartnerLogin} />
      <Route path="/partner/dashboard">
        <ProtectedPartnerRoute component={PartnerDashboard} />
      </Route>
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin">
        <ProtectedAdminRoute component={AdminDashboard} />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;