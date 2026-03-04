const normalizeHostname = (value: string): string => {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*/, "")
    .replace(/:\d+$/, "")
    .replace(/\.$/, "");
};

const configuredTenantBaseDomain = normalizeHostname(
  import.meta.env.VITE_TENANT_BASE_DOMAIN ??
    import.meta.env.VITE_PLATFORM_BASE_DOMAIN ??
    import.meta.env.PLATFORM_BASE_DOMAIN ??
    "",
);

export const TENANT_BASE_DOMAIN = configuredTenantBaseDomain;
