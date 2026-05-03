import { Suspense, lazy } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Navbar from "@/components/layout/Navbar";
import WalkingLoader from "@/components/WalkingLoader";

const Home      = lazy(() => import("@/pages/home"));
const Analyze   = lazy(() => import("@/pages/analyze"));
const Dashboard = lazy(() => import("@/pages/dashboard"));
const History   = lazy(() => import("@/pages/history"));
const Report     = lazy(() => import("@/pages/report"));
const ReportView = lazy(() => import("@/pages/report-view"));
const Compare    = lazy(() => import("@/pages/compare"));
const NotFound   = lazy(() => import("@/pages/not-found"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,      // Data stays fresh for 5 min — avoids repeat API calls
      gcTime: 1000 * 60 * 10,        // Keep unused cache in memory for 10 min
      refetchOnWindowFocus: false,   // Don't re-fetch on tab switch
      refetchOnReconnect: false,     // Don't re-fetch on network reconnect
      retry: 1,                      // One retry instead of the default 3
    },
  },
});


function Router() {
  return (
    <div className="min-h-screen flex flex-col w-full bg-background selection:bg-primary selection:text-primary-foreground">
      <Navbar />
      <main className="flex-1 flex flex-col w-full">
        <Suspense fallback={<WalkingLoader />}>
          <Switch>
            <Route path="/"                          component={Home}      />
            <Route path="/analyze/:username"         component={Analyze}   />
            <Route path="/dashboard"                 component={Dashboard} />
            <Route path="/dashboard/history"         component={History}   />
            <Route path="/report/view/:id"           component={ReportView} />
            <Route path="/report/:username"          component={Report}    />
            <Route path="/compare"                   component={Compare}   />
            <Route                                   component={NotFound}  />
          </Switch>
        </Suspense>
      </main>
    </div>
  );
}

function App() {
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
