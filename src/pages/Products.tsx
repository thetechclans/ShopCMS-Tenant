import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Package, Search, Grid3x3, LayoutGrid, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { ProductDialog } from "@/components/ProductDialog";
import { ProductViewDialog } from "@/components/ProductViewDialog";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { useTenant } from "@/contexts/TenantContext";
import { usePlanFeatures } from "@/hooks/usePlanFeatures";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Product {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  category_id: string | null;
  is_published: boolean;
  whatsapp_enabled: boolean;
  created_at: string;
  product_images?: { image_url: string; display_order: number }[];
}

interface Category {
  id: string;
  name: string;
}

const Products = () => {
  const { tenant, requireTenant } = useTenant();
  const { features } = usePlanFeatures();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | undefined>();
  const [viewingProduct, setViewingProduct] = useState<Product | undefined>();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"card" | "grid">("card");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const canAddProduct = products.length < features.maxProducts;
  const isNearLimit = products.length >= features.maxProducts * 0.8;

  useEffect(() => {
    if (tenant?.id) {
      fetchProducts();
      fetchCategories();
    }
  }, [tenant?.id]);

  const fetchProducts = async () => {
    try {
      const tenantId = requireTenant();

      const { data, error } = await supabase
        .from("products")
        .select(`
          *,
          product_images(image_url, display_order)
        `)
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });

      if (error) {
        toast.error("Failed to load products");
        console.error(error);
      } else {
        setProducts(data || []);
      }
      setLoading(false);
    } catch (error) {
      toast.error("Failed to load products");
      console.error(error);
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const tenantId = requireTenant();

      const { data, error } = await supabase
        .from("categories")
        .select("id, name")
        .eq("tenant_id", tenantId)
        .order("name");

      if (error) {
        console.error("Failed to load categories:", error);
      } else {
        setCategories(data || []);
      }
    } catch (error) {
      console.error("Failed to load categories:", error);
    }
  };

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch =
        searchQuery === "" ||
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.slug.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        selectedCategoryId === "all" ||
        product.category_id === selectedCategoryId;

      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, selectedCategoryId]);

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredProducts, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategoryId]);

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return "Uncategorized";
    return categories.find(cat => cat.id === categoryId)?.name || "Uncategorized";
  };

  const getPrimaryImage = (product: Product) => {
    if (!product.product_images || product.product_images.length === 0) return null;
    const sorted = [...product.product_images].sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    return sorted[0]?.image_url || null;
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
      <div>
        <h1 className="text-3xl font-bold">Products</h1>
        <p className="text-muted-foreground">Manage your product catalog</p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-3 items-center">
          <Select value={itemsPerPage.toString()} onValueChange={(value) => {
            setItemsPerPage(Number(value));
            setCurrentPage(1);
          }}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2 border rounded-md p-2">
            <LayoutGrid className={`h-4 w-4 ${viewMode === "card" ? "text-primary" : "text-muted-foreground"}`} />
            <Switch
              checked={viewMode === "grid"}
              onCheckedChange={(checked) => setViewMode(checked ? "grid" : "card")}
            />
            <Grid3x3 className={`h-4 w-4 ${viewMode === "grid" ? "text-primary" : "text-muted-foreground"}`} />
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <Button 
                    onClick={() => {
                      if (canAddProduct) {
                        setSelectedProduct(undefined);
                        setDialogOpen(true);
                      }
                    }}
                    disabled={!canAddProduct}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Product
                  </Button>
                </div>
              </TooltipTrigger>
              {!canAddProduct && (
                <TooltipContent>
                  <p>Product limit reached ({products.length}/{features.maxProducts})</p>
                  <p className="text-xs">Contact admin to upgrade plan</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Limit Warning */}
      {isNearLimit && (
        <Card className="border-amber-500/50 bg-amber-50/50">
          <CardContent className="flex items-center gap-2 py-3">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <p className="text-sm text-amber-800">
              You're approaching your product limit ({products.length}/{features.maxProducts}). 
              {!canAddProduct ? ' Upgrade to add more products.' : ' Consider upgrading soon.'}
            </p>
          </CardContent>
        </Card>
      )}

      {filteredProducts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No products yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Get started by creating your first product
            </p>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <Button 
                      onClick={() => {
                        if (canAddProduct) {
                          setSelectedProduct(undefined);
                          setDialogOpen(true);
                        }
                      }}
                      disabled={!canAddProduct}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Product
                    </Button>
                  </div>
                </TooltipTrigger>
                {!canAddProduct && (
                  <TooltipContent>
                    <p>Product limit reached ({products.length}/{features.maxProducts})</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </CardContent>
        </Card>
      ) : viewMode === "card" ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {paginatedProducts.map((product) => {
            const primaryImage = getPrimaryImage(product);
            return (
              <Card key={product.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{product.name}</CardTitle>
                    <Badge variant={product.is_published ? "default" : "secondary"}>
                      {product.is_published ? "Published" : "Draft"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {primaryImage && (
                    <img 
                      src={primaryImage} 
                      alt={product.name}
                      className="w-full h-40 object-cover rounded-md mb-3"
                    />
                  )}
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {product.description || "No description"}
                  </p>
                  <div className="mt-4 flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => {
                        setSelectedProduct(product);
                        setDialogOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => {
                        setViewingProduct(product);
                        setViewDialogOpen(true);
                      }}
                    >
                      View
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">Image</TableHead>
                  <TableHead>Product Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>WhatsApp Chat</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedProducts.map((product) => {
                  const primaryImage = getPrimaryImage(product);
                  return (
                    <TableRow key={product.id}>
                      <TableCell>
                        {primaryImage ? (
                          <img 
                            src={primaryImage} 
                            alt={product.name}
                            className="w-12 h-12 object-cover rounded"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                            <Package className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>{getCategoryName(product.category_id)}</TableCell>
                      <TableCell>
                        <Badge variant={product.is_published ? "default" : "secondary"}>
                          {product.is_published ? "Published" : "Draft"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={product.whatsapp_enabled ? "default" : "outline"}>
                          {product.whatsapp_enabled ? "Enabled" : "Disabled"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setSelectedProduct(product);
                              setDialogOpen(true);
                            }}
                          >
                            Edit
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setViewingProduct(product);
                              setViewDialogOpen(true);
                            }}
                          >
                            View
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {filteredProducts.length > 0 && totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <PaginationItem key={page}>
                <PaginationLink
                  onClick={() => setCurrentPage(page)}
                  isActive={currentPage === page}
                  className="cursor-pointer"
                >
                  {page}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      <ProductDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        product={selectedProduct}
        onSuccess={fetchProducts}
      />

      <ProductViewDialog
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
        product={viewingProduct}
      />
    </div>
  );
};

export default Products;
