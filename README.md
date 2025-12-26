# ShopCMS-Tenant – Tenant Storefront & Admin

This repo is the **tenant-facing application** for ShopCMS. Each tenant (shop) gets:

- A public storefront (home page, category pages, product detail pages, static pages).
- An authenticated admin area (`/admin/*`) for managing products, categories, pages, users, settings, home page layout – and analytics for eligible plans.

The platform owner manages tenants, plans, and limits in the companion repo: `../ShopCMS-PlatformAdmin`.

---

## Plans & Entitlements (Tenant Perspective)

Plan information is stored in the shared Supabase database (`tenant_limits.plan_type`) and consumed in this app via:

- `src/lib/plans.ts` – central plan definitions:
  - Plans: `basic`, `silver`, `gold`.
  - For each plan:
    - Display label.
    - Default limits: max products, categories, carousel slides, static pages, image size.
    - Feature flags:
      - `hasAnalytics` – whether the plan can see analytics dashboards.
      - `analyticsLevel` – `none`, `standard`, or `advanced` (e.g. 90‑day history for Gold).
      - `canAccessThemes`, `canAccessAdvancedFeatures`.
  - Helpers:
    - `normalizePlanType(planType)` – coerces unknown values to `basic`.
    - `isAtLeastPlan(currentPlan, requiredPlan)` – compare plan tiers.
    - `planSupportsAnalytics(planType)` and `getAnalyticsLevel(planType)`.

- `src/hooks/usePlanFeatures.ts` – derives plan features for the current tenant:
  - Reads `tenant_limits` for the active `tenantId` from Supabase.
  - Returns `features` with:
    - `planType` (normalized to `basic`/`silver`/`gold`).
    - `hasAnalytics`, `analyticsLevel`.
    - `canAccessThemes`, `canAccessAdvancedFeatures`.
    - Effective limits (numeric values) – either from `tenant_limits` or plan defaults.

These features are used across the tenant admin UI to:

- Show plan badges, usage meters, and upgrade prompts.
- Gate advanced features and analytics strictly to Silver/Gold where appropriate.

---

## Analytics – Tracking & Dashboards

### Backend Data Model

The Supabase project defines a lightweight analytics layer (see `../ShopCMS-PlatformAdmin/supabase/migrations/20251212090000_analytics_events.sql`):

- `public.analytics_events` – raw event log:
  - `tenant_id` – which tenant the event belongs to.
  - `event_type` – e.g. `page_view`, `product_view`, `category_view`.
  - `path` – URL path (e.g. `/`, `/product/slug`).
  - `product_id`, `category_id`, `page_id` – optional foreign keys.
  - `metadata jsonb` – flexible extra data (source, referrer, etc.).
  - `occurred_at`, `created_at` timestamps.

- `public.tenant_daily_metrics` – aggregated per-tenant per-day metrics:
  - `tenant_id`.
  - `day` (date truncated from `occurred_at`).
  - `page_views`, `product_views`, `category_views`.

Row Level Security ensures analytics **read** access is plan- and tenant-aware:

- Only users whose `profiles.tenant_id` matches `analytics_events.tenant_id` and whose tenant has `plan_type` of `silver` or `gold` can `select` from `analytics_events` and `tenant_daily_metrics`.
- Analytics events can still be written for Basic tenants (for future upgrades), but those tenants cannot read analytics data.

### Tracking Infrastructure

- `src/lib/analytics.ts` – shared tracking helper:
  - `trackAnalyticsEvent(tenantId, eventType, options)` – low-level insert into `analytics_events`.
  - `useAnalytics()` hook:
    - `trackPageView(path, metadata?)`.
    - `trackProductView(productId, metadata?)`.
    - `trackCategoryView(categoryId, metadata?)`.
  - Always scopes events by `tenantId` from `TenantContext`.

- Global route-based tracking:
  - `src/TenantApp.tsx`:
    - `RouteAnalyticsTracker` subscribes to `useLocation` route changes.
    - On every route change, calls `trackPageView(location.pathname + location.search)`.
    - Mounted once inside `<BrowserRouter>` to capture both public and admin navigation.
  - `src/lib/analytics.ts`:
    - Includes lightweight client-side dedupe for `page_view` events to avoid double-counting
      (especially in React 18 StrictMode where effects run twice in development).

- Page-level tracking (non-page-view events):
  - `src/pages/CategoryProducts.tsx`:
    - After a category is loaded, calls `trackCategoryView(category.id, { slug })`.
  - `src/pages/ProductDetail.tsx`:
    - After product load, calls `trackProductView(product.id, { slug, category_id: product.category_id })`.

Tracking is **plan-agnostic**: events may be recorded for Basic tenants, but they will never see analytics dashboards while on Basic.

### Tenant Analytics Dashboard (Silver/Gold Only)

- Route & component:
  - `src/TenantApp.tsx`:
    - Adds `/admin/analytics` route: `<AdminLayout><Analytics /></AdminLayout>`.
  - `src/pages/Analytics.tsx`:
    - Uses `useTenant()` to get `tenantId`.
    - Uses `usePlanFeatures()` to get `features.hasAnalytics` and `features.analyticsLevel`.
    - If `!features.hasAnalytics`, immediately redirects to `/admin` (route-level guard).

- Data queries (TanStack Query):
  - Daily metrics:
    - Fetches from `tenant_daily_metrics` for the current `tenantId` within a selectable range:
      - Supported ranges: `7d`, `30d`, and `90d` (only when `analyticsLevel === "advanced"` – i.e. Gold).
    - Aggregates total page views, product views, and category views for summary cards.
  - Top products:
    - Uses `analytics_events` (`product_view` events) for the current `tenantId` and range.
    - Groups by `product_id`, sorts, and takes the top 5.
    - Joins back to the `products` table for product names.

