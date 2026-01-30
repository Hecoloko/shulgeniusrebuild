import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SignupRequest {
  email: string;
  password: string;
  shulName: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, password, shulName } = (await req.json()) as SignupRequest;

    // Validate inputs
    if (!email || !password || !shulName) {
      return new Response(
        JSON.stringify({ error: "Email, password, and shul name are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: "Password must be at least 6 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (shulName.trim().length < 2) {
      return new Response(
        JSON.stringify({ error: "Shul name must be at least 2 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // 1. Create the user account
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm for dev
    });

    if (authError) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: authError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = authData.user.id;

    // 2. Generate a unique slug from the shul name
    const baseSlug = shulName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 30);

    const slug = `${baseSlug}-${Date.now().toString(36)}`;

    // 3. Create the organization
    const { data: org, error: orgError } = await supabaseAdmin
      .from("organizations")
      .insert({
        name: shulName.trim(),
        slug: slug,
      })
      .select()
      .single();

    if (orgError) {
      console.error("Org creation error:", orgError);
      // Clean up: delete the user if org creation fails
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return new Response(
        JSON.stringify({ error: "Failed to create organization: " + orgError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Assign the user as shuladmin for this specific org
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({
        user_id: userId,
        role: "shuladmin",
        organization_id: org.id,
      });

    if (roleError) {
      console.error("Role assignment error:", roleError);
      // Clean up
      await supabaseAdmin.from("organizations").delete().eq("id", org.id);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return new Response(
        JSON.stringify({ error: "Failed to assign role: " + roleError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4.5. Create a member record for the admin (so they exist in the member portal too)
    const [firstName, ...lastNameParts] = (shulName || "Admin").split(" ");
    const lastName = lastNameParts.join(" ") || "Admin";

    const { error: memberError } = await supabaseAdmin
      .from("members")
      .insert({
        user_id: userId,
        organization_id: org.id,
        email: email,
        first_name: firstName,
        last_name: lastName || "User",
        is_active: true,
        balance: 0,
      });

    if (memberError) {
      console.error("Member creation error (non-fatal):", memberError);
      // We don't fail the whole signup if member record fails, but it's important for the portal
    }

    // 5. Create organization settings with defaults
    await supabaseAdmin
      .from("organization_settings")
      .insert({
        organization_id: org.id,
        active_processor: "stripe",
      });

    // 6. Send welcome email via our send-email Edge Function
    // Dynamic URL logic: uses request origin or PUBLIC_URL secret
    const origin = req.headers.get("origin") || "https://shulgenius-rebuild.vercel.app";
    const baseUrl = Deno.env.get("PUBLIC_URL") || origin;

    // Explicitly point to /login for the dashboard link
    const dashboardUrl = `${baseUrl.replace(/\/$/, "")}/login`;
    const publicPageUrl = `${baseUrl.replace(/\/$/, "")}/s/${org.slug}`;

    try {
      await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({
          type: "welcome_shul",
          to: email,
          shulName: org.name,
          portalUrl: dashboardUrl,
          publicPageUrl: publicPageUrl,
        }),
      });
      console.log("Welcome email request sent via send-email function");
    } catch (emailErr) {
      console.error("Error triggering welcome email:", emailErr);
      // Don't fail the registration if email fails
    }

    console.log(`New shuladmin created: ${email} with org: ${org.name}`);

    // Success
    return new Response(
      JSON.stringify({
        success: true,
        user: { id: userId, email },
        organization: { id: org.id, name: org.name, slug: org.slug },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
