import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SetupRequest {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Create admin client with service role
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { email, password, firstName, lastName }: SetupRequest = await req.json();

    if (!email || !password) {
      throw new Error("Email and password are required");
    }

    // Check if any shulowner already exists
    const { data: existingRoles, error: rolesError } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("role", "shulowner")
      .limit(1);

    if (rolesError) {
      throw new Error(`Failed to check existing roles: ${rolesError.message}`);
    }

    if (existingRoles && existingRoles.length > 0) {
      return new Response(
        JSON.stringify({ error: "A Shulowner already exists" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create the user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      throw new Error(`Failed to create user: ${authError.message}`);
    }

    const userId = authData.user.id;

    // Update profile with name
    if (firstName || lastName) {
      await supabaseAdmin
        .from("profiles")
        .update({
          first_name: firstName || null,
          last_name: lastName || null,
        })
        .eq("id", userId);
    }

    // Assign shulowner role (no organization_id for platform owner)
    const { error: roleError } = await supabaseAdmin.from("user_roles").insert({
      user_id: userId,
      role: "shulowner",
      organization_id: null,
    });

    if (roleError) {
      throw new Error(`Failed to assign role: ${roleError.message}`);
    }

    console.log(`Shulowner created successfully: ${email}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Shulowner account created successfully",
        userId,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Setup error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
