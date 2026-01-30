import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Sparkles, Mail, Lock, Eye, EyeOff, ArrowRight, Building2, UserPlus, LogIn } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type AuthMode = "login" | "signup";

export default function Login() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [shulName, setShulName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      toast({
        title: "Login Failed",
        description: error.message,
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    // Get user to check roles
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      // Small delay to allow roles to propagate if just signed up
      const fetchRoles = async (retryCount = 0): Promise<any[]> => {
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id);

        if ((!roles || roles.length === 0) && retryCount < 2) {
          await new Promise(resolve => setTimeout(resolve, 500));
          return fetchRoles(retryCount + 1);
        }
        return roles || [];
      };

      const roles = await fetchRoles();
      const isAdmin = roles.some(r => r.role === "shuladmin" || r.role === "shulowner");

      if (isAdmin) {
        toast({
          title: "Welcome back!",
          description: "Signed in as administrator.",
        });
        navigate("/dashboard", { replace: true });
      } else if (roles.length > 0) {
        // Must be a member
        toast({
          title: "Welcome!",
          description: "Redirecting to member portal.",
        });
        navigate("/portal", { replace: true });
      } else {
        // No roles found - might be a new user where roles are still syncing
        toast({
          title: "Accessing Dashboard",
          description: "Taking you to your homepage.",
        });
        navigate("/dashboard", { replace: true });
      }
    } else {
      navigate("/dashboard", { replace: true });
    }

    setIsLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Call the edge function to create user + org + roles
      const { data, error } = await supabase.functions.invoke("create-account", {
        body: { email, password, shulName },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      toast({
        title: "Account created!",
        description: `Welcome to ShulGenius! Your shul "${shulName}" is ready.`,
      });

      // Redirect to success page (Check Email)
      navigate("/signup-success");

    } catch (err: any) {
      toast({
        title: "Signup Failed",
        description: err.message || "Could not create your account",
        variant: "destructive",
      });
    }

    setIsLoading(false);
  };

  const handleSubmit = mode === "login" ? handleLogin : handleSignup;

  const toggleMode = () => {
    setMode(mode === "login" ? "signup" : "login");
    setEmail("");
    setPassword("");
    setShulName("");
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <motion.div
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-royal via-royal-light to-royal-dark relative overflow-hidden"
      >
        {/* Decorative circles */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-64 h-64 bg-gold/10 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-gold/5 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 flex flex-col justify-center px-16">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="flex items-center gap-4 mb-8"
          >
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gold to-gold-light flex items-center justify-center shadow-glow-gold">
              <Sparkles className="w-8 h-8 text-royal-dark" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white">ShulGenius</h1>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <h2 className="text-3xl font-semibold text-white mb-4">
              {mode === "login"
                ? "The Operating System for Your Synagogue"
                : "Start Managing Your Shul Today"
              }
            </h2>
            <p className="text-white/70 text-lg leading-relaxed">
              {mode === "login"
                ? "Manage members, invoices, campaigns, and donations with a premium fintech experience built for Jewish communities."
                : "Create your account in seconds and get instant access to powerful tools for membership, billing, and fundraising."
              }
            </p>
          </motion.div>
        </div>
      </motion.div>

      {/* Right Panel - Auth Form */}
      <motion.div
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-background"
      >
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gold to-gold-light flex items-center justify-center shadow-glow-gold">
              <Sparkles className="w-6 h-6 text-royal-dark" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">ShulGenius</h1>
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <h2 className="text-2xl font-bold text-foreground mb-2">
                {mode === "login" ? "Welcome back" : "Create your account"}
              </h2>
              <p className="text-muted-foreground mb-8">
                {mode === "login"
                  ? "Sign in to continue to your dashboard"
                  : "Set up your shul in just a few seconds"
                }
              </p>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Shul Name Field (Signup only) */}
                {mode === "signup" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2"
                  >
                    <label className="text-sm font-medium text-foreground">
                      Shul Name
                    </label>
                    <div className="relative">
                      <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <input
                        type="text"
                        value={shulName}
                        onChange={(e) => setShulName(e.target.value)}
                        placeholder="Congregation Beth Israel"
                        required
                        className="w-full bg-muted/50 border border-border/50 rounded-xl px-12 py-3.5 
                          focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 
                          transition-all duration-200 text-foreground placeholder:text-muted-foreground"
                      />
                    </div>
                  </motion.div>
                )}

                {/* Email Field */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      className="w-full bg-muted/50 border border-border/50 rounded-xl px-12 py-3.5 
                        focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 
                        transition-all duration-200 text-foreground placeholder:text-muted-foreground"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      minLength={6}
                      className="w-full bg-muted/50 border border-border/50 rounded-xl px-12 py-3.5 
                        focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 
                        transition-all duration-200 text-foreground placeholder:text-muted-foreground"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  {mode === "signup" && (
                    <p className="text-xs text-muted-foreground">
                      Must be at least 6 characters
                    </p>
                  )}
                </div>

                {/* Submit Button */}
                <motion.button
                  type="submit"
                  disabled={isLoading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="btn-royal w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : mode === "login" ? (
                    <>
                      Sign In
                      <ArrowRight className="w-5 h-5" />
                    </>
                  ) : (
                    <>
                      Create Account
                      <UserPlus className="w-5 h-5" />
                    </>
                  )}
                </motion.button>
              </form>

              {/* Toggle Mode */}
              <div className="mt-6 text-center">
                <p className="text-muted-foreground">
                  {mode === "login" ? "Don't have an account?" : "Already have an account?"}
                  <button
                    onClick={toggleMode}
                    className="ml-2 text-primary font-medium hover:underline inline-flex items-center gap-1"
                  >
                    {mode === "login" ? (
                      <>
                        Create one
                        <UserPlus className="w-4 h-4" />
                      </>
                    ) : (
                      <>
                        Sign in
                        <LogIn className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
