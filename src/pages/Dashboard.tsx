import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, FolderOpen, FileText, TrendingUp } from "lucide-react";
import { useTenant } from "@/contexts/TenantContext";

interface Stats {
  products: number;
  categories: number;
  pages: number;
  published: number;
}

const Dashboard = () => {
  const { tenantId } = useTenant();
  const [stats, setStats] = useState<Stats>({
    products: 0,
    categories: 0,
    pages: 0,
    published: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user || !tenantId) {
        setLoading(false);
        return;
      }

      const [products, categories, pages] = await Promise.all([
        supabase.from("products").select("*", { count: "exact", head: true }).eq("tenant_id", tenantId),
        supabase.from("categories").select("*", { count: "exact", head: true }).eq("tenant_id", tenantId),
        supabase.from("pages").select("*", { count: "exact", head: true }).eq("tenant_id", tenantId),
      ]);

      const publishedProducts = await supabase
        .from("products")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("is_published", true);

      setStats({
        products: products.count || 0,
        categories: categories.count || 0,
        pages: pages.count || 0,
        published: publishedProducts.count || 0,
      });
      setLoading(false);
    };

    fetchStats();
  }, [tenantId]);

  const statCards = [
    {
      title: "Total Products",
      value: stats.products,
      icon: Package,
      description: "Products in your catalog",
    },
    {
      title: "Categories",
      value: stats.categories,
      icon: FolderOpen,
      description: "Product categories",
    },
    {
      title: "Static Pages",
      value: stats.pages,
      icon: FileText,
      description: "Custom pages created",
    },
    {
      title: "Published",
      value: stats.published,
      icon: TrendingUp,
      description: "Live products",
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your shop content</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Get started by creating your first product, organizing categories, or setting up static pages for your shop.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
