import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import nodemailer from "npm:nodemailer@6.9.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface EmailRequest {
  type: "welcome_shul" | "member_invite" | "existing_member_invite";
  to: string;
  shulName: string;
  memberName?: string;
  portalUrl?: string; // Admin Dashboard or Member Portal
  publicPageUrl?: string; // For Admin Welcome Email
  setupUrl?: string;
  adminEmail?: string;
}

// Credentials provided for testing
const SMTP_USER = "thebookkeepingnexus@gmail.com";
const SMTP_PASS = "xuot npjl rdmf sicc";

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: EmailRequest = await req.json();
    const { type, to, shulName, memberName, portalUrl, publicPageUrl, setupUrl, adminEmail } = body;

    if (!type || !to || !shulName) {
      throw new Error("Missing required fields: type, to, shulName");
    }

    let subject: string;
    let html: string;

    if (type === "welcome_shul") {
      subject = `Congratulations! You are now managing ${shulName}`;
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
            .link-box { background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 10px 0; border: 1px solid #e9ecef; }
            .link-label { font-weight: bold; color: #1a1a2e; display: block; margin-bottom: 5px; }
            .link-url { word-break: break-all; color: #2563eb; text-decoration: none; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">✡️</div>
              <h1>Welcome to ShulGenius!</h1>
            </div>
            <div class="content">
              <p>Congratulations! You are now managing <strong>${shulName}</strong>.</p>
              
              <p>Here are your important links:</p>

              <div class="link-box">
                <span class="link-label">Admin Dashboard Link:</span>
                <a href="${portalUrl}" class="link-url">${portalUrl}</a>
              </div>

              <div class="link-box">
                <span class="link-label">Public Page (Member Portal):</span>
                <a href="${publicPageUrl}" class="link-url">${publicPageUrl}</a>
              </div>

              <p style="text-align: center;">
                <a href="${portalUrl}" class="cta">Login to Dashboard →</a>
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
    } else if (type === "existing_member_invite") {
      subject = `Invitation to join ${shulName}`;
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
              <h1>New Shul Invitation</h1>
            </div>
            <div class="content">
              <p>Shalom${memberName ? ` ${memberName}` : ''},</p>
              
              <p>You have been invited to join <strong>${shulName}</strong> on ShulGenius!</p>
              
              <p>Since you already have a ShulGenius account, simply click the button below to accept the invitation and add this shul to your account.</p>

              <p style="text-align: center;">
                <a href="${setupUrl}" class="cta">Accept Invitation →</a>
              </p>

              <p>Once accepted, you'll be able to switch between your shuls using the selector in your dashboard.</p>
              
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

    // Configure Nodemailer transporter
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true, // true for 465, false for others
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });

    const mailOptions = {
      from: `ShulGenius <${SMTP_USER}>`,
      to: to,
      subject: subject,
      html: html,
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);
    console.log("Message sent: %s", info.messageId);

    return new Response(JSON.stringify({ success: true, messageId: info.messageId }), {
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
