import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { LanguageSwitcher } from "@/components/language-switcher";
import NotFound from "@/pages/not-found";
import CustomerSignup from "@/pages/customer/signup";
import CustomerDashboard from "@/pages/customer/dashboard";
import AdminDashboard from "@/pages/admin/dashboard";
import AdminLogin from "@/pages/admin/login";
import { useQuery } from "@tanstack/react-query";
import "./i18n/config"; // Import i18n configuration

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

function Router() {
  return (
    <Switch>
      <Route path="/" component={CustomerSignup} />
      <Route path="/dashboard/:mobile" component={CustomerDashboard} />
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
      <div className="relative">
        <LanguageSwitcher />
        <Router />
        <Toaster />
      </div>
    </QueryClientProvider>
  );
}

export default App;