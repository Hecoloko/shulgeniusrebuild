import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface CardknoxRequest {
  action: "create_customer" | "save_card";
  organizationId: string;
  memberId: string;
  memberEmail: string;
  memberName: string;
  // For save_card action
  cardToken?: string;
  cardExp?: string; // MMYY format
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: CardknoxRequest = await req.json();
    const { action, organizationId, memberId, memberEmail, memberName, cardToken, cardExp } = body;

    if (!action || !organizationId || !memberId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get organization settings with Cardknox credentials
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: settings, error: settingsError } = await supabaseAdmin
      .from("organization_settings")
      .select("cardknox_transaction_key, cardknox_ifields_key")
      .eq("organization_id", organizationId)
      .single();

    if (settingsError || !settings?.cardknox_transaction_key) {
      return new Response(
        JSON.stringify({ error: "Cardknox not configured for this organization" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const transactionKey = settings.cardknox_transaction_key;

    if (action === "create_customer") {
      // Create customer in Cardknox using their Gateway API
      const customerData = new URLSearchParams({
        xKey: transactionKey,
        xVersion: "5.0.0",
        xSoftwareName: "ShulGenius",
        xSoftwareVersion: "1.0.0",
        xCommand: "customer:add",
        xCustomerID: memberId,
        xBillFirstName: memberName.split(" ")[0] || memberName,
        xBillLastName: memberName.split(" ").slice(1).join(" ") || "",
        xEmail: memberEmail,
      });

      const response = await fetch("https://x1.cardknox.com/gatewayjson", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: customerData.toString(),
      });

      const result = await response.json();
      console.log("Cardknox customer create response:", result);

      if (result.xResult !== "A") {
        return new Response(
          JSON.stringify({ error: result.xError || "Failed to create customer in Cardknox" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          customerId: result.xCustomerID || memberId,
          message: "Customer created in Cardknox",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "save_card") {
      if (!cardToken) {
        return new Response(
          JSON.stringify({ error: "Card token is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Save card to customer in Cardknox
      const cardData = new URLSearchParams({
        xKey: transactionKey,
        xVersion: "5.0.0",
        xSoftwareName: "ShulGenius",
        xSoftwareVersion: "1.0.0",
        xCommand: "customer:save",
        xCustomerID: memberId,
        xToken: cardToken,
        xTokenType: "cc",
      });

      if (cardExp) {
        cardData.append("xExp", cardExp);
      }

      const response = await fetch("https://x1.cardknox.com/gatewayjson", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: cardData.toString(),
      });

      const result = await response.json();
      console.log("Cardknox save card response:", result);

      if (result.xResult !== "A") {
        return new Response(
          JSON.stringify({ error: result.xError || "Failed to save card in Cardknox" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Store payment method reference in our database
      const { error: pmError } = await supabaseAdmin
        .from("payment_methods")
        .insert({
          member_id: memberId,
          processor: "cardknox",
          processor_payment_method_id: result.xToken || cardToken,
          processor_customer_id: memberId,
          card_brand: result.xCardType || "Unknown",
          card_last_four: result.xMaskedCardNumber?.slice(-4) || "****",
          exp_month: cardExp ? parseInt(cardExp.slice(0, 2)) : null,
          exp_year: cardExp ? 2000 + parseInt(cardExp.slice(2, 4)) : null,
          is_default: true,
        });

      if (pmError) {
        console.error("Error saving payment method:", pmError);
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: "Card saved successfully",
          paymentMethodId: result.xToken || cardToken,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
