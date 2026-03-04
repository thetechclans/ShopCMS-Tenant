import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { User } from "@supabase/supabase-js";
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
  const {
    tenant,
    tenantId,
    isLoading: tenantLoading,
    isSubscriptionActive,
    subscriptionExpiresAt,
  } = useTenant();

  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [activeTab, setActiveTab] = useState("signin");
  const [pendingAuthUser, setPendingAuthUser] = useState<User | null>(null);
  const [lastProcessedUserId, setLastProcessedUserId] = useState<string | null>(null);

  const getExpiryLabel = useCallback(() => {
    if (!subscriptionExpiresAt) {
      return "the configured expiry date";
    }
    return new Date(subscriptionExpiresAt).toLocaleString();
  }, [subscriptionExpiresAt]);

  const ensureActiveSubscription = useCallback(async (currentTenantId: string): Promise<boolean> => {
    if (!isSubscriptionActive) {
      return false;
    }

    const { data, error } = await supabase.rpc("has_active_subscription", {
      p_tenant_id: currentTenantId,
    });

    if (error) {
      toast.error("Unable to validate subscription status. Please try again.");
      return false;
    }

    return Boolean(data);
  }, [isSubscriptionActive]);

  const routeAfterAuth = useCallback(async (user: User) => {
    setLoading(true);

    try {
      if (!user.email_confirmed_at) {
        toast.error("Please verify your email before signing in.");
        await supabase.auth.signOut();
        return;
      }

      const profileRes = await supabase
        .from("profiles")
        .select("status, tenant_id")
        .eq("id", user.id)
        .single();

      if (profileRes.error || !profileRes.data) {
        toast.error("Error checking account status");
        await supabase.auth.signOut();
        return;
      }

      const profile = profileRes.data;

      if (profile.status === "pending") {
        toast.error("Your account is awaiting admin approval");
        await supabase.auth.signOut();
        return;
      }

      if (profile.status === "suspended") {
        toast.error("Your account has been suspended");
        await supabase.auth.signOut();
        return;
      }

      if (!tenantId) {
        toast.error("No tenant context for this domain. Please use your tenant domain.");
        await supabase.auth.signOut();
        return;
      }

      if (profile.tenant_id !== tenantId) {
        toast.error("This account does not belong to the current tenant");
        await supabase.auth.signOut();
        return;
      }

      const hasActiveSubscription = await ensureActiveSubscription(tenantId);
      if (!hasActiveSubscription) {
        toast.error(`Tenant subscription expired on ${getExpiryLabel()}. Please contact support.`);
        await supabase.auth.signOut();
        return;
      }

      toast.success("Welcome back!");
      navigate("/admin");
    } finally {
      setLoading(false);
    }
  }, [ensureActiveSubscription, getExpiryLabel, navigate, tenantId]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session?.user) {
        setPendingAuthUser(null);
        setLastProcessedUserId(null);
        return;
      }

      if (event === "INITIAL_SESSION" || event === "SIGNED_IN") {
        setPendingAuthUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!pendingAuthUser) {
      return;
    }

    if (tenantLoading) {
      return;
    }

    if (lastProcessedUserId === pendingAuthUser.id) {
      return;
    }

    setLastProcessedUserId(pendingAuthUser.id);
    void routeAfterAuth(pendingAuthUser);
  }, [lastProcessedUserId, pendingAuthUser, routeAfterAuth, tenantLoading]);

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
      if (error.message.toLowerCase().includes("email not confirmed")) {
        toast.error("Email not verified yet. Check your inbox and verify first.");
      } else {
        toast.error(error.message);
      }
      return;
    }

    if (!data.user) {
      setLoading(false);
      toast.error("Unable to complete sign in. Please try again.");
      return;
    }

    setPendingAuthUser(data.user);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password || !fullName) {
      toast.error("Please fill in all fields");
      return;
    }

    if (!tenantId) {
      toast.error(`Unable to determine tenant for domain: ${window.location.hostname}`);
      return;
    }

    if (!isSubscriptionActive) {
      toast.error(`Tenant subscription expired on ${getExpiryLabel()}. New signups are disabled.`);
      return;
    }

    setLoading(true);

    const hasActiveSubscription = await ensureActiveSubscription(tenantId);
    if (!hasActiveSubscription) {
      setLoading(false);
      toast.error(`Tenant subscription expired on ${getExpiryLabel()}. New signups are disabled.`);
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth`,
        data: {
          shop_name: fullName,
          tenant_id: tenantId,
        },
      },
    });

    setLoading(false);

    if (error) {
      toast.error(error.message || "Signup failed");
      return;
    }

    toast.success("Account created. Verify email first, then wait for admin approval.");
    setEmail("");
    setPassword("");
    setFullName("");
    setActiveTab("signin");
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast.error("Enter your email in the sign in form first.");
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset`,
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Password reset email sent. Check your inbox.");
  };

  const handleResendVerification = async () => {
    if (!email) {
      toast.error("Enter your email first to resend verification.");
      return;
    }

    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth`,
      },
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Verification email resent.");
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
                    placeholder="........"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Signing in..." : "Sign In"}
                </Button>
                <div className="flex items-center justify-between gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-auto p-0 text-sm"
                    onClick={handleForgotPassword}
                    disabled={loading}
                  >
                    Forgot password?
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-auto p-0 text-sm"
                    onClick={handleResendVerification}
                    disabled={loading}
                  >
                    Resend verification
                  </Button>
                </div>
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
                    placeholder="........"
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
                  Verify your email first. After verification, your account still requires admin approval.
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
