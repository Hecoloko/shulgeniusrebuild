import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface EmailRequest {
  type: "welcome_shul" | "member_invite";
  to: string;
  shulName: string;
  memberName?: string;
  portalUrl?: string;
  setupUrl?: string;
  adminEmail?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: EmailRequest = await req.json();
    const { type, to, shulName, memberName, portalUrl, setupUrl, adminEmail } = body;

    if (!type || !to || !shulName) {
      throw new Error("Missing required fields: type, to, shulName");
    }

    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    let subject: string;
    let html: string;

    if (type === "welcome_shul") {
      subject = `Welcome to ShulGenius - ${shulName} is Ready!`;
      html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }
            .content { background: #fff; padding: 30px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 12px 12px; }
            .cta { display: inline-block; background: #d4af37; color: #1a1a2e; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            h1 { margin: 0; font-size: 24px; }
            .logo { font-size: 32px; margin-bottom: 10px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">✡️</div>
              <h1>Welcome to ShulGenius!</h1>
            </div>
            <div class="content">
              <p>Mazal Tov! Your shul <strong>${shulName}</strong> has been successfully created.</p>
              
              <p>You now have access to powerful tools to manage your congregation:</p>
              <ul>
                <li>📊 <strong>Dashboard</strong> - Track donations, payments, and member activity</li>
                <li>👥 <strong>Members</strong> - Manage your congregation members and families</li>
                <li>💳 <strong>Payments</strong> - Process dues, donations, and recurring billing</li>
                <li>📨 <strong>Invoices</strong> - Create and send professional invoices</li>
                <li>🎯 <strong>Campaigns</strong> - Run fundraising drives and track progress</li>
              </ul>

              <p style="text-align: center;">
                <a href="${portalUrl || 'https://shulgenius.com'}" class="cta">Go to Your Dashboard →</a>
              </p>

              <p>Need help getting started? Reply to this email and our team will be happy to assist.</p>
              
              <p>B'hatzlacha,<br>The ShulGenius Team</p>
            </div>
            <div class="footer">
              © ${new Date().getFullYear()} ShulGenius. All rights reserved.
            </div>
          </div>
        </body>
        </html>
      `;
    } else if (type === "member_invite") {
      subject = `You've been invited to ${shulName}`;
      html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }
            .content { background: #fff; padding: 30px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 12px 12px; }
            .cta { display: inline-block; background: #d4af37; color: #1a1a2e; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            h1 { margin: 0; font-size: 24px; }
            .logo { font-size: 32px; margin-bottom: 10px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">✡️</div>
              <h1>${shulName}</h1>
            </div>
            <div class="content">
              <p>Shalom${memberName ? ` ${memberName}` : ''},</p>
              
              <p>You've been invited to join <strong>${shulName}</strong> as a member!</p>
              
              <p>Set up your account to access your member portal where you can:</p>
              <ul>
                <li>💳 View and pay your invoices</li>
                <li>💰 Make donations to the shul</li>
                <li>📋 Manage your payment methods</li>
                <li>📊 View your account balance</li>
              </ul>

              ${setupUrl ? `
              <p style="text-align: center;">
                <a href="${setupUrl}" class="cta">Set Up Your Account →</a>
              </p>
              <p style="text-align: center; font-size: 12px; color: #666;">
                This link will expire in 7 days.
              </p>
              ` : (portalUrl ? `
              <p style="text-align: center;">
                <a href="${portalUrl}" class="cta">Access Member Portal →</a>
              </p>
              ` : '')}

              <p>If you have any questions, please contact ${adminEmail || 'the shul administration'}.</p>
              
              <p>B'vracha,<br>${shulName}</p>
            </div>
            <div class="footer">
              © ${new Date().getFullYear()} ${shulName}. Powered by ShulGenius.
            </div>
          </div>
        </body>
        </html>
      `;
    } else {
      throw new Error("Invalid email type");
    }

    // Use Resend's free test sender until custom domain is verified
    // To use your own domain, verify it at https://resend.com/domains
    const fromEmail = "onboarding@resend.dev";
    
    // Use Resend API directly via fetch
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `ShulGenius <${fromEmail}>`,
        to: [to],
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const errorData = await res.text();
      console.error("Resend API error:", errorData);
      throw new Error(`Failed to send email: ${errorData}`);
    }

    const emailResponse = await res.json();
    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
