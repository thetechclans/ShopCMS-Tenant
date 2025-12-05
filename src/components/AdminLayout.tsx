import { ReactNode, useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { useTenant } from "@/contexts/TenantContext";
import { tenantLogger } from "@/lib/tenantLogger";
import { 
  LayoutDashboard, 
  Package, 
  FolderOpen, 
  FileText, 
  Menu as MenuIcon,
  Settings,
  LogOut 
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { PlanBadge } from "@/components/PlanBadge";
import { usePlanFeatures } from "@/hooks/usePlanFeatures";

interface AdminLayoutProps {
  children: ReactNode;
}

const menuItems = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
  { title: "Products", url: "/admin/products", icon: Package },
  { title: "Categories", url: "/admin/categories", icon: FolderOpen },
  { title: "Pages", url: "/admin/pages", icon: FileText },
  { title: "Settings", url: "/admin/settings", icon: Settings },
  { title: "Users", url: "/admin/users", icon: Settings },
];

const AppSidebar = () => {
  const { state } = useSidebar();
  const { features } = usePlanFeatures();
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;
  const isCollapsed = state === "collapsed";

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Error signing out");
    } else {
      toast.success("Signed out successfully");
      navigate("/");
    }
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="p-4 space-y-2">
          <h2 className={`font-bold text-sidebar-foreground ${isCollapsed ? "text-xs text-center" : "text-lg"}`}>
            {isCollapsed ? "CMS" : "Shop CMS"}
          </h2>
          {!isCollapsed && <PlanBadge planType={features.planType} size="sm" />}
        </div>
        
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className="hover:bg-sidebar-accent"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="mt-auto p-4">
          <Button
            variant="outline"
            size={isCollapsed ? "icon" : "default"}
            onClick={handleLogout}
            className="w-full"
          >
            <LogOut className="h-4 w-4" />
            {!isCollapsed && <span className="ml-2">Logout</span>}
          </Button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
};

const AdminLayout = ({ children }: AdminLayoutProps) => {
  const navigate = useNavigate();
  const { tenant, tenantId, isLoading: tenantLoading } = useTenant();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [tenantVerified, setTenantVerified] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (!session) {
        navigate("/");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        navigate("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Verify user belongs to current tenant
  useEffect(() => {
    const verifyTenantMembership = async () => {
      if (!session?.user || tenantLoading) return;
      
      if (!tenant) {
        tenantLogger.error(null, "No tenant in admin context", undefined, { userId: session.user.id });
        navigate("/");
        return;
      }

      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('tenant_id, status')
          .eq('id', session.user.id)
          .single();

        if (error || !profile) {
          tenantLogger.error(tenantId, "Failed to fetch user profile", error);
          toast.error("Failed to verify account");
          navigate("/");
          return;
        }

        // Check if user account is active
        if (profile.status !== 'active') {
          tenantLogger.warn(tenantId, "User account not active", { 
            status: profile.status,
            userId: session.user.id 
          });
          toast.error(
            profile.status === 'pending' 
              ? "Your account is pending approval. Please contact the administrator."
              : "Your account has been suspended. Please contact the administrator."
          );
          await supabase.auth.signOut();
          navigate("/");
          return;
        }

        if (profile.tenant_id !== tenant.id) {
          tenantLogger.warn(tenantId, "Tenant mismatch", { 
            userTenantId: profile.tenant_id, 
            contextTenantId: tenant.id,
            userId: session.user.id 
          });
          navigate("/");
          return;
        }

        setTenantVerified(true);
        setLoading(false);
      } catch (err) {
        tenantLogger.error(tenantId, "Tenant verification failed", err as Error);
        navigate("/");
      }
    };

    verifyTenantMembership();
  }, [session, tenant, tenantId, tenantLoading, navigate]);

  if (loading || tenantLoading || !tenantVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (!session || !tenant) {
    return null;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-14 border-b bg-background flex items-center px-4">
            <SidebarTrigger />
          </header>
          <main className="flex-1 p-6 bg-muted/30">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AdminLayout;
