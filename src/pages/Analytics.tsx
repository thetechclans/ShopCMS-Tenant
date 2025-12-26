import { useMemo, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { usePlanFeatures } from "@/hooks/usePlanFeatures";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, BarChart2, Eye, TrendingUp } from "lucide-react";

type DateRange = "7d" | "30d" | "90d";
type DailyMetricRow = {
  tenant_id?: string | null;
  day?: string | null;
  page_views?: number | null;
  product_views?: number | null;
  category_views?: number | null;
};

type TopProduct = {
  productId: string;
  views: number;
  name: string;
};

type AnalyticsEventProductRow = {
  product_id: string | null;
};

const rangeToInterval: Record<DateRange, string> = {
  "7d": "7 days",
  "30d": "30 days",
  "90d": "90 days",
};

const Analytics = () => {
  const { tenantId } = useTenant();
  const navigate = useNavigate();
  const { features, isLoading: planLoading } = usePlanFeatures();
  const [range, setRange] = useState<DateRange>("7d");

  const shouldBlock = !features.hasAnalytics && !planLoading;

  // Enforce plan gating via effect to avoid changing hook order
  useEffect(() => {
    if (shouldBlock) {
      navigate("/admin");
    }
  }, [shouldBlock, navigate]);

  const analyticsEnabled = !!tenantId && features.hasAnalytics;

  const { data: dailyMetrics = [] } = useQuery<DailyMetricRow[]>({
    queryKey: ["analytics-daily", tenantId, range],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from("tenant_daily_metrics")
        .select("tenant_id, day, page_views, product_views, category_views")
        .eq("tenant_id", tenantId)
        .gte("day", new Date(Date.now() - parseRange(range)).toISOString())
        .order("day", { ascending: true })
        .overrideTypes<DailyMetricRow[], { merge: false }>();

      if (error) {
        console.error("Failed to load daily analytics:", error);
        return [];
      }

      return (data ?? []) as DailyMetricRow[];
    },
    enabled: analyticsEnabled,
  });

  const { data: topProducts = [] } = useQuery<TopProduct[]>({
    queryKey: ["analytics-top-products", tenantId, range],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from("analytics_events")
        .select("product_id")
        .eq("tenant_id", tenantId)
        .eq("event_type", "product_view")
        .gte("occurred_at", new Date(Date.now() - parseRange(range)).toISOString())
        .overrideTypes<AnalyticsEventProductRow[], { merge: false }>();

      if (error || !data) return [];

      const counts: Record<string, number> = {};
      data.forEach((row) => {
        if (!row.product_id) return;
        counts[row.product_id] = (counts[row.product_id] || 0) + 1;
      });

      const sorted = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([productId, views]) => ({ productId, views }));

      if (sorted.length === 0) return [];

      const { data: products } = await supabase
        .from("products")
        .select("id, name")
        .in(
          "id",
          sorted.map((s) => s.productId)
        );

      return sorted.map((s) => ({
        productId: s.productId,
        views: s.views,
        name: products?.find((p) => p.id === s.productId)?.name ?? "Unknown product",
      }));
    },
    enabled: analyticsEnabled,
  });

  const summary = useMemo(() => {
    const totalPageViews = dailyMetrics.reduce((sum, row) => sum + (row.page_views ?? 0), 0);
    const totalProductViews = dailyMetrics.reduce((sum, row) => sum + (row.product_views ?? 0), 0);
    const totalCategoryViews = dailyMetrics.reduce((sum, row) => sum + (row.category_views ?? 0), 0);

    return {
      totalPageViews,
      totalProductViews,
      totalCategoryViews,
    };
  }, [dailyMetrics]);

  if (shouldBlock) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">
            Understand how visitors interact with your shop.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Select
            value={range}
            onValueChange={(value) => setRange(value as DateRange)}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              {features.analyticsLevel === "advanced" && (
                <SelectItem value="90d">Last 90 days</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Page views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary.totalPageViews.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Across your site in the last {rangeToInterval[range]}.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Product views
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary.totalProductViews.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Product detail page visits in the selected period.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Category views
            </CardTitle>
            <BarChart2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary.totalCategoryViews.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Category page visits in the selected period.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top products by views</CardTitle>
        </CardHeader>
        <CardContent>
          {topProducts.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertTriangle className="h-4 w-4" />
              <span>No product view data yet for this period.</span>
            </div>
          ) : (
            <div className="space-y-2">
              {topProducts.map((item) => (
                <div
                  key={item.productId}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="font-medium">{item.name}</span>
                  <span className="text-muted-foreground">
                    {item.views.toLocaleString()} views
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const parseRange = (range: DateRange): number => {
  switch (range) {
    case "7d":
      return 7 * 24 * 60 * 60 * 1000;
    case "30d":
      return 30 * 24 * 60 * 60 * 1000;
    case "90d":
      return 90 * 24 * 60 * 60 * 1000;
    default:
      return 7 * 24 * 60 * 60 * 1000;
  }
};

export default Analytics;
