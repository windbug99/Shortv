import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { ThemeProvider } from "@/contexts/ThemeContext";
import Home from "@/pages/Home";
import Channel from "@/pages/Channel";
import Account from "@/pages/Account";
import Feed from "@/pages/Feed";
import UserFeed from "@/pages/UserFeed";
import Landing from "@/pages/Landing";
import Layout from "@/components/Layout";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      <Route path="/">
        <Layout>
          <Home />
        </Layout>
      </Route>
      {isLoading ? (
        <Route path="/feed" component={Landing} />
      ) : !isAuthenticated ? (
        <Route path="/feed">
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4">로그인이 필요합니다</h2>
              <p className="text-gray-600 mb-4">피드를 보려면 로그인해주세요.</p>
              <button 
                onClick={() => window.location.href = "/api/login"}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                로그인
              </button>
            </div>
          </div>
        </Route>
      ) : (
        <Route path="/feed">
          <Layout>
            <UserFeed />
          </Layout>
        </Route>
      )}
      {isLoading ? (
        <Route path="/channel" component={Landing} />
      ) : !isAuthenticated ? (
        <Route path="/channel">
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4">로그인이 필요합니다</h2>
              <p className="text-gray-600 mb-4">채널을 관리하려면 로그인해주세요.</p>
              <button 
                onClick={() => window.location.href = "/api/login"}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                로그인
              </button>
            </div>
          </div>
        </Route>
      ) : (
        <Route path="/channel">
          <Layout>
            <Channel />
          </Layout>
        </Route>
      )}
      {isLoading ? (
        <Route path="/account" component={Landing} />
      ) : !isAuthenticated ? (
        <Route path="/account">
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4">로그인이 필요합니다</h2>
              <p className="text-gray-600 mb-4">계정 정보를 보려면 로그인해주세요.</p>
              <button 
                onClick={() => window.location.href = "/api/login"}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                로그인
              </button>
            </div>
          </div>
        </Route>
      ) : (
        <Route path="/account">
          <Layout>
            <Account />
          </Layout>
        </Route>
      )}
      <Route path="/feed/:id">
        <Layout>
          <Feed />
        </Layout>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
