import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface InviteRequest {
    memberId: string;
    origin: string; // e.g. https://shulgenius.com or http://localhost:3000
}

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return new Response(
                JSON.stringify({ error: "Unauthorized" }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const { memberId, origin: requestOrigin } = await req.json();
        const origin = requestOrigin || "https://shulgenius-rebuild.vercel.app"; // Fallback

        if (!memberId) {
            return new Response(
                JSON.stringify({ error: "Missing memberId" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Use Service Role to query profiles and members
        const supabaseAdmin = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
            { auth: { autoRefreshToken: false, persistSession: false } }
        );

        // 1. Fetch Member Details
        const { data: member, error: memberError } = await supabaseAdmin
            .from("members")
            .select("*, organizations(name, email)")
            .eq("id", memberId)
            .single();

        if (memberError || !member) {
            return new Response(
                JSON.stringify({ error: "Member not found" }),
                { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const shulName = member.organizations?.name || "Your Shul";
        const adminEmail = member.organizations?.email;
        const memberEmail = member.email;
        const memberName = `${member.first_name} ${member.last_name}`;
        const inviteToken = member.invite_token;

        if (!memberEmail) {
            return new Response(
                JSON.stringify({ error: "Member has no email address" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        let inviteToken = member.invite_token;

        if (!inviteToken) {
            inviteToken = crypto.randomUUID();
            await supabaseAdmin
                .from("members")
                .update({ invite_token: inviteToken })
                .eq("id", memberId);
            console.log(`Generated new invite token for member ${memberId}`);
        }

        // 2. Check if User Exists in Auth
        const { data: { users: authUsers }, error: authSearchError } = await supabaseAdmin.auth.admin.listUsers();
        const existingUser = authUsers?.find(u => u.email?.toLowerCase() === memberEmail.toLowerCase());

        let emailType = "member_invite";
        let actionUrl = `${origin}/portal/setup?token=${inviteToken}`;

        if (existingUser) {
            emailType = "existing_member_invite";
            actionUrl = `${origin}/portal/accept-invite?token=${inviteToken}`;
            console.log(`User exists (${existingUser.id}), sending existing_member_invite`);
        } else {
            console.log(`User does not exist, sending member_invite (signup)`);
        }

        // 3. Call send-email function
        // We invoke it via direct fetch to the function URL to avoid circular dependencies or import issues
        // Actually, calling another edge function from an edge function is done via fetch
        const functionUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-email`;
        const emailRes = await fetch(functionUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`, // Use service role for internal call
            },
            body: JSON.stringify({
                type: emailType,
                to: memberEmail,
                shulName: shulName,
                memberName: memberName,
                setupUrl: actionUrl,
                portalUrl: `${origin}/portal`,
                adminEmail: adminEmail,
            }),
        });

        if (!emailRes.ok) {
            const errText = await emailRes.text();
            throw new Error(`Failed to call send-email: ${errText}`);
        }

        const emailResult = await emailRes.json();

        return new Response(
            JSON.stringify({ success: true, type: emailType, emailResult }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (err: any) {
        console.error("Invite member error:", err);
        return new Response(
            JSON.stringify({ error: err.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
