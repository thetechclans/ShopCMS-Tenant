import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import AdminLayout from "./components/AdminLayout";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Categories from "./pages/Categories";
import Pages from "./pages/Pages";
import Settings from "./pages/Settings";
import Users from "./pages/Users";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import HomePageBuilder from "./pages/HomePageBuilder";
import { TenantProvider } from "./contexts/TenantContext";
import Analytics from "./pages/Analytics";
import CategoryProducts from "./pages/CategoryProducts";
import StaticPage from "./pages/StaticPage";
import ProductDetail from "./pages/ProductDetail";
import PublicHome from "./pages/PublicHome";
import { useEffect } from "react";
import { useAnalytics } from "./lib/analytics";
import FaviconManager from "./components/FaviconManager";
import DynamicHead from "./components/DynamicHead";
import TenantRealtimeInvalidator from "./components/TenantRealtimeInvalidator";

const RouteAnalyticsTracker = () => {
  const location = useLocation();
  const { trackPageView } = useAnalytics();

  useEffect(() => {
    trackPageView(location.pathname + location.search);
  }, [location.pathname, location.search, trackPageView]);

  return null;
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const TenantApp = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <TenantProvider>
        <BrowserRouter>
          <FaviconManager />
          <DynamicHead />
          <TenantRealtimeInvalidator />
          <RouteAnalyticsTracker />
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<PublicHome />} />
            <Route path="/category/:slug" element={<CategoryProducts />} />
            <Route path="/product/:slug" element={<ProductDetail />} />
            <Route path="/page/:slug" element={<StaticPage />} />
            <Route path="/auth" element={<Auth />} />

            {/* Tenant Admin Routes */}
            <Route path="/admin" element={<AdminLayout><Dashboard /></AdminLayout>} />
            <Route path="/admin/products" element={<AdminLayout><Products /></AdminLayout>} />
            <Route path="/admin/categories" element={<AdminLayout><Categories /></AdminLayout>} />
            <Route path="/admin/pages" element={<AdminLayout><Pages /></AdminLayout>} />
            <Route path="/admin/pages/home-builder" element={<AdminLayout><HomePageBuilder /></AdminLayout>} />
            <Route path="/admin/settings" element={<AdminLayout><Settings /></AdminLayout>} />
            <Route path="/admin/users" element={<AdminLayout><Users /></AdminLayout>} />
            <Route path="/admin/analytics" element={<AdminLayout><Analytics /></AdminLayout>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TenantProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default TenantApp;
