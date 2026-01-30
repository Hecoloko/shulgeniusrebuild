import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface DonationRequest {
    organizationId: string;
    campaignId: string;
    amount: number;
    memberId?: string;
    donorName?: string;
    donorEmail?: string;
    isAnonymous?: boolean;
    notes?: string;
    // Card details (if not using saved method)
    cardToken?: string;
    cardNumber?: string;
    cardExp?: string;
    cardCvc?: string;
    zipCode?: string;
    // Saved method
    paymentMethodId?: string;
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", {
            status: 200,
            headers: corsHeaders
        });
    }

    try {
        const body: DonationRequest = await req.json();
        const {
            organizationId,
            campaignId,
            amount,
            memberId,
            donorName,
            donorEmail,
            isAnonymous,
            notes,
            cardToken,
            cardNumber,
            cardExp,
            cardCvc,
            zipCode,
            paymentMethodId,
        } = body;

        console.log(`Processing donation: amount=${amount}, org=${organizationId}, campaign=${campaignId}`);

        const supabaseAdmin = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
            { auth: { autoRefreshToken: false, persistSession: false } }
        );

        // 1. Get Processor Credentials
        let transactionKey: string | null = null;
        let finalProcessor = "cardknox";

        // A. Check if campaign has a specific primary processor
        const { data: campaignProcessor } = await supabaseAdmin
            .from("campaign_processors")
            .select(`
                processor:payment_processors(
                    credentials,
                    processor_type
                )
            `)
            .eq("campaign_id", campaignId)
            .eq("is_primary", true)
            .maybeSingle();

        const campaignCreds = (campaignProcessor?.processor as any)?.credentials;
        if (campaignCreds?.transaction_key) {
            transactionKey = campaignCreds.transaction_key.trim();
            finalProcessor = (campaignProcessor?.processor as any)?.processor_type || "cardknox";
            console.log("Using campaign-specific processor");
        } else {
            // B. Fallback to org settings (legacy)
            const { data: settings } = await supabaseAdmin
                .from("organization_settings")
                .select("cardknox_transaction_key")
                .eq("organization_id", organizationId)
                .single();

            if (settings?.cardknox_transaction_key) {
                transactionKey = settings.cardknox_transaction_key.trim();
                console.log("Using organization default processor from settings");
            } else {
                // C. Fallback to default processor for the org in payment_processors table
                const { data: defaultProcessor } = await supabaseAdmin
                    .from("payment_processors")
                    .select("credentials, processor_type")
                    .eq("organization_id", organizationId)
                    .eq("is_default", true)
                    .maybeSingle();

                if (defaultProcessor?.credentials) {
                    transactionKey = (defaultProcessor.credentials as any).transaction_key?.trim() || null;
                    finalProcessor = defaultProcessor.processor_type || "cardknox";
                    console.log("Using organization default processor from payment_processors table");
                }
            }
        }

        if (!transactionKey) {
            throw new Error("Payment processor not configured for this campaign or organization");
        }

        // 2. Determine Payment Source (Token vs Card)
        let chargeToken = cardToken;

        if (paymentMethodId) {
            const { data: pm } = await supabaseAdmin
                .from("payment_methods")
                .select("*")
                .eq("id", paymentMethodId)
                .single();

            if (pm) {
                chargeToken = pm.processor_payment_method_id;
                finalProcessor = pm.processor || finalProcessor;
            }
        }

        // 3. Process Payment via Gateway (Cardknox/Sola)
        const invoiceNumber = `DON-${Date.now().toString(36).toUpperCase()}`;
        const payload: Record<string, any> = {
            xKey: transactionKey,
            xVersion: "5.0.0",
            xSoftwareName: "ShulGenius",
            xSoftwareVersion: "1.0",
            xCommand: "cc:sale",
            xAmount: amount.toFixed(2),
            xInvoice: invoiceNumber,
            xDescription: `Donation to campaign ${campaignId}`,
        };

        if (chargeToken) {
            payload.xToken = chargeToken;
        } else if (cardNumber) {
            payload.xCardNum = cardNumber;
            payload.xExp = cardExp;
            payload.xCVV = cardCvc;
            payload.xZip = zipCode;
        } else {
            throw new Error("Missing payment information");
        }

        console.log(`Sending payment to ${finalProcessor} gateway...`);
        const gatewayUrl = "https://x1.cardknox.com/gatewayjson";
        const response = await fetch(gatewayUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        const result = await response.json();
        console.log(`${finalProcessor} response:`, result.xResult);

        if (result.xResult !== "A") {
            return new Response(
                JSON.stringify({ success: false, error: result.xError || "Payment declined" }),
                { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // 4. Record Donation
        const { data: donation, error: donationError } = await supabaseAdmin
            .from("donations")
            .insert({
                organization_id: organizationId,
                campaign_id: campaignId,
                member_id: memberId || null,
                donor_name: donorName || (isAnonymous ? "Anonymous" : null),
                donor_email: donorEmail || null,
                amount: amount,
                is_anonymous: isAnonymous || false,
                payment_method: "card",
                processor: finalProcessor,
                processor_transaction_id: result.xRefNum,
                notes: notes || null,
            })
            .select()
            .single();

        if (donationError) {
            console.error("Error recording donation record:", donationError);
        }

        // 5. Update Campaign Raised Amount
        const { data: campaign } = await supabaseAdmin
            .from("campaigns")
            .select("raised_amount")
            .eq("id", campaignId)
            .single();

        await supabaseAdmin
            .from("campaigns")
            .update({
                raised_amount: (campaign?.raised_amount || 0) + amount,
                updated_at: new Date().toISOString()
            })
            .eq("id", campaignId);

        return new Response(
            JSON.stringify({
                success: true,
                transactionId: result.xRefNum,
                donationId: donation?.id,
                message: "Donation processed successfully",
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (err: any) {
        console.error("Critical donation error:", err);
        return new Response(
            JSON.stringify({ success: false, error: err.message }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
