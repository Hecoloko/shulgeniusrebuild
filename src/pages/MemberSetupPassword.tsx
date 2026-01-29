import { useState, useEffect } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Loader2, CheckCircle, AlertCircle, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

interface MemberInfo {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  organization_id: string;
  invite_token_expires_at: string;
}

export default function MemberSetupPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [memberInfo, setMemberInfo] = useState<MemberInfo | null>(null);
  const [orgName, setOrgName] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Invalid or missing invite link.");
      setLoading(false);
      return;
    }

    verifyToken();
  }, [token]);

  const verifyToken = async () => {
    try {
      // Call the database function to verify the token
      const { data, error } = await supabase.rpc("get_member_by_invite_token", {
        _token: token,
      });

      if (error) throw error;

      if (!data || data.length === 0) {
        setError("This invite link is invalid or has expired.");
        setLoading(false);
        return;
      }

      const member = data[0] as MemberInfo;
      setMemberInfo(member);

      // Fetch organization name
      const { data: org } = await supabase
        .from("organizations")
        .select("name")
        .eq("id", member.organization_id)
        .maybeSingle();

      if (org) {
        setOrgName(org.name);
      }

      setLoading(false);
    } catch (err: any) {
      console.error("Token verification error:", err);
      setError("Failed to verify invite link. Please try again.");
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (!memberInfo) return;

    setSubmitting(true);

    try {
      // Create the user account using Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: memberInfo.email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            first_name: memberInfo.first_name,
            last_name: memberInfo.last_name,
          },
        },
      });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error("Failed to create account");
      }

      // Update the member record with user_id and mark password as set
      const { error: updateError } = await supabase
        .from("members")
        .update({
          user_id: authData.user.id,
          password_set_at: new Date().toISOString(),
        })
        .eq("id", memberInfo.id);

      if (updateError) {
        console.error("Failed to link member to user:", updateError);
      }

      // Create user role for this member using raw rpc call
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({
          user_id: authData.user.id,
          role: "shulmember" as const,
          organization_id: memberInfo.organization_id,
        });

      if (roleError && !roleError.message.includes("duplicate")) {
        console.error("Failed to create role:", roleError);
      }

      setSuccess(true);
      toast.success("Account created successfully!");

      // Redirect to member portal after a delay
      setTimeout(() => {
        navigate("/portal");
      }, 2000);
    } catch (err: any) {
      console.error("Setup error:", err);
      if (err.message?.includes("already registered")) {
        toast.error("This email is already registered. Please login instead.");
      } else {
        toast.error(err.message || "Failed to create account");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/30">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/30 p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <CardTitle>Invalid Link</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button asChild>
              <Link to="/portal/login">Go to Login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/30 p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <CheckCircle className="h-12 w-12 mx-auto text-success mb-4" />
            <CardTitle>Account Created!</CardTitle>
            <CardDescription>
              Welcome to {orgName}. Redirecting you to the member portal...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/30 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Card>
          <CardHeader className="text-center">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Welcome, {memberInfo?.first_name}!</CardTitle>
            <CardDescription>
              Set up your password to access {orgName}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={memberInfo?.email || ""} disabled />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Create a password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={submitting}
              >
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Account
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-6">
              Already have an account?{" "}
              <Link to="/portal/login" className="text-primary hover:underline">
                Login here
              </Link>
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
