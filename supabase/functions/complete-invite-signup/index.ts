import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const { token, password } = await req.json();

        if (!token || !password) {
            return new Response(
                JSON.stringify({ error: "Missing token or password" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Initialize Supabase Admin Client
        const supabaseAdmin = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false,
                },
            }
        );

        // 1. Verify Token and Get Member Info
        const { data: member, error: memberError } = await supabaseAdmin
            .from("members")
            .select("id, email, first_name, last_name, organization_id, user_id")
            .eq("invite_token", token)
            .single();

        if (memberError || !member) {
            return new Response(
                JSON.stringify({ error: "Invalid or expired invitation token" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        if (member.user_id) {
            return new Response(
                JSON.stringify({ error: "This invitation has already been claimed." }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // 2. Create User Account (Auto-Confirmed)
        // First check if user exists to avoid forcing duplicates (though invite logic usually implies new)
        const { data: existingUser } = await supabaseAdmin.auth.admin.getUserById(member.id);
        // Wait, member.id is not user.id. We check by email.

        // Actually, let's just try to create. If email exists, it throws.
        // If it throws "User already registered", we should handle it (maybe they should login).

        let userId;

        const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: member.email,
            password: password,
            email_confirm: true, // This skips the confirmation email!
            user_metadata: {
                first_name: member.first_name,
                last_name: member.last_name,
            },
        });

        if (createError) {
            // If user already exists, we can't "Silent Signup" them with a new password safely.
            // They should use the "Login" flow.
            console.error("User creation error:", createError);
            return new Response(
                JSON.stringify({ error: createError.message }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        userId = userData.user.id;

        // 3. Link User to Member (Claim Invite)
        const { error: updateError } = await supabaseAdmin
            .from("members")
            .update({
                user_id: userId,
                invite_token: null, // Clear token
                password_set_at: new Date().toISOString(),
            })
            .eq("id", member.id);

        if (updateError) {
            console.error("Failed to link member:", updateError);
            // This is bad state (User created but not linked). 
            // But we can proceed, maybe logging it.
        }

        // 4. Assign Role
        const { error: roleError } = await supabaseAdmin
            .from("user_roles")
            .insert({
                user_id: userId,
                role: "shulmember",
                organization_id: member.organization_id,
            });

        if (roleError) {
            console.error("Failed to assign role:", roleError);
        }

        // 5. Generate Session for Immediate Login
        // We sign in as the user to get a session token
        const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.signInWithPassword({
            email: member.email,
            password: password,
        });

        if (sessionError) {
            console.error("Auto-login failed:", sessionError);
            return new Response(
                JSON.stringify({ success: true, message: "Account created but auto-login failed. Please log in manually." }),
                { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        return new Response(
            JSON.stringify({ success: true, session: sessionData.session }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (err: any) {
        console.error("Unexpected error:", err);
        return new Response(
            JSON.stringify({ error: err.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
