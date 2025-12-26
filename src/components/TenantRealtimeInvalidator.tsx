import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";

/**
 * Keeps TanStack Query caches in sync with CMS changes using Supabase Realtime.
 *
 * Key rule: when CMS content changes, invalidate affected queries so the UI
 * refetches fresh data. Pages should show loading/skeletons while fetching
 * rather than showing stale content.
 */
const TenantRealtimeInvalidator = () => {
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();

  useEffect(() => {
    if (!tenantId) return;

    const channel = supabase.channel(`tenant-cms-${tenantId}`);

    const invalidateHome = () => {
      queryClient.invalidateQueries({ queryKey: ["home-page-sections", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["carousel-slides", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["published-categories", tenantId] });
    };

    // Home page sections are stored as `pages.slug = 'home'`.
    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "pages", filter: `tenant_id=eq.${tenantId}` },
      (payload) => {
        const row = (payload.new ?? payload.old) as { slug?: string } | null;
        if (row?.slug === "home") {
          invalidateHome();
        } else {
          // Other pages may be used by static page routes.
          queryClient.invalidateQueries({ queryKey: ["pages", tenantId] });
        }
      }
    );

    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "carousel_slides", filter: `tenant_id=eq.${tenantId}` },
      () => {
        queryClient.invalidateQueries({ queryKey: ["carousel-slides", tenantId] });
      }
    );

    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "menu_items", filter: `tenant_id=eq.${tenantId}` },
      () => {
        // Clear cached data first so the UI doesn't render stale menu items
        // while the refetch is happening.
        queryClient.removeQueries({ queryKey: ["menu-items", tenantId] });
        queryClient.invalidateQueries({ queryKey: ["menu-items", tenantId] });
      }
    );

    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "navbar_config", filter: `tenant_id=eq.${tenantId}` },
      () => {
        queryClient.removeQueries({ queryKey: ["navbar-config", tenantId] });
        queryClient.invalidateQueries({ queryKey: ["navbar-config", tenantId] });
      }
    );

    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "categories", filter: `tenant_id=eq.${tenantId}` },
      () => {
        queryClient.invalidateQueries({ queryKey: ["published-categories", tenantId] });
      }
    );

    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "tenant_limits", filter: `tenant_id=eq.${tenantId}` },
      () => {
        queryClient.invalidateQueries({ queryKey: ["tenant-limits", tenantId] });
        queryClient.invalidateQueries({ queryKey: ["tenant-plan-features", tenantId] });
      }
    );

    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "profiles", filter: `tenant_id=eq.${tenantId}` },
      () => {
        queryClient.invalidateQueries({ queryKey: ["tenant-site-config", tenantId] });
        queryClient.invalidateQueries({ queryKey: ["profile-theme", tenantId] });
        queryClient.invalidateQueries({ queryKey: ["admin-users", tenantId] });
      }
    );

    channel.subscribe((status) => {
      if (status === "CHANNEL_ERROR") {
        // Realtime is optional. The app still works via refetch-on-mount.
        console.warn("Realtime channel error for tenant:", tenantId);
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, tenantId]);

  return null;
};

export default TenantRealtimeInvalidator;
