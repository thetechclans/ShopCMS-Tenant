import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, FileText, Home } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { PageDialog } from "@/components/PageDialog";
import { useTenant } from "@/contexts/TenantContext";

interface Page {
  id: string;
  title: string;
  slug: string;
  content: string | null;
  is_published: boolean;
  created_at: string;
}

const Pages = () => {
  const navigate = useNavigate();
  const { tenantId, tenant } = useTenant();
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPage, setSelectedPage] = useState<Page | undefined>();

  useEffect(() => {
    if (tenantId) {
      fetchPages();
    } else {
      setLoading(false);
    }
  }, [tenantId]);

  const fetchPages = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !tenantId) return;

    const { data, error } = await supabase
      .from("pages")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load pages");
      console.error(error);
    } else {
      setPages(data || []);
    }
    setLoading(false);
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
          <h1 className="text-3xl font-bold">Static Pages</h1>
          <p className="text-muted-foreground">Create custom pages for your shop</p>
        </div>
        <Button onClick={() => {
          setSelectedPage(undefined);
          setDialogOpen(true);
        }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Page
        </Button>
      </div>

      {/* Home Page Card */}
      <Card className="border-2 border-primary">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Home className="h-5 w-5 text-primary" />
              <CardTitle>Home Page</CardTitle>
            </div>
            <Badge>Special Page</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Build your shop's home page with a custom menu and hero carousel
          </p>
          <Button onClick={() => navigate("/admin/pages/home-builder")}>
            Edit Home Page
          </Button>
        </CardContent>
      </Card>

      {pages.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No pages yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create pages like About, Contact, or Terms of Service
            </p>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Page
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {pages.map((page) => (
            <Card key={page.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{page.title}</CardTitle>
                  <Badge variant={page.is_published ? "default" : "secondary"}>
                    {page.is_published ? "Published" : "Draft"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  /page/{page.slug}
                </p>
                <div className="mt-4 flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => {
                      setSelectedPage(page);
                      setDialogOpen(true);
                    }}
                  >
                    Edit
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => window.open(`/page/${page.slug}`, '_blank')}
                  >
                    View
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <PageDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        page={selectedPage}
        onSuccess={fetchPages}
      />
    </div>
  );
};

export default Pages;
