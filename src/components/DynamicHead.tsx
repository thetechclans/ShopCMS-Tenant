import { Helmet } from "react-helmet";
import { useTenantSiteConfig } from "@/hooks/useTenantSiteConfig";

const DynamicHead = () => {
  const { siteTitle, shopName } = useTenantSiteConfig();

  const resolvedTitle =
    (siteTitle && siteTitle.trim().length > 0 ? siteTitle : null) ??
    (shopName && shopName.trim().length > 0 ? shopName : null) ??
    "ShopCMS";

  return (
    <Helmet>
      <title>{resolvedTitle}</title>
    </Helmet>
  );
};

export default DynamicHead;
