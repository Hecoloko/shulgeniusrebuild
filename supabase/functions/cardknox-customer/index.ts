import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CARDKNOX_API_BASE = "https://api.cardknox.com/v2";
const CARDKNOX_GATEWAY_URL = "https://x1.cardknox.com/gatewayjson";

interface CardknoxRequest {
  action: "create_customer" | "save_card" | "delete_card";
  organizationId: string;
  memberId: string;
  memberEmail: string;
  memberName: string;
  processorId?: string;
  // For save_card action
  cardToken?: string;
  // Optional: raw card details (will be tokenized server-side)
  cardNumber?: string;
  cardExp?: string; // MMYY format
  cardCvc?: string;
  zipCode?: string;
  isDefault?: boolean;
  nickname?: string | null;
  // For delete_card action
  paymentMethodId?: string;
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
    } = body;

    // Log request for debugging
    console.log(`Received request: action=${action}, org=${organizationId}, member=${memberId}`);

    if (!action || !organizationId || !memberId) {
      // Return 200 with error to ensure client display
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
      const { data: processor, error: processorError } = await supabaseAdmin
        .from("payment_processors")
        .select("processor_type, credentials")
        .eq("id", processorId)
        .eq("organization_id", organizationId)
        .single();

      if ((processorError || !processor) && action !== "delete_card") {
        return new Response(
          JSON.stringify({ error: "Payment processor not found" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (processor) {
        processorType = processor.processor_type;
        const credentials = processor.credentials as { transaction_key?: string; ifields_key?: string };
        transactionKey = credentials?.transaction_key || null;
      }
    } else {
      const { data: settings, error: settingsError } = await supabaseAdmin
        .from("organization_settings")
        .select("cardknox_transaction_key, cardknox_ifields_key")
        .eq("organization_id", organizationId)
        .single();

      if ((settingsError || !settings?.cardknox_transaction_key) && action !== "delete_card") {
        return new Response(
          JSON.stringify({ error: "Cardknox not configured for this organization" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (settings?.cardknox_transaction_key) {
        transactionKey = settings.cardknox_transaction_key;
      }
    }

    if (!transactionKey && action !== "delete_card") {
      return new Response(
        JSON.stringify({ error: "Payment processor credentials not configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if member already has a Cardknox customer ID stored
    const { data: existingMember } = await supabaseAdmin
      .from("payment_methods")
      .select("processor_customer_id")
      .eq("member_id", memberId)
      .eq("processor", "cardknox")
      .limit(1)
      .maybeSingle();

    let cardknoxCustomerId = existingMember?.processor_customer_id || null;

    // Helper function to call Cardknox Recurring API
    async function callCardknoxAPI(endpoint: string, data: Record<string, unknown>) {
      if (!transactionKey) {
        throw new Error("Missing transaction key for Cardknox API call");
      }
      const response = await fetch(`${CARDKNOX_API_BASE}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": transactionKey!,
          "X-Recurring-Api-Version": "2.1",
        },
        body: JSON.stringify({
          SoftwareName: "ShulGenius",
          SoftwareVersion: "1.0",
          ...data,
        }),
      });
      return await response.json();
    }

    // Tokenize card via Cardknox gateway. This avoids needing iFields on the client.
    async function tokenizeCard(input: {
      cardNumber: string;
      cardExp?: string;
      cardCvc?: string;
      zipCode?: string;
    }): Promise<{ token: string; cardType?: string; maskedCardNumber?: string } | { error: string }> {
      // Cardknox gatewayjson expects JSON. We use cc:save with xTokenOnly=true to obtain a token
      // without charging. (Exact field set varies by account; this is the standard pattern.)
      const payload: Record<string, unknown> = {
        xVersion: "5.0.0",
        xSoftwareName: "ShulGenius",
        xSoftwareVersion: "1.0",
        xKey: transactionKey!,
        xCommand: "cc:save",
        xCardNum: input.cardNumber,
      };

      if (input.cardExp) payload.xExp = input.cardExp;
      if (input.cardCvc) payload.xCVV = input.cardCvc;
      if (input.zipCode) payload.xZip = input.zipCode;

      const resp = await fetch(CARDKNOX_GATEWAY_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify(payload),
      });

      // Gateway sometimes returns JSON, sometimes text; always consume the body.
      const rawText = await resp.text();
      let data: any = null;
      try {
        data = rawText ? JSON.parse(rawText) : null;
      } catch {
        data = { _raw: rawText };
      }

      const token = (data?.xToken ?? data?.Token ?? data?.token) as string | undefined;
      const result = (data?.xResult ?? data?.Result ?? data?.result) as string | undefined;
      const cardType = (data?.xCardType ?? data?.CardType ?? data?.cardType) as string | undefined;
      const maskedCardNumber = (data?.xMaskedCardNumber ?? data?.MaskedCardNumber ?? data?.maskedCardNumber) as string | undefined;

      if (token) return { token, cardType, maskedCardNumber };

      const err =
        (data?.xError ?? data?.Error ?? data?.error ?? data?._raw) ||
        `Failed to tokenize card${result ? ` (result=${result})` : ""}`;

      console.log("Cardknox gateway tokenization failed", {
        status: resp.status,
        result,
        error: err,
      });
      return { error: String(err) };
    }

    if (action === "create_customer") {
      // Create customer in Cardknox using their Recurring API
      const customerData = {
        CustomerNumber: memberId,
        Email: memberEmail,
        BillFirstName: memberName.split(" ")[0] || memberName,
        BillLastName: memberName.split(" ").slice(1).join(" ") || "",
      };

      console.log("Creating customer in Cardknox:", JSON.stringify(customerData));

      const result = await callCardknoxAPI("/CreateCustomer", customerData);
      console.log("Cardknox customer create response:", result);

      if (result.Result !== "S") {
        return new Response(
          JSON.stringify({ error: result.Error || "Failed to create customer in Cardknox" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          customerId: result.CustomerId,
          message: "Customer created in Cardknox",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "save_card") {
      let effectiveToken = cardToken || null;
      let effectiveCardType = "Unknown";
      let effectiveLastFour = "****";

      // Backwards compatibility: if the client sent raw card fields, tokenize them here.
      if (!effectiveToken && cardNumber) {
        const tokenResult = await tokenizeCard({
          cardNumber,
          cardExp,
          cardCvc,
          zipCode,
        });

        if ("error" in tokenResult) {
          return new Response(
            JSON.stringify({ error: tokenResult.error }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        effectiveToken = tokenResult.token;
        if (tokenResult.cardType) effectiveCardType = tokenResult.cardType;
        if (tokenResult.maskedCardNumber) effectiveLastFour = tokenResult.maskedCardNumber.slice(-4);
      }

      if (!effectiveToken) {
        return new Response(
          JSON.stringify({ error: "Card token is required" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // If no existing customer, create one first
      if (!cardknoxCustomerId) {
        console.log("Creating customer in Cardknox first...");
        const customerData = {
          CustomerNumber: memberId,
          Email: memberEmail,
          BillFirstName: memberName.split(" ")[0] || memberName,
          BillLastName: memberName.split(" ").slice(1).join(" ") || "",
        };

        const createResult = await callCardknoxAPI("/CreateCustomer", customerData);
        console.log("Customer creation result:", createResult);

        if (createResult.Result !== "S") {
          return new Response(
            JSON.stringify({ error: createResult.Error || "Failed to create customer" }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        cardknoxCustomerId = createResult.CustomerId;
      }

      // Add payment method to customer
      const paymentMethodData: Record<string, unknown> = {
        CustomerId: cardknoxCustomerId,
        Token: effectiveToken,
        TokenType: "cc",
        SetAsDefault: isDefault || false,
      };

      if (cardExp) {
        paymentMethodData.Exp = cardExp;
      }

      if (zipCode) {
        paymentMethodData.Zip = zipCode;
      }

      console.log("Creating payment method details:", JSON.stringify({ ...paymentMethodData, Token: "[REDACTED]" }));

      const result = await callCardknoxAPI("/CreatePaymentMethod", paymentMethodData);
      console.log("Cardknox payment method FULL response:", JSON.stringify(result));

      if (result.Result !== "S") {
        return new Response(
          JSON.stringify({ error: result.Error || "Failed to save card in Cardknox" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // If this is set as default, unset other default cards first
      if (isDefault) {
        await supabaseAdmin
          .from("payment_methods")
          .update({ is_default: false })
          .eq("member_id", memberId);
      }

      // Use details from gateway if available, otherwise fall back to recurring response (which might be missing them)
      const finalCardBrand = effectiveCardType !== "Unknown" ? effectiveCardType : (result.CardType || "Unknown");
      const finalLastFour = effectiveLastFour !== "****" ? effectiveLastFour : (result.MaskedCardNumber?.slice(-4) || "****");

      // Store payment method reference in our database
      const { error: pmError } = await supabaseAdmin
        .from("payment_methods")
        .insert({
          member_id: memberId,
          processor: processorType,
          processor_id: processorId || null,
          processor_payment_method_id: effectiveToken, // Use the Gateway token (xToken) for charging
          // We could store result.PaymentMethodId in another field if needed, but for now we need the token to charge.
          processor_customer_id: cardknoxCustomerId,
          card_brand: finalCardBrand,
          card_last_four: finalLastFour,
          exp_month: cardExp ? parseInt(cardExp.slice(0, 2)) : null,
          exp_year: cardExp ? 2000 + parseInt(cardExp.slice(2, 4)) : null,
          is_default: isDefault || false,
          nickname: body.nickname || null,
        });

      if (pmError) {
        console.error("Error saving payment method:", pmError);
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: "Card saved successfully",
          paymentMethodId: result.PaymentMethodId,
          cardBrand: finalCardBrand,
          lastFour: finalLastFour,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "delete_card") {
      const { paymentMethodId } = body as any;

      if (!paymentMethodId) {
        return new Response(
          JSON.stringify({ error: "Payment method ID is required" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get the payment method details first
      const { data: pm, error: pmFetchError } = await supabaseAdmin
        .from("payment_methods")
        .select("*")
        .eq("id", paymentMethodId)
        .eq("member_id", memberId)
        .single();

      if (pmFetchError || !pm) {
        return new Response(
          JSON.stringify({ error: "Payment method not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // If it has a processor ID (Cardknox ID), delete from Cardknox
      if (pm.processor_payment_method_id) {
        if (transactionKey) {
          console.log(`Deleting PaymentMethodId: ${pm.processor_payment_method_id} from Cardknox`);

          try {
            const result = await callCardknoxAPI("/DeletePaymentMethod", {
              PaymentMethodId: pm.processor_payment_method_id
            });

            console.log("Cardknox delete response:", result);

            if (result.Result !== "S") {
              // If error is "Payment method not found", proceed to delete from API
              const errorMessage = result.Error || "";
              if (errorMessage.toLowerCase().includes("not found") || errorMessage.toLowerCase().includes("does not exist") || errorMessage.toLowerCase().includes("invalid token")) {
                console.warn("Payment method not found in Cardknox, proceeding to delete from DB");
              } else {
                console.error("Cardknox delete failed:", JSON.stringify(result));
                // Proceed to delete from DB anyway, but warn user? 
                // Actually, if Cardknox fails (e.g. system error), maybe we shouldn't delete from DB?
                // But for "Not Configured" or "Invalid Key", we definitely SHOULD.
                // Given the robust-delete requirement, I will Return success false BUT STILL DELETE if it's a configuration issue.
                // But here we HAVE a key. If the key is invalid, Cardknox returns Error.
                // Let's assume if deletion fails, we return error. The user can retry if they fix the key.

                return new Response(
                  JSON.stringify({
                    success: false,
                    error: "Cardknox delete failed: " + errorMessage,
                    cardknoxResult: result
                  }),
                  { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
              }
            }
          } catch (e: any) {
            console.error("Cardknox API call threw exception:", e);
            // If the key is invalid or API is down, maybe we should let them delete?
            // For now, return error so they know.
            return new Response(
              JSON.stringify({
                success: false,
                error: "Cardknox API Communication Error: " + e.message,
              }),
              { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        } else {
          console.warn("Skipping Cardknox deletion because credentials are missing.");
        }
      }

      // Delete from Supabase
      const { error: deleteError } = await supabaseAdmin
        .from("payment_methods")
        .delete()
        .eq("id", paymentMethodId);

      if (deleteError) {
        return new Response(
          JSON.stringify({ success: false, error: "Failed to delete payment method from database", details: deleteError }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: "Payment method deleted successfully" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({
        success: false,
        error: "An unexpected error occurred: " + err.message,
        details: err.message,
        stack: err.stack
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
