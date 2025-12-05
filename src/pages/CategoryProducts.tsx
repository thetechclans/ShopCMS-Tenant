import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { PublicNavBar } from "@/components/PublicNavBar";
import { PublicFooter } from "@/components/PublicFooter";
import DynamicHead from "@/components/DynamicHead";
import { useTenant } from "@/contexts/TenantContext";

interface Product {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  product_images: {
    image_url: string;
    alt_text: string | null;
    display_order: number;
  }[];
}

interface Category {
  id: string;
  name: string;
  description: string | null;
}

const CategoryProducts = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { tenant } = useTenant();
  const [category, setCategory] = useState<Category | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (slug && tenant?.id) {
      fetchCategoryAndProducts();
    }
  }, [slug, tenant?.id]);

  const fetchCategoryAndProducts = async () => {
    if (!tenant?.id) return;
    
    // Fetch category
    const { data: categoryData, error: categoryError } = await supabase
      .from("categories")
      .select("*")
      .eq("slug", slug)
      .eq("tenant_id", tenant.id)
      .eq("is_published", true)
      .maybeSingle();

    if (categoryError || !categoryData) {
      setLoading(false);
      return;
    }

    setCategory(categoryData);

    // Fetch products for this category with images
    const { data: productsData, error: productsError } = await supabase
      .from("products")
      .select(`
        *,
        product_images (
          image_url,
          alt_text,
          display_order
        )
      `)
      .eq("category_id", categoryData.id)
      .eq("tenant_id", tenant.id)
      .eq("is_published", true)
      .order("display_order", { ascending: true });

    if (!productsError && productsData) {
      setProducts(productsData);
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold mb-4">Category not found</h1>
        <Button onClick={() => navigate("/")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <DynamicHead />
      <PublicNavBar />

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </div>

        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">{category.name}</h1>
          {category.description && (
            <p className="text-lg text-muted-foreground">{category.description}</p>
          )}
        </div>

        {products.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              No products available in this category yet.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => {
              const mainImage = product.product_images?.sort(
                (a, b) => a.display_order - b.display_order
              )[0];

              return (
                <Card
                  key={product.id}
                  className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => navigate(`/product/${product.slug}`)}
                >
                  <CardContent className="p-0">
                    <div className="aspect-square relative bg-muted">
                      {mainImage ? (
                        <img
                          src={mainImage.image_url}
                          alt={mainImage.alt_text || product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-muted-foreground">No Image</span>
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-lg mb-2">{product.name}</h3>
                      {product.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {product.description}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      <PublicFooter />
    </div>
  );
};

export default CategoryProducts;
