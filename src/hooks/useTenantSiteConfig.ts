import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";

interface TenantSiteConfig {
  site_title: string | null;
  favicon_url: string | null;
  shop_name: string | null;
}

export const useTenantSiteConfig = () => {
  const { tenantId } = useTenant();

  const { data, isLoading } = useQuery({
    queryKey: ["tenant-site-config", tenantId],
    enabled: !!tenantId,
    queryFn: async (): Promise<TenantSiteConfig | null> => {
      if (!tenantId) return null;

      const { data, error } = await supabase
        .from("public_shop_info")
        .select("site_title, favicon_url, shop_name")
        .eq("tenant_id", tenantId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching tenant site config:", error);
        return null;
      }

      return data;
    },
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  return {
    siteTitle: data?.site_title ?? null,
    faviconUrl: data?.favicon_url ?? null,
    shopName: data?.shop_name ?? null,
    isLoading,
  };
};
