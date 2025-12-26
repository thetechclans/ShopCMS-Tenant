import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useTenant } from "@/contexts/TenantContext";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

interface MenuItem {
  label: string;
  url: string;
}

interface NavBarConfig {
  logo_url: string | null;
  brand_text: string;
  logo_link_to_home: boolean;
  background_color: string;
  text_color: string;
  sticky_scroll: boolean;
}

export const PublicNavBar = () => {
  const { tenant, isLoading: tenantLoading } = useTenant();
  const tenantId = tenant?.id ?? null;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const {
    data: menuItems = [],
    isLoading: menuLoading,
  } = useQuery({
    queryKey: ["menu-items", tenantId],
    enabled: !!tenantId,
    queryFn: async (): Promise<MenuItem[]> => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("menu_items")
        .select("label, url")
        .eq("tenant_id", tenantId)
        .eq("is_published", true)
        .order("display_order", { ascending: true });

      if (error) {
        console.error("Failed to load menu items:", error);
        return [];
      }
      return (data ?? []) as MenuItem[];
    },
    staleTime: 0,
    refetchOnMount: "always",
    // Freshness is primarily handled by realtime invalidation; avoid extra UI
    // churn on tab focus.
    refetchOnWindowFocus: false,
  });

  const {
    data: config,
    isLoading: configLoading,
  } = useQuery({
    queryKey: ["navbar-config", tenantId],
    enabled: !!tenantId,
    queryFn: async (): Promise<NavBarConfig | null> => {
      if (!tenantId) return null;
      const { data, error } = await supabase
        .from("navbar_config")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("is_published", true)
        .maybeSingle();

      if (error) {
        console.error("Failed to load navbar config:", error);
        return null;
      }
      return (data ?? null) as NavBarConfig | null;
    },
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
  });

  // Rule: never show "fake" navbar content (like default "Shop") while the
  // tenant/config/menu is still loading — show a skeleton instead.
  const hasNavbarData = !!config || menuItems.length > 0;
  const isLoading = tenantLoading || menuLoading || configLoading || (!tenantId && !hasNavbarData);
  if (isLoading) {
    return (
      <nav className="border-b">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-md" />
              <Skeleton className="h-5 w-32" />
            </div>
            <div className="hidden md:flex items-center gap-6">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-12 ml-4" />
            </div>
            <Skeleton className="md:hidden h-9 w-9 rounded-md" />
          </div>
        </div>
      </nav>
    );
  }

  const brandText = config?.brand_text || tenant?.name || "Shop";

  const navStyle = config
    ? {
        backgroundColor: config.background_color,
        color: config.text_color,
      }
    : {};

  return (
    <nav
      className={`border-b ${config?.sticky_scroll ? "sticky top-0 z-50" : ""}`}
      style={navStyle}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to={config?.logo_link_to_home === false ? "#" : "/"} className="flex items-center">
            {config?.logo_url ? (
              <img
                src={config.logo_url}
                alt="Logo"
                className="h-10 w-auto object-contain"
              />
            ) : (
                <span className="text-xl font-bold">{brandText}</span>
            )}
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-6">
            {menuItems.map((item, index) => (
              <Link
                key={index}
                to={item.url}
                className="hover:opacity-80 transition-opacity"
              >
                {item.label}
              </Link>
            ))}
            {/* <Link
              to="/auth"
              className="text-sm opacity-70 hover:opacity-100 transition-opacity ml-4 border-l pl-4"
              style={{ borderColor: config?.text_color || 'currentColor' }}
            >
              Admin
            </Link> */}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t">
            <div className="flex flex-col gap-4">
              {menuItems.map((item, index) => (
                <Link
                  key={index}
                  to={item.url}
                  className="hover:opacity-80 transition-opacity"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
              {/* <Link
                to="/auth"
                className="text-sm opacity-70 hover:opacity-100 transition-opacity pt-4 border-t"
                style={{ borderColor: config?.text_color || 'currentColor' }}
                onClick={() => setMobileMenuOpen(false)}
              >
                Admin Login
              </Link> */}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};
