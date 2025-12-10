import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useTenant } from "@/contexts/TenantContext";

const Auth = () => {
  const navigate = useNavigate();
  const { tenant, tenantId, isPlatformDomain, isLoading: tenantLoading } = useTenant();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [activeTab, setActiveTab] = useState("signin");

  const routeAfterAuth = async (userId: string) => {
    setLoading(true);
    try {
      const [profileRes, rolesRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('status, tenant_id')
          .eq('id', userId)
          .single(),
        supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
      ]);

      if (profileRes.error || !profileRes.data) {
        toast.error("Error checking account status");
        await supabase.auth.signOut();
        return;
      }

      const profile = profileRes.data;
      const isSuperAdmin = (rolesRes.data || []).some((r) => r.role === 'super_admin');

      if (profile.status === 'pending') {
        toast.error("Your account is awaiting admin approval");
        await supabase.auth.signOut();
        return;
      }

      if (profile.status === 'suspended') {
        toast.error("Your account has been suspended");
        await supabase.auth.signOut();
        return;
      }

      if (isSuperAdmin) {
        navigate("/platform/admin");
        return;
      }

      if (!tenantId) {
        toast.error(`No tenant context for this domain. Please use your tenant domain or contact support.`);
        await supabase.auth.signOut();
        return;
      }

      if (profile.tenant_id !== tenantId) {
        toast.error("This account does not belong to the current tenant");
        await supabase.auth.signOut();
        return;
      }

      toast.success("Welcome back!");
      navigate("/admin");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        if (tenantLoading && !isPlatformDomain) return;
        routeAfterAuth(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, tenantId, tenantLoading, isPlatformDomain]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setLoading(false);
      toast.error(error.message);
      return;
    }

    await routeAfterAuth(data.user.id);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password || !fullName) {
      toast.error("Please fill in all fields");
      return;
    }

    console.log('tenantId: ', tenantId);

    if (!tenantId) {
      toast.error(`Unable to determine tenant for domain: ${window.location.hostname}. Please ensure the domain is configured in Platform Admin.`);
      return;
    }

    setLoading(true);

    try {
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const { data, error } = await supabase.functions.invoke('tenant-signup', {
        headers: anonKey ? { Authorization: `Bearer ${anonKey}` } : undefined,
        body: {
          email,
          password,
          shop_name: fullName,
          tenant_id: tenantId
        }
      });

      setLoading(false);

      if (error) {
        toast.error(error.message || "Signup failed");
        return;
      }

      toast.success(data.message || "Account created! Awaiting admin approval.");
      setEmail("");
      setPassword("");
      setFullName("");
      setActiveTab("signin");
    } catch (err) {
      setLoading(false);
      toast.error("An unexpected error occurred");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            {tenant?.name || "Shop"} Admin
          </CardTitle>
          <CardDescription className="text-center">
            Sign in or create an account to manage your shop
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="admin@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Signing in..." : "Sign In"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-full-name">Full Name</Label>
                  <Input
                    id="signup-full-name"
                    type="text"
                    placeholder="John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    disabled={loading}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="admin@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    required
                    minLength={6}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Creating account..." : "Sign Up"}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Your account will be reviewed by an administrator before you can access the admin panel.
                </p>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
