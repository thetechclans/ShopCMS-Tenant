// Platform configuration - serves both landing page and admin interface
export const PLATFORM_DOMAIN = 'sunwarekklTest.com';

export const isPlatformDomain = (hostname: string): boolean => {
  return hostname === PLATFORM_DOMAIN;
};

// Base domain helper for subdomain checks (e.g., shop.<platform domain>)
export const PLATFORM_BASE_DOMAIN = PLATFORM_DOMAIN;
