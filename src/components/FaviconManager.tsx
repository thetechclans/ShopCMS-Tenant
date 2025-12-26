import { useTenantSiteConfig } from "@/hooks/useTenantSiteConfig";
import { useFavicon } from "@/hooks/useFavicon";

const FaviconManager = () => {
  const { faviconUrl } = useTenantSiteConfig();
  useFavicon(faviconUrl);
  return null;
};

export default FaviconManager;

