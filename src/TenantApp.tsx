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
import ResetPassword from "./pages/ResetPassword";
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
import { PlatformAdminGuard } from "./pages/platform/PlatformAdminGuard";
import SubscriptionManagement from "./pages/platform/SubscriptionManagement";
import TenantRequests from "./pages/platform/TenantRequests";
import DomainsTab from "./pages/platform/DomainsTab";
import { PlatformAdminLayout } from "./pages/platform/PlatformAdminLayout";
import PlatformAnalytics from "./pages/platform/PlatformAnalytics";
import { TemplateEditor } from "./pages/platform/TemplateEditor";
import TenantLimitsTab from "./pages/platform/TenantLimitsTab";
import TenantsTab from "./pages/platform/TenantsTab";
import TenantSubscriptionsTab from "./pages/platform/TenantSubscriptionsTab";
import UsersTab from "./pages/platform/UsersTab";
import PlatformHome from "./pages/platform/PlatformHome";
import PlatformAuth from "./pages/platform/PlatformAuth";
import TenantAuth from "./pages/TenantAuth";

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

            {/* Platform admin auth route */}
            <Route path="/platform/auth" element={<PlatformAuth />} />
            <Route path="/platform" element={<PlatformHome />} />

            <Route
              path="/platform/admin"
              element={
                <PlatformAdminGuard>
                  <PlatformAdminLayout />
                </PlatformAdminGuard>
              }
            >
              <Route index element={<TenantsTab />} />
              <Route path="tenants" element={<TenantsTab />} />
              <Route path="domains" element={<DomainsTab />} />
              <Route path="users" element={<UsersTab />} />
              <Route path="limits" element={<TenantLimitsTab />} />
              <Route path="analytics" element={<PlatformAnalytics />} />
              <Route path="tenant-subscriptions" element={<TenantSubscriptionsTab />} />
              <Route path="templates/basic" element={<TemplateEditor planType="basic" />} />
              <Route path="templates/silver" element={<TemplateEditor planType="silver" />} />
              <Route path="templates/gold" element={<TemplateEditor planType="gold" />} />
              <Route path="subscriptions" element={<SubscriptionManagement />} />
              <Route path="tenant-requests" element={<TenantRequests />} />
            </Route>

            {/* Public routes */}
            <Route path="/" element={<PublicHome />} />
            <Route path="/category/:slug" element={<CategoryProducts />} />
            <Route path="/product/:slug" element={<ProductDetail />} />
            <Route path="/page/:slug" element={<StaticPage />} />
            <Route path="/auth" element={<TenantAuth />} />
            <Route path="/auth/reset" element={<ResetPassword />} />

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
