import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, FolderOpen, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { CategoryDialog } from "@/components/CategoryDialog";
import { useTenant } from "@/contexts/TenantContext";

interface Category {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  image_url: string | null;
  is_published: boolean;
  created_at: string;
}

const Categories = () => {
  const { tenant, requireTenant } = useTenant();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | undefined>();

  useEffect(() => {
    if (tenant?.id) {
      fetchCategories();
    }
  }, [tenant?.id]);

  const fetchCategories = async () => {
    try {
      const tenantId = requireTenant();

      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });

      if (error) {
        toast.error("Failed to load categories");
        console.error(error);
      } else {
        setCategories(data || []);
      }
      setLoading(false);
    } catch (error) {
      toast.error("Failed to load categories");
      console.error(error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Categories</h1>
          <p className="text-muted-foreground">Organize your products</p>
        </div>
        <Button onClick={() => {
          setSelectedCategory(undefined);
          setDialogOpen(true);
        }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Category
        </Button>
      </div>

      {categories.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No categories yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create categories to organize your products
            </p>
            <Button onClick={() => {
              setSelectedCategory(undefined);
              setDialogOpen(true);
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Create Category
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <Card key={category.id} className="hover:shadow-md transition-shadow">
              {category.image_url && (
                <div className="aspect-video w-full overflow-hidden rounded-t-lg bg-muted">
                  <img 
                    src={category.image_url} 
                    alt={category.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              {!category.image_url && (
                <div className="aspect-video w-full overflow-hidden rounded-t-lg bg-muted flex items-center justify-center">
                  <ImageIcon className="h-12 w-12 text-muted-foreground" />
                </div>
              )}
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{category.name}</CardTitle>
                  <Badge variant={category.is_published ? "default" : "secondary"}>
                    {category.is_published ? "Published" : "Draft"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {category.description || "No description"}
                </p>
                <div className="mt-4 flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => {
                      setSelectedCategory(category);
                      setDialogOpen(true);
                    }}
                  >
                    Edit
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CategoryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        category={selectedCategory}
        onSuccess={fetchCategories}
      />
    </div>
  );
};

export default Categories;
