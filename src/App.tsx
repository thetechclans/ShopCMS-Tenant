import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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
import PublicHome from "./pages/PublicHome";
import PlatformHome from "./pages/PlatformHome";
import { PlatformAdminLayout } from "./pages/platform/PlatformAdminLayout";
import { PlatformAdminGuard } from "./pages/platform/PlatformAdminGuard";
import PlatformAdmin from "./pages/platform/PlatformAdmin";
import { TemplateEditor } from "./pages/platform/TemplateEditor";
import TenantsTab from "./pages/platform/TenantsTab";
import DomainsTab from "./pages/platform/DomainsTab";
import UsersTab from "./pages/platform/UsersTab";
import TenantLimitsTab from "./pages/platform/TenantLimitsTab";
import CategoryProducts from "./pages/CategoryProducts";
import StaticPage from "./pages/StaticPage";
import ProductDetail from "./pages/ProductDetail";
import { TenantProvider, useTenant } from "./contexts/TenantContext";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Tenant-aware home router
const TenantHomeRouter = () => {
  const { tenant, isLoading, error, isPlatformDomain } = useTenant();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4">{error}</p>
          <a href="/platform/admin" className="text-primary underline">Go to Platform Admin</a>
        </div>
      </div>
    );
  }

  // Platform domain (biz.amazetechclans.com) = show marketing/landing page
  // The /platform/admin route is handled by React Router
  if (isPlatformDomain) {
    console.log("Rendering Platform Home Page " , isPlatformDomain);
    return <PlatformHome />;
  }

  // No tenant = show empty shop template
  if (!tenant) {
    return <PublicHome />;
  }

  // Tenant found = show tenant's home page
  return <PublicHome />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <TenantProvider>
        <BrowserRouter>
          <Routes>
            {/* Platform Admin Routes with Sidebar */}
            <Route path="/platform/admin" element={<PlatformAdminGuard><PlatformAdminLayout /></PlatformAdminGuard>}>
              <Route index element={<TenantsTab />} />
              <Route path="tenants" element={<TenantsTab />} />
              <Route path="domains" element={<DomainsTab />} />
              <Route path="users" element={<UsersTab />} />
              <Route path="limits" element={<TenantLimitsTab />} />
              <Route path="templates/basic" element={<TemplateEditor planType="basic" />} />
              <Route path="templates/silver" element={<TemplateEditor planType="silver" />} />
              <Route path="templates/gold" element={<TemplateEditor planType="gold" />} />
            </Route>

            {/* Public Routes - Tenant-aware */}
            <Route path="/" element={<TenantHomeRouter />} />
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
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TenantProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;