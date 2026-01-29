import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Loader2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function MemberLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (!data.user) {
        throw new Error("Login failed");
      }

      // Check user roles to determine redirection
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role, organization_id")
        .eq("user_id", data.user.id);

      if (roles && roles.length > 0) {
        const isAdmin = roles.some(
          (r) => r.role === "shuladmin" || r.role === "shulowner"
        );

        if (isAdmin) {
          // Has admin role - redirect to admin dashboard
          toast.success("Welcome back, Admin!");
          navigate("/");
        } else {
          // Member only - redirect to member portal
          toast.success("Welcome back!");
          navigate("/portal");
        }
      } else {
        // No roles found, check if they're a member
        const { data: memberData } = await supabase
          .from("members")
          .select("id, organization_id")
          .eq("user_id", data.user.id)
          .maybeSingle();

        if (memberData) {
          // Create shulmember role for them
          await supabase.from("user_roles").insert({
            user_id: data.user.id,
            role: "shulmember",
            organization_id: memberData.organization_id,
          });
          toast.success("Welcome!");
          navigate("/portal");
        } else {
          toast.info("No membership found. Contact your shul administrator.");
          await supabase.auth.signOut();
        }
      }
    } catch (err: any) {
      console.error("Login error:", err);
      toast.error(err.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

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
              <Users className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Member Portal</CardTitle>
            <CardDescription>
              Sign in to access your member account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Sign In
              </Button>
            </form>

            <div className="text-center text-sm text-muted-foreground mt-6 space-y-2">
              <p>
                <Link to="/login" className="text-primary hover:underline">
                  Admin Login
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
