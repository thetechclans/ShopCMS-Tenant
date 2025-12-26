import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";

interface CarouselSlide {
  id: string;
  image_url: string;
  title: string | null;
  subtitle: string | null;
  cta_label: string | null;
  cta_link: string | null;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
}

const fetchCarouselSlides = async (tenantId: string): Promise<CarouselSlide[]> => {
  const { data, error } = await supabase
    .from("carousel_slides")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  if (error) throw error;
  return data || [];
};

const fetchCategories = async (tenantId: string): Promise<Category[]> => {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("is_published", true)
    .order("display_order", { ascending: true });

  if (error) throw error;
  return data || [];
};

export const useHomePageData = () => {
  const { tenant, isLoading: tenantLoading } = useTenant();
  
  const slidesQuery = useQuery({
    queryKey: ["carousel-slides", tenant?.id],
    queryFn: () => {
      if (!tenant?.id) throw new Error("Tenant required");
      return fetchCarouselSlides(tenant.id);
    },
    enabled: !!tenant?.id,
    // CMS content must always be current. We prefer a fresh fetch on mount and
    // show loading/skeletons while fetching instead of showing stale data.
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  const categoriesQuery = useQuery({
    queryKey: ["published-categories", tenant?.id],
    queryFn: () => {
      if (!tenant?.id) throw new Error("Tenant required");
      return fetchCategories(tenant.id);
    },
    enabled: !!tenant?.id,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  const isFetching = slidesQuery.isFetching || categoriesQuery.isFetching;
  const isInitialLoading = tenantLoading || slidesQuery.isLoading || categoriesQuery.isLoading;

  return {
    slides: slidesQuery.data || [],
    categories: categoriesQuery.data || [],
    isLoading: isInitialLoading || isFetching,
    isFetching,
    isInitialLoading,
    isError: slidesQuery.isError || categoriesQuery.isError,
    error: slidesQuery.error || categoriesQuery.error,
  };
};
