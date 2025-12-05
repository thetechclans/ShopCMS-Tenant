import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ImageUpload } from "@/components/ImageUpload";
import { whatsappSchema } from "@/lib/validationSchemas";
import { ThemeSelector } from "@/components/ThemeSelector";
import { useTenant } from "@/contexts/TenantContext";
import { useQuery } from "@tanstack/react-query";
import { PlanBadge } from "@/components/PlanBadge";
import { UsageMeter } from "@/components/UsageMeter";

interface Profile {
  shop_name: string;
  shop_description: string | null;
  whatsapp_number: string | null;
  favicon_url: string | null;
  site_title: string | null;
}

const Settings = () => {
  const { tenantId } = useTenant();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<Profile>({
    shop_name: "",
    shop_description: null,
    whatsapp_number: null,
    favicon_url: null,
    site_title: null,
  });

  // Fetch tenant plan type
  const { data: tenantLimits } = useQuery({
    queryKey: ["tenant-limits", tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      
      const { data, error } = await supabase
        .from("tenant_limits")
        .select("*")
        .eq("tenant_id", tenantId)
        .single();

      if (error) return null;
      return data;
    },
    enabled: !!tenantId,
  });

  const isGoldTier = tenantLimits?.plan_type === 'gold';

  // Fetch current usage counts
  const { data: usageCounts } = useQuery({
    queryKey: ["usage-counts", tenantId],
    queryFn: async () => {
      if (!tenantId) return null;

      const [productsRes, categoriesRes, carouselRes, pagesRes] = await Promise.all([
        supabase.from("products").select("id", { count: 'exact', head: true }).eq("tenant_id", tenantId),
        supabase.from("categories").select("id", { count: 'exact', head: true }).eq("tenant_id", tenantId),
        supabase.from("carousel_slides").select("id", { count: 'exact', head: true }).eq("tenant_id", tenantId),
        supabase.from("pages").select("id", { count: 'exact', head: true }).eq("tenant_id", tenantId),
      ]);

      return {
        products: productsRes.count || 0,
        categories: categoriesRes.count || 0,
        carouselSlides: carouselRes.count || 0,
        staticPages: pagesRes.count || 0,
      };
    },
    enabled: !!tenantId,
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("shop_name, shop_description, whatsapp_number, favicon_url, site_title")
      .eq("id", user.id)
      .single();

    if (error) {
      toast.error("Failed to load profile");
      console.error(error);
    } else if (data) {
      setProfile(data);
    }
  };

  const handleSave = async () => {
    // Validate WhatsApp number
    if (profile.whatsapp_number) {
      const validation = whatsappSchema.safeParse(profile.whatsapp_number);
      if (!validation.success) {
        toast.error(validation.error.errors[0].message);
        return;
      }
    }

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("profiles")
      .update({
        shop_name: profile.shop_name,
        shop_description: profile.shop_description,
        whatsapp_number: profile.whatsapp_number,
        favicon_url: profile.favicon_url,
        site_title: profile.site_title,
      })
      .eq("id", user.id);

    setLoading(false);

    if (error) {
      toast.error("Failed to update settings");
      console.error(error);
    } else {
      toast.success("Settings updated successfully");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Manage your shop settings</p>
        </div>
        {tenantLimits && (
          <PlanBadge planType={tenantLimits.plan_type as 'basic' | 'silver' | 'gold'} size="lg" />
        )}
      </div>

      {/* Plan Usage Card */}
      {tenantLimits && usageCounts && (
        <Card>
          <CardHeader>
            <CardTitle>Plan Usage</CardTitle>
            <CardDescription>Monitor your current resource usage against plan limits</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <UsageMeter
              label="Products"
              current={usageCounts.products}
              max={tenantLimits.max_products}
            />
            <UsageMeter
              label="Categories"
              current={usageCounts.categories}
              max={tenantLimits.max_categories}
            />
            <UsageMeter
              label="Carousel Slides"
              current={usageCounts.carouselSlides}
              max={tenantLimits.max_carousel_slides}
            />
            <UsageMeter
              label="Static Pages"
              current={usageCounts.staticPages}
              max={tenantLimits.max_static_pages}
            />
            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Max Image Size: <span className="font-medium">{tenantLimits.max_image_size_mb} MB</span>
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Shop Information</CardTitle>
          <CardDescription>Update your shop details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="shop-name">Shop Name</Label>
            <Input
              id="shop-name"
              value={profile.shop_name}
              onChange={(e) => setProfile({ ...profile, shop_name: e.target.value })}
              placeholder="My Awesome Shop"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="shop-description">Shop Description</Label>
            <Textarea
              id="shop-description"
              value={profile.shop_description || ""}
              onChange={(e) => setProfile({ ...profile, shop_description: e.target.value })}
              placeholder="Tell customers about your shop..."
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="whatsapp-number">WhatsApp Number</Label>
            <Input
              id="whatsapp-number"
              value={profile.whatsapp_number || ""}
              onChange={(e) => setProfile({ ...profile, whatsapp_number: e.target.value })}
              placeholder="e.g., 919442420554 (country code + number, no spaces)"
            />
            <p className="text-xs text-muted-foreground">
              Enter phone number with country code (e.g., 919442420554 for India). This will be used for WhatsApp chat buttons on products.
            </p>
          </div>

          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Site Branding</CardTitle>
          <CardDescription>Customize your site's favicon and browser tab title</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="site-title">Browser Tab Title</Label>
            <Input
              id="site-title"
              value={profile.site_title || ""}
              onChange={(e) => setProfile({ ...profile, site_title: e.target.value })}
              placeholder="My Awesome Shop"
            />
            <p className="text-xs text-muted-foreground">
              This text will appear in the browser tab when users visit your site.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Site Favicon</Label>
            <ImageUpload
              value={profile.favicon_url || ""}
              onChange={(url) => setProfile({ ...profile, favicon_url: url })}
              path="favicons"
            />
            <p className="text-xs text-muted-foreground">
              Upload a square image (recommended: 32x32 or 64x64 pixels). This icon appears in the browser tab.
            </p>
          </div>

          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </CardContent>
      </Card>

      {/* Theme Selector for Gold Tier */}
      {isGoldTier && (
        <Card>
          <CardHeader>
            <CardTitle>Premium Themes</CardTitle>
            <CardDescription>Select your preferred theme design</CardDescription>
          </CardHeader>
          <CardContent>
            <ThemeSelector />
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Settings;
