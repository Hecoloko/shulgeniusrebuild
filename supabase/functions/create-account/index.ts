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

    // 5. Create organization settings with defaults
    await supabaseAdmin
      .from("organization_settings")
      .insert({
        organization_id: org.id,
        active_processor: "stripe",
      });

    // 6. Send welcome email via Resend
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (RESEND_API_KEY) {
      try {
        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "ShulGenius <noreply@shulgenius.com>",
            to: [email],
            subject: `Welcome to ShulGenius - ${org.name} is Ready!`,
            html: `
              <!DOCTYPE html>
              <html>
              <head>
                <style>
                  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
                  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                  .header { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }
                  .content { background: #fff; padding: 30px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 12px 12px; }
                  .cta { display: inline-block; background: #d4af37; color: #1a1a2e; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; }
                  h1 { margin: 0; font-size: 24px; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <div style="font-size: 32px; margin-bottom: 10px;">✡️</div>
                    <h1>Welcome to ShulGenius!</h1>
                  </div>
                  <div class="content">
                    <p>Mazal Tov! Your shul <strong>${org.name}</strong> has been successfully created.</p>
                    <p>You now have access to powerful tools to manage your congregation:</p>
                    <ul>
                      <li>📊 <strong>Dashboard</strong> - Track donations and member activity</li>
                      <li>👥 <strong>Members</strong> - Manage your congregation</li>
                      <li>💳 <strong>Payments</strong> - Process dues and donations</li>
                      <li>📨 <strong>Invoices</strong> - Create professional invoices</li>
                    </ul>
                    <p style="text-align: center; margin-top: 20px;">
                      <a href="${Deno.env.get("SUPABASE_URL")?.replace('.supabase.co', '.lovable.app') || 'https://shulgenius.com'}" class="cta">Go to Dashboard →</a>
                    </p>
                    <p>B'hatzlacha,<br>The ShulGenius Team</p>
                  </div>
                </div>
              </body>
              </html>
            `,
          }),
        });
        
        if (emailRes.ok) {
          console.log("Welcome email sent to:", email);
        } else {
          console.error("Failed to send welcome email:", await emailRes.text());
        }
      } catch (emailErr) {
        console.error("Error sending welcome email:", emailErr);
      }
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
