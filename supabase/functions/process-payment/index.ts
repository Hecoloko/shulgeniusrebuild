import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ProcessPaymentRequest {
  subscriptionId: string;
  memberId: string;
  organizationId: string;
  amount: number;
  description?: string;
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

    // Verify user is authenticated
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claims?.claims) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: ProcessPaymentRequest = await req.json();
    const { subscriptionId, memberId, organizationId, amount, description } = body;

    if (!subscriptionId || !memberId || !organizationId || !amount) {
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

    // Fetch subscription with payment method and campaign
    const { data: subscription, error: subError } = await supabaseAdmin
      .from("subscriptions")
      .select("*, payment_methods(*), campaigns(name)")
      .eq("id", subscriptionId)
      .single();

    if (subError || !subscription) {
      return new Response(
        JSON.stringify({ error: "Subscription not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!subscription.payment_method_id || !subscription.payment_methods) {
      return new Response(
        JSON.stringify({ error: "No payment method linked to this subscription" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const paymentMethod = subscription.payment_methods as {
      id: string;
      processor: string;
      processor_id?: string;
      processor_payment_method_id: string;
      processor_customer_id?: string;
    };

    // Get processor credentials
    let transactionKey: string | null = null;
    let processorType = paymentMethod.processor || "cardknox";

    if (paymentMethod.processor_id) {
      // Get credentials from payment_processors table
      const { data: processor, error: processorError } = await supabaseAdmin
        .from("payment_processors")
        .select("processor_type, credentials")
        .eq("id", paymentMethod.processor_id)
        .single();

      if (processorError || !processor) {
        return new Response(
          JSON.stringify({ error: "Payment processor not found" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      processorType = processor.processor_type;
      const credentials = processor.credentials as { transaction_key?: string };
      transactionKey = credentials?.transaction_key || null;
    } else {
      // Fallback to organization settings
      const { data: settings, error: settingsError } = await supabaseAdmin
        .from("organization_settings")
        .select("cardknox_transaction_key")
        .eq("organization_id", organizationId)
        .single();

      if (settingsError || !settings?.cardknox_transaction_key) {
        return new Response(
          JSON.stringify({ error: "Payment processor not configured" }),
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

    // Get member email for receipt
    const { data: member } = await supabaseAdmin
      .from("members")
      .select("email, first_name, last_name")
      .eq("id", memberId)
      .single();

    // Generate invoice number
    const invoiceNumber = `SUB-${Date.now().toString(36).toUpperCase()}`;
    const campaignName = (subscription.campaigns as { name: string } | null)?.name || "Subscription";

    // Process payment via Cardknox cc:sale
    const paymentData = new URLSearchParams({
      xKey: transactionKey,
      xVersion: "5.0.0",
      xSoftwareName: "ShulGenius",
      xSoftwareVersion: "1.0.0",
      xCommand: "cc:sale",
      xToken: paymentMethod.processor_payment_method_id,
      xAmount: amount.toFixed(2),
      xInvoice: invoiceNumber,
      xDescription: description || `${campaignName} - Subscription billing`,
      xEmail: member?.email || "",
    });

    console.log("Processing payment via Cardknox cc:sale");
    const response = await fetch("https://x1.cardknox.com/gatewayjson", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: paymentData.toString(),
    });

    const result = await response.json();
    console.log("Cardknox payment response:", result);

    if (result.xResult !== "A") {
      return new Response(
        JSON.stringify({ 
          error: result.xError || "Payment declined",
          declineReason: result.xError,
          result: result.xResult 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Payment approved - create invoice with status "paid"
    const { data: invoice, error: invoiceError } = await supabaseAdmin
      .from("invoices")
      .insert({
        organization_id: organizationId,
        member_id: memberId,
        invoice_number: invoiceNumber,
        status: "paid",
        paid_at: new Date().toISOString(),
        subtotal: amount,
        total: amount,
        tax: 0,
        campaign_id: subscription.campaign_id,
        notes: `Subscription billing - ${campaignName}`,
      })
      .select()
      .single();

    if (invoiceError) {
      console.error("Error creating invoice:", invoiceError);
      // Payment went through but invoice creation failed - log but don't fail
    }

    // Create invoice item
    if (invoice) {
      await supabaseAdmin
        .from("invoice_items")
        .insert({
          invoice_id: invoice.id,
          description: `${campaignName} - ${subscription.frequency} payment`,
          quantity: 1,
          unit_price: amount,
          total: amount,
        });
    }

    // Create payment record
    const { error: paymentError } = await supabaseAdmin
      .from("payments")
      .insert({
        organization_id: organizationId,
        member_id: memberId,
        invoice_id: invoice?.id || null,
        amount: amount,
        payment_method: "card",
        processor: processorType,
        processor_transaction_id: result.xRefNum,
        notes: `Auto-charge for ${campaignName}`,
      });

    if (paymentError) {
      console.error("Error recording payment:", paymentError);
    }

    // Update subscription - increment installments_paid and update next_billing_date
    const updateData: Record<string, unknown> = {};

    if (subscription.payment_type === "installments" && subscription.installments_total) {
      const newInstallmentsPaid = (subscription.installments_paid || 0) + 1;
      updateData.installments_paid = newInstallmentsPaid;

      // If all installments paid, mark as inactive
      if (newInstallmentsPaid >= subscription.installments_total) {
        updateData.is_active = false;
      }
    }

    // Calculate next billing date based on frequency
    const currentDate = new Date();
    let nextDate = new Date(subscription.next_billing_date || currentDate);

    switch (subscription.frequency) {
      case "daily":
        nextDate.setDate(nextDate.getDate() + 1);
        break;
      case "weekly":
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      case "monthly":
      case "monthly_hebrew":
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
      case "quarterly":
        nextDate.setMonth(nextDate.getMonth() + 3);
        break;
      case "annual":
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        break;
    }

    updateData.next_billing_date = nextDate.toISOString().split("T")[0];

    await supabaseAdmin
      .from("subscriptions")
      .update(updateData)
      .eq("id", subscriptionId);

    return new Response(
      JSON.stringify({
        success: true,
        transactionId: result.xRefNum,
        invoiceId: invoice?.id,
        invoiceNumber: invoiceNumber,
        message: "Payment processed successfully",
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
