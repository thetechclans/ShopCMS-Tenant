import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useCallback } from "react";

type AnalyticsEventType = "page_view" | "product_view" | "category_view";

const PAGE_VIEW_DEDUPE_WINDOW_MS = 1500;
const lastPageViewAt = new Map<string, number>();

interface TrackOptions {
  path?: string;
  productId?: string;
  categoryId?: string;
  pageId?: string;
  metadata?: Record<string, unknown>;
}

export const trackAnalyticsEvent = async (
  tenantId: string | null,
  eventType: AnalyticsEventType,
  options: TrackOptions = {}
) => {
  if (!tenantId) return;

  // React 18 StrictMode runs effects twice in dev which can double-count page
  // views. This also protects against rapid re-renders that don't reflect a
  // real navigation event.
  if (eventType === "page_view" && options.path) {
    const key = `${tenantId}::${options.path}`;
    const now = Date.now();
    const last = lastPageViewAt.get(key);
    if (typeof last === "number" && now - last < PAGE_VIEW_DEDUPE_WINDOW_MS) {
      return;
    }
    lastPageViewAt.set(key, now);
  }

  try {
    await supabase.from("analytics_events").insert({
      tenant_id: tenantId,
      event_type: eventType,
      path: options.path,
      product_id: options.productId ?? null,
      category_id: options.categoryId ?? null,
      page_id: options.pageId ?? null,
      metadata: options.metadata ?? null,
    });
  } catch (error) {
    console.error("Failed to track analytics event", error);
  }
};

export const useAnalytics = () => {
  const { tenantId } = useTenant();

  const trackPageView = useCallback(
    (path: string, metadata?: Record<string, unknown>) => {
      return trackAnalyticsEvent(tenantId, "page_view", { path, metadata });
    },
    [tenantId]
  );

  const trackProductView = useCallback(
    (productId: string, metadata?: Record<string, unknown>) => {
      return trackAnalyticsEvent(tenantId, "product_view", { productId, metadata });
    },
    [tenantId]
  );

  const trackCategoryView = useCallback(
    (categoryId: string, metadata?: Record<string, unknown>) => {
      return trackAnalyticsEvent(tenantId, "category_view", { categoryId, metadata });
    },
    [tenantId]
  );

  return {
    trackPageView,
    trackProductView,
    trackCategoryView,
  };
};
