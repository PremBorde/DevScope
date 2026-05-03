import { Suspense, lazy } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import Navbar from "@/components/layout/Navbar";

const Home      = lazy(() => import("@/pages/home"));
const Analyze   = lazy(() => import("@/pages/analyze"));
const Dashboard = lazy(() => import("@/pages/dashboard"));
const History   = lazy(() => import("@/pages/history"));
const Report    = lazy(() => import("@/pages/report"));
const Compare   = lazy(() => import("@/pages/compare"));
const NotFound  = lazy(() => import("@/pages/not-found"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
    },
  },
});

function PageLoader() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-16 space-y-6">
      <Skeleton className="h-12 w-56 border-2 border-black rounded-none" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-44 border-2 border-black rounded-none" />
        ))}
      </div>
      <Skeleton className="h-64 border-2 border-black rounded-none" />
    </div>
  );
}

function Router() {
  return (
    <div className="min-h-screen flex flex-col w-full bg-background selection:bg-primary selection:text-primary-foreground">
      <Navbar />
      <main className="flex-1 flex flex-col w-full">
        <Suspense fallback={<PageLoader />}>
          <Switch>
            <Route path="/"                          component={Home}      />
            <Route path="/analyze/:username"         component={Analyze}   />
            <Route path="/dashboard"                 component={Dashboard} />
            <Route path="/dashboard/history"         component={History}   />
            <Route path="/report/:username"          component={Report}    />
            <Route path="/compare"                   component={Compare}   />
            <Route path="/compare/:userA/:userB"     component={Compare}   />
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
