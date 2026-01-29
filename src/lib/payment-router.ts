import { supabase } from "@/integrations/supabase/client";

interface ProcessorInfo {
  id: string;
  name: string;
  processorType: string;
  credentials: Record<string, unknown>;
  isDefault: boolean;
}

/**
 * Get the appropriate processor for a campaign or organization
 * Priority: Campaign-specific processor > Organization default processor
 */
export async function getProcessorForCampaign(
  campaignId: string | null,
  organizationId: string
): Promise<ProcessorInfo | null> {
  // If campaign has specific processors, use the primary one
  if (campaignId) {
    const { data: campaignProcessor } = await supabase
      .from("campaign_processors")
      .select("processor_id, is_primary, payment_processors(*)")
      .eq("campaign_id", campaignId)
      .eq("is_primary", true)
      .maybeSingle();

    if (campaignProcessor?.payment_processors) {
      const processor = campaignProcessor.payment_processors as {
        id: string;
        name: string;
        processor_type: string;
        credentials: Record<string, unknown>;
        is_default: boolean;
      };
      return {
        id: processor.id,
        name: processor.name,
        processorType: processor.processor_type,
        credentials: processor.credentials,
        isDefault: processor.is_default,
      };
    }

    // If no primary, get any campaign processor
    const { data: anyProcessor } = await supabase
      .from("campaign_processors")
      .select("processor_id, payment_processors(*)")
      .eq("campaign_id", campaignId)
      .limit(1)
      .maybeSingle();

    if (anyProcessor?.payment_processors) {
      const processor = anyProcessor.payment_processors as {
        id: string;
        name: string;
        processor_type: string;
        credentials: Record<string, unknown>;
        is_default: boolean;
      };
      return {
        id: processor.id,
        name: processor.name,
        processorType: processor.processor_type,
        credentials: processor.credentials,
        isDefault: processor.is_default,
      };
    }
  }

  // Fallback to organization's default processor
  const { data: defaultProcessor } = await supabase
    .from("payment_processors")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("is_default", true)
    .eq("is_active", true)
    .maybeSingle();

  if (defaultProcessor) {
    return {
      id: defaultProcessor.id,
      name: defaultProcessor.name,
      processorType: defaultProcessor.processor_type,
      credentials: defaultProcessor.credentials as Record<string, unknown>,
      isDefault: defaultProcessor.is_default,
    };
  }

  // If no default, get any active processor
  const { data: anyProcessor } = await supabase
    .from("payment_processors")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (anyProcessor) {
    return {
      id: anyProcessor.id,
      name: anyProcessor.name,
      processorType: anyProcessor.processor_type,
      credentials: anyProcessor.credentials as Record<string, unknown>,
      isDefault: anyProcessor.is_default,
    };
  }

  return null;
}

/**
 * Get all processor IDs linked to a campaign
 */
export async function getProcessorIdsForCampaign(
  campaignId: string
): Promise<string[]> {
  const { data } = await supabase
    .from("campaign_processors")
    .select("processor_id")
    .eq("campaign_id", campaignId);

  return data?.map((cp) => cp.processor_id) || [];
}
