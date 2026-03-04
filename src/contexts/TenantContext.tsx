import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TENANT_BASE_DOMAIN } from '@/lib/tenantDomainConfig';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  subdomain: string;
  status: string;
}

interface TenantContextType {
  tenant: Tenant | null;
  tenantId: string | null;
  isLoading: boolean;
  error: string | null;
  isSubscriptionActive: boolean;
  subscriptionExpiresAt: string | null;
  requireTenant: () => string; // Throws if no tenant
}

const TenantContext = createContext<TenantContextType>({
  tenant: null,
  tenantId: null,
  isLoading: true,
  error: null,
  isSubscriptionActive: true,
  subscriptionExpiresAt: null,
  requireTenant: () => {
    throw new Error("Tenant context not initialized");
  },
});

// eslint-disable-next-line react-refresh/only-export-components
export const useTenant = () => useContext(TenantContext);

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubscriptionActive, setIsSubscriptionActive] = useState(true);
  const [subscriptionExpiresAt, setSubscriptionExpiresAt] = useState<string | null>(null);

  useEffect(() => {
    const detectTenant = async () => {
      try {
        const hostname = window.location.hostname.toLowerCase().replace(/\.$/, '');
        console.log('Detecting tenant for hostname:', hostname);

        // Dev/local fallback: allow setting a default tenant slug for localhost
        // if (hostname === "localhost" || hostname === "127.0.0.1") {
        //   const devSlug = import.meta.env.VITE_DEV_TENANT_SLUG;
        //   if (devSlug) {
        //     const { data, error } = await supabase
        //       .from('tenants')
        //       .select('*')
        //       .eq('slug', devSlug)
        //       .eq('status', 'active')
        //       .maybeSingle();

        //     if (error) {
        //       console.error('Error fetching tenant by dev slug:', error);
        //     } else if (data) {
        //       setTenant(data);
        //       setIsLoading(false);
        //       return;
        //     }
        //   }
        // }

        // Domain-based resolution (custom domain or shared-base subdomain)
        const parts = hostname.split('.');
        console.log('Hostname parts:', parts);
        let tenantQuery;

        // Custom domain lookup (supports both with/without leading www)
        const domainCandidates = Array.from(
          new Set(
            [
              hostname,
              parts[0] === 'www' ? parts.slice(1).join('.') : `www.${hostname}`,
            ].filter((value) => value.length > 0),
          ),
        );

        const { data: domainRows, error: domainError } = await supabase
          .from('tenant_domains')
          .select('tenant_id, is_primary')
          .in('domain', domainCandidates)
          .eq('is_verified', true)
          .order('is_primary', { ascending: false })
          .limit(1);

        const domainData = domainRows?.[0] ?? null;

        if (domainError) {
          console.error('Error fetching domain:', domainError);
        }

        if (domainData) {
          tenantQuery = supabase
            .from('tenants')
            .select('*')
            .eq('id', domainData.tenant_id)
            .eq('status', 'active')
            .maybeSingle();
        } else if (TENANT_BASE_DOMAIN && hostname.endsWith(`.${TENANT_BASE_DOMAIN}`) && parts.length >= 3) {
          // Tenant subdomain pattern (e.g., shop.<base-domain>)
          const subdomain = parts[0];
          
          tenantQuery = supabase
            .from('tenants')
            .select('*')
            .eq('subdomain', subdomain)
            .eq('status', 'active')
            .maybeSingle();
        }

        if (tenantQuery) {
          const { data, error: tenantError } = await tenantQuery;

          if (tenantError) {
            console.error('Error fetching tenant:', tenantError);
            setError(null);
            setTenant(null);
            setIsSubscriptionActive(true);
            setSubscriptionExpiresAt(null);
          } else if (data) {
            setError(null);
            setTenant(data);

            const [{ data: hasActiveSubscription, error: subscriptionError }, { data: limitData, error: limitError }] =
              await Promise.all([
                supabase.rpc('has_active_subscription', { p_tenant_id: data.id }),
                supabase
                  .from('tenant_limits')
                  .select('subscription_expires_at')
                  .eq('tenant_id', data.id)
                  .maybeSingle(),
              ]);

            if (subscriptionError) {
              console.error('Error checking subscription status:', subscriptionError);
            }

            if (limitError && limitError.code !== 'PGRST116') {
              console.error('Error fetching subscription expiry:', limitError);
            }

            setIsSubscriptionActive(Boolean(hasActiveSubscription));
            setSubscriptionExpiresAt(limitData?.subscription_expires_at ?? null);
          } else {
            setError(null);
            setTenant(null);
            setIsSubscriptionActive(true);
            setSubscriptionExpiresAt(null);
          }
        } else {
          // No tenant found - show default empty shop template instead of error
          setTenant(null);
          setError(null); // Clear error to show default template
          setIsSubscriptionActive(true);
          setSubscriptionExpiresAt(null);
        }
      } catch (err) {
        console.error('Error detecting tenant:', err);
        setError(null); // Show default template instead of error page
        setTenant(null);
        setIsSubscriptionActive(true);
        setSubscriptionExpiresAt(null);
      } finally {
        setIsLoading(false);
      }
    };

    detectTenant();
  }, []);

  const requireTenant = () => {
    if (!tenant?.id) {
      throw new Error("Tenant context required but not available");
    }
    return tenant.id;
  };

  return (
    <TenantContext.Provider 
      value={{ 
        tenant, 
        tenantId: tenant?.id || null,
        isLoading, 
        error, 
        isSubscriptionActive,
        subscriptionExpiresAt,
        requireTenant 
      }}
    >
      {children}
    </TenantContext.Provider>
  );
};
