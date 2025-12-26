import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useHomePageData } from "@/hooks/useHomePageData";
import { CategorySectionData } from "@/components/CategorySectionEditor";
import { TextSectionData } from "@/components/TextSectionEditor";
import { TenantTemplateRouter } from "@/components/TenantTemplateRouter";
import { useTenant } from "@/contexts/TenantContext";

type PageSection = CategorySectionData | TextSectionData;

const PublicHome = () => {
  const { tenant, isLoading: tenantLoading } = useTenant();
  const tenantId = tenant?.id;
  const { slides, categories, isLoading: homeDataLoading, isFetching: homeDataFetching } = useHomePageData();

  const { data: sections = [], isLoading: sectionsLoading, isFetching: sectionsFetching } = useQuery({
    queryKey: ["home-page-sections", tenantId],
    queryFn: async (): Promise<PageSection[]> => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from("pages")
        .select("*")
        .eq("slug", "home")
        .eq("tenant_id", tenantId)
        .eq("is_published", true)
        .single();

      if (error || !data || !data.content) return [];
      
      try {
        return JSON.parse(data.content);
      } catch {
        return [];
      }
    },
    enabled: !!tenantId,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  // We treat any "fetching" state as loading to avoid showing stale CMS content.
  // If the tenant is not resolved yet, show a skeleton rather than template fallback content.
  const isLoading =
    tenantLoading ||
    homeDataLoading ||
    homeDataFetching ||
    sectionsLoading ||
    sectionsFetching;

  return (
    <TenantTemplateRouter
      slides={slides}
      categories={categories}
      sections={sections}
      isLoading={isLoading}
    />
  );
};

export default PublicHome;
