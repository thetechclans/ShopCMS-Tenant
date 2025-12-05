import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useTenant } from "@/contexts/TenantContext";

interface Page {
  id: string;
  title: string;
  content: string | null;
}

const StaticPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { tenant } = useTenant();
  const tenantId = tenant?.id;
  const [page, setPage] = useState<Page | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (slug && tenantId) {
      fetchPage();
    }
  }, [slug, tenantId]);

  const fetchPage = async () => {
    if (!tenantId) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("pages")
      .select("*")
      .eq("slug", slug)
      .eq("tenant_id", tenantId)
      .eq("is_published", true)
      .maybeSingle();

    if (!error && data) {
      setPage(data);
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

  if (!page) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold mb-4">Page not found</h1>
        <Button onClick={() => navigate("/")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
          <Button variant="outline" onClick={() => navigate("/auth")}>
            Admin Login
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <article className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-8">{page.title}</h1>
          <div className="prose prose-lg max-w-none">
            {page.content ? (
              <div className="whitespace-pre-wrap">{page.content}</div>
            ) : (
              <p className="text-muted-foreground">No content available.</p>
            )}
          </div>
        </article>
      </main>
    </div>
  );
};

export default StaticPage;
