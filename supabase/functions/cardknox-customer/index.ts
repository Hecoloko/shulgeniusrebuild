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
  // Processor ID to use specific credentials
  processorId?: string;
  // For save_card action
  cardToken?: string;
  cardNumber?: string;
  cardExp?: string; // MMYY format
  cardCvc?: string;
  zipCode?: string;
  isDefault?: boolean;
  nickname?: string;
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

    const body: CardknoxRequest = await req.json();
    const { 
      action, 
      organizationId, 
      memberId, 
      memberEmail, 
      memberName, 
      processorId,
      cardToken, 
      cardNumber,
      cardExp,
      cardCvc,
      zipCode,
      isDefault,
      nickname
    } = body;

    if (!action || !organizationId || !memberId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Get credentials - either from specific processor or organization settings
    let transactionKey: string | null = null;
    let processorType = "cardknox";

    if (processorId) {
      // Get credentials from payment_processors table
      const { data: processor, error: processorError } = await supabaseAdmin
        .from("payment_processors")
        .select("processor_type, credentials")
        .eq("id", processorId)
        .eq("organization_id", organizationId)
        .single();

      if (processorError || !processor) {
        return new Response(
          JSON.stringify({ error: "Payment processor not found" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      processorType = processor.processor_type;
      const credentials = processor.credentials as { transaction_key?: string; ifields_key?: string };
      transactionKey = credentials?.transaction_key || null;
    } else {
      // Fallback to organization settings
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

      transactionKey = settings.cardknox_transaction_key;
    }

    if (!transactionKey) {
      return new Response(
        JSON.stringify({ error: "Payment processor credentials not configured" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
      // Need either cardToken or cardNumber
      if (!cardToken && !cardNumber) {
        return new Response(
          JSON.stringify({ error: "Card token or card number is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // First, ensure customer exists in Cardknox
      const customerCheckData = new URLSearchParams({
        xKey: transactionKey,
        xVersion: "5.0.0",
        xSoftwareName: "ShulGenius",
        xSoftwareVersion: "1.0.0",
        xCommand: "customer:report",
        xCustomerID: memberId,
      });

      const customerCheckResponse = await fetch("https://x1.cardknox.com/gatewayjson", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: customerCheckData.toString(),
      });

      const customerCheckResult = await customerCheckResponse.json();
      
      // If customer doesn't exist, create them first
      if (customerCheckResult.xResult !== "A" || !customerCheckResult.xCustomerID) {
        console.log("Creating customer in Cardknox...");
        const createCustomerData = new URLSearchParams({
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

        const createResponse = await fetch("https://x1.cardknox.com/gatewayjson", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: createCustomerData.toString(),
        });

        const createResult = await createResponse.json();
        console.log("Customer creation result:", createResult);
        
        if (createResult.xResult !== "A") {
          // If error is not "customer already exists", fail
          if (!createResult.xError?.toLowerCase().includes("exists")) {
            return new Response(
              JSON.stringify({ error: createResult.xError || "Failed to create customer" }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }
      }

      // Save card to customer in Cardknox
      const cardData = new URLSearchParams({
        xKey: transactionKey,
        xVersion: "5.0.0",
        xSoftwareName: "ShulGenius",
        xSoftwareVersion: "1.0.0",
        xCommand: "customer:save",
        xCustomerID: memberId,
        xTokenType: "cc",
      });

      // Use token if provided, otherwise use card number
      if (cardToken) {
        cardData.append("xToken", cardToken);
      } else if (cardNumber) {
        cardData.append("xCardNum", cardNumber);
        if (cardCvc) {
          cardData.append("xCVV", cardCvc);
        }
      }

      if (cardExp) {
        cardData.append("xExp", cardExp);
      }

      if (zipCode) {
        cardData.append("xBillZip", zipCode);
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

      // If this is set as default, unset other default cards first
      if (isDefault) {
        await supabaseAdmin
          .from("payment_methods")
          .update({ is_default: false })
          .eq("member_id", memberId);
      }

      // Store payment method reference in our database
      const { error: pmError } = await supabaseAdmin
        .from("payment_methods")
        .insert({
          member_id: memberId,
          processor: processorType,
          processor_id: processorId || null, // Save the processor ID for routing
          processor_payment_method_id: result.xToken || cardToken || result.xMaskedCardNumber,
          processor_customer_id: memberId,
          card_brand: result.xCardType || "Unknown",
          card_last_four: result.xMaskedCardNumber?.slice(-4) || cardNumber?.slice(-4) || "****",
          exp_month: cardExp ? parseInt(cardExp.slice(0, 2)) : null,
          exp_year: cardExp ? 2000 + parseInt(cardExp.slice(2, 4)) : null,
          is_default: isDefault || false,
        });

      if (pmError) {
        console.error("Error saving payment method:", pmError);
        // Don't fail the request, card is already saved in Cardknox
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: "Card saved successfully",
          paymentMethodId: result.xToken || cardToken,
          cardBrand: result.xCardType,
          lastFour: result.xMaskedCardNumber?.slice(-4) || cardNumber?.slice(-4),
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
