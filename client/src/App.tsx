import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Landing from "./pages/etc/Landing";
import Privacy from "./pages/etc/Privacy";
import Crm from "./pages/etc/Crm";

const sections = new Set([
  "overview",
  "inbox",
  "pipeline",
  "contacts",
  "knowledge",
  "followups",
  "settings",
]);
function CrmRoute({
  section = "overview",
  mode,
}: {
  section?: string;
  mode: "demo" | "live";
}) {
  if (!sections.has(section)) return <NotFound />;
  return <Crm section={section} mode={mode} />;
}
function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/privacidad" component={Privacy} />
      <Route path="/demo">
        <CrmRoute mode="demo" />
      </Route>
      <Route path="/demo/:section">
        {params => <CrmRoute section={params.section} mode="demo" />}
      </Route>
      <Route path="/app">
        <CrmRoute mode="live" />
      </Route>
      <Route path="/app/:section">
        {params => <CrmRoute section={params.section} mode="live" />}
      </Route>
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}
export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