- UI behavior by plan:
  - **Basic plan (`basic`):**
    - No “Analytics” menu item in the admin sidebar.
    - Direct access to `/admin/analytics` redirects to `/admin`.
    - RLS prevents any analytics data from being read even if endpoints are known.
  - **Silver plan (`silver`):**
    - “Analytics” menu item is visible in the admin sidebar.
    - `/admin/analytics` shows:
      - Summary cards (page views, product views, category views) for 7/30 days.
      - Top products by views for the selected range.
    - Range selector offers “Last 7 days” and “Last 30 days”.
  - **Gold plan (`gold`):**
    - Same as Silver plus richer history:
      - Range selector includes “Last 90 days” (because `analyticsLevel === "advanced"`).
    - Future enhancements (e.g. more breakdowns, segmentation) can be tied to `analyticsLevel`.

### Navigation & Gating in Admin

- `src/components/AdminLayout.tsx`:
  - Uses `usePlanFeatures()` in `AppSidebar` to derive `features`.
  - Builds menu items at runtime:
    - Base items: Dashboard, Products, Categories, Pages, Settings, Users.
    - If `features.hasAnalytics` is true, appends:
      - `{ title: "Analytics", url: "/admin/analytics" }` to the sidebar menu.
  - Result:
    - Basic tenants never see analytics in navigation.
    - Silver/Gold tenants see “Analytics” and can open the dashboard.

---

## Where to Change Analytics & Plan Rules

If you need to adjust how analytics behaves or which plans can see it:

- Plan configuration (frontend logic):
  - Update `PLAN_DEFINITIONS` in:
    - `src/lib/plans.ts` (this repo).
    - `../ShopCMS-PlatformAdmin/src/lib/plans.ts` (platform repo).
  - Adjust `hasAnalytics` / `analyticsLevel` for each plan.
  - Any change here automatically flows into:
    - `usePlanFeatures`.
    - Sidebar gating in `AdminLayout`.
    - Range options in `Analytics.tsx`.

- Backend plan enforcement:
  - Update the RLS policy on `analytics_events` and any analytics views/RPCs in:
    - `../ShopCMS-PlatformAdmin/supabase/migrations/20251212090000_analytics_events.sql`.
  - Ensure that any plan allowed to read analytics data is listed in the `plan_type` checks.

- Adding new events or metrics:
  - Extend `trackAnalyticsEvent` and `useAnalytics` with more event types (e.g. `cart_add`).
  - Store extra fields in `metadata` or add columns to `analytics_events` as needed.
  - Add new aggregations to `tenant_daily_metrics` or new views/RPCs.
  - Surface those new metrics in `src/pages/Analytics.tsx` or new dashboard sections.

---

## Quick File Map (Tenant App)

- Entry & routing:
  - `src/TenantApp.tsx` – Router configuration, global QueryClient, `TenantProvider`, and `RouteAnalyticsTracker` for page views.
  - `src/tenant-main.tsx` / `src/main.tsx` – Vite entry points.

- Contexts & config:
  - `src/contexts/TenantContext.tsx` – Resolves current tenant (by domain/subdomain/slug) and exposes `tenantId`.
  - `src/lib/platformConfig.ts` – Platform domain detection for shared hosting.
  - `src/lib/plans.ts` – Plan definitions and analytics entitlements.
  - `src/hooks/usePlanFeatures.ts` – Plan-aware feature/limit hook.
  - `src/hooks/useTenantLimits.ts` – Generic tenant limits hook.

- Analytics:
  - `src/lib/analytics.ts` – Tracking helper and `useAnalytics` hook.
  - `src/pages/Analytics.tsx` – Plan-gated analytics dashboard (Silver/Gold only).

- Admin UI:
  - `src/components/AdminLayout.tsx` – Tenant admin shell + sidebar, including plan badge and analytics nav gating.
  - `src/components/PlanBadge.tsx` – Visual plan indicator (Basic/Silver/Gold).
  - `src/components/FeatureGate.tsx`, `src/components/UpgradePrompt.tsx` – Plan-based UI gating and upsell.

- Public storefront:
  - `src/pages/PublicHome.tsx` – Home page, powered by `useHomePageData` and `TenantTemplateRouter`.
  - `src/pages/CategoryProducts.tsx`, `src/pages/ProductDetail.tsx` – Public routes with category/product view tracking.
  - `src/pages/StaticPage.tsx` – Public static pages (page views are tracked globally via `RouteAnalyticsTracker`).

This README should give you enough context to locate the analytics logic, understand how plan-based entitlements are enforced, and extend tracking or dashboards as your needs grow.

---

## Dynamic Content Freshness (No Stale CMS Content)

ShopCMS is CMS-driven, so the storefront must never briefly show old or placeholder content after an admin updates data.

- Public home page data is fetched with strict freshness settings:
  - `src/hooks/useHomePageData.ts` uses `staleTime: 0` + `refetchOnMount: "always"`.
  - `src/pages/PublicHome.tsx` treats `isFetching` as loading and shows skeletons instead of stale UI.
  - `src/components/TenantTemplateRouter.tsx` renders a skeleton whenever the storefront content is loading.
- Realtime cache invalidations:
  - `src/components/TenantRealtimeInvalidator.tsx` subscribes to Supabase Realtime per `tenant_id` and invalidates affected queries (`home-page-sections`, `carousel-slides`, `published-categories`, `tenant-site-config`, etc.).

Rule of thumb: if CMS data is not loaded yet (or is being refetched), render a loading/skeleton state — never “fake” template data that looks real.
