import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function MemberAcceptInvite() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token");
    const navigate = useNavigate();
    const { user, loading: authLoading } = useAuth();

    const [status, setStatus] = useState<"verifying" | "accepting" | "success" | "error">("verifying");
    const [errorMessage, setErrorMessage] = useState("");
    const [shulName, setShulName] = useState("");

    useEffect(() => {
        if (authLoading) return;

        if (!user) {
            // Not logged in - show login prompt (or could redirect to login)
            setStatus("verifying"); // Or a new state "unauthenticated"
            return;
        }

        if (!token) {
            setStatus("error");
            setErrorMessage("Invalid invitation link");
            return;
        }

        // Auto-accept if logged in
        acceptInvite();
    }, [user, authLoading, token]);

    const acceptInvite = async () => {
        setStatus("accepting");

        try {
            const { data, error } = await supabase.rpc("accept_member_invite", { token });

            if (error) throw error;

            const result = data as any;
            if (!result.success) {
                throw new Error(result.error || "Failed to accept invitation");
            }

            setShulName(result.shulName);
            setStatus("success");
            toast.success(`Successfully joined ${result.shulName}`);

            // Slight delay before redirect
            setTimeout(() => {
                navigate("/");
            }, 2000);

        } catch (err: any) {
            console.error("Accept invite error:", err);
            setStatus("error");
            setErrorMessage(err.message || "An unexpected error occurred");
        }
    };

    const handleLogin = () => {
        // Redirect to login with return url
        const returnUrl = encodeURIComponent(`/portal/accept-invite?token=${token}`);
        navigate(`/login?returnUrl=${returnUrl}`); // Assuming login page handles returnUrl
    };

    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-muted/30">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    // State: Unauthenticated
    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
                <Card className="max-w-md w-full premium-card">
                    <CardHeader className="text-center">
                        <div className="mx-auto bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                            <CheckCircle className="h-6 w-6 text-primary" />
                        </div>
                        <CardTitle>Accept Invitation</CardTitle>
                        <CardDescription>
                            Please log in to accept this invitation and add the shul to your account.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Button className="w-full btn-gold" onClick={handleLogin}>
                            Log In to Accept
                        </Button>
                        <div className="text-center text-sm text-muted-foreground">
                            Don't have an account? <span className="text-primary cursor-pointer hover:underline" onClick={() => navigate(`/portal/setup?token=${token}`)}>Create one here</span>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
            <Card className="max-w-md w-full premium-card">
                <CardContent className="pt-6 text-center space-y-4">

                    {status === "accepting" && (
                        <>
                            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
                            <h2 className="text-xl font-semibold">Accepting Invitation...</h2>
                            <p className="text-muted-foreground">Please wait while we link your account.</p>
                        </>
                    )}

                    {status === "success" && (
                        <>
                            <div className="mx-auto bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mb-2">
                                <CheckCircle className="h-8 w-8 text-green-600" />
                            </div>
                            <h2 className="text-xl font-semibold">Invitation Accepted!</h2>
                            <p className="text-muted-foreground">
                                You have successfully joined <strong>{shulName}</strong>.
                            </p>
                            <p className="text-sm text-muted-foreground">Redirecting to dashboard...</p>
                            <Button className="w-full mt-4" onClick={() => navigate("/")}>
                                Go to Dashboard
                            </Button>
                        </>
                    )}

                    {status === "error" && (
                        <>
                            <div className="mx-auto bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mb-2">
                                <XCircle className="h-8 w-8 text-red-600" />
                            </div>
                            <h2 className="text-xl font-semibold">Unable to Accept</h2>
                            <p className="text-destructive font-medium">{errorMessage}</p>
                            <Button variant="outline" className="w-full mt-4" onClick={() => navigate("/")}>
                                Back to Home
                            </Button>
                        </>
                    )}

                </CardContent>
            </Card>
        </div>
    );
}
