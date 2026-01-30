import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Heart, CreditCard, Lock, Loader2 } from "lucide-react";
import { getProcessorIdsForCampaign } from "@/lib/payment-router";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface DonateModalProps {
    campaign: {
        id: string;
        name: string;
        organization_id: string;
        campaign_processors?: any[];
    } | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    memberId?: string;
    initialMemberData?: {
        first_name: string;
        last_name: string;
        email: string;
    };
}

export function DonateModal({ campaign, open, onOpenChange, memberId, initialMemberData }: DonateModalProps) {
    const queryClient = useQueryClient();
    const [amount, setAmount] = useState("");
    const [isAnonymous, setIsAnonymous] = useState(false);
    const [donorName, setDonorName] = useState(initialMemberData ? `${initialMemberData.first_name} ${initialMemberData.last_name}` : "");
    const [donorEmail, setDonorEmail] = useState(initialMemberData?.email || "");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Card details
    const [cardNumber, setCardNumber] = useState("");
    const [expiry, setExpiry] = useState("");
    const [cvc, setCvc] = useState("");
    const [zipCode, setZipCode] = useState("");
    const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<string | "new">("new");

    // Fetch saved payment methods if memberId is provided
    const { data: allPaymentMethods } = useQuery({
        queryKey: ["member-payment-methods", memberId],
        queryFn: async () => {
            if (!memberId) return [];
            const { data, error } = await supabase
                .from("payment_methods")
                .select("*")
                .eq("member_id", memberId);
            if (error) throw error;
            return data || [];
        },
        enabled: !!memberId && open,
    });

    // Fetch all processors for this organization to identify the default
    const { data: orgProcessors, isLoading: orgProcessorsLoading } = useQuery({
        queryKey: ["org-processors", campaign?.organization_id],
        queryFn: async () => {
            if (!campaign?.organization_id) return [];
            const { data, error } = await supabase
                .from("payment_processors")
                .select("*")
                .eq("organization_id", campaign.organization_id)
                .eq("is_active", true);
            if (error) throw error;
            return data || [];
        },
        enabled: !!campaign?.organization_id && open,
    });

    // Explicitly fetch processor IDs for this campaign for filtering
    const { data: campaignProcessorIds, isLoading: campaignProcessorsLoading } = useQuery({
        queryKey: ["campaign-processor-ids", campaign?.id],
        queryFn: async () => {
            if (!campaign?.id) return [];
            return getProcessorIdsForCampaign(campaign.id);
        },
        enabled: !!campaign?.id && open,
    });

    // Filter payment methods based on campaign processors
    const paymentMethods = useMemo(() => {
        if (!allPaymentMethods) return [];

        // While loading processor info, don't show any cards
        if (campaignProcessorsLoading || orgProcessorsLoading) {
            return [];
        }

        const allowedProcessorIds = campaignProcessorIds || [];

        // If we have specific processors for this campaign
        if (allowedProcessorIds.length > 0) {
            return allPaymentMethods.filter(pm =>
                pm.processor_id && allowedProcessorIds.includes(pm.processor_id)
            );
        }

        // Fallback to organization default
        const defaultProcessor = orgProcessors?.find(p => p.is_default);
        if (defaultProcessor) {
            return allPaymentMethods.filter(pm => pm.processor_id === defaultProcessor.id);
        }

        // Final fallback: show all (legacy)
        return allPaymentMethods;
    }, [allPaymentMethods, campaignProcessorIds, campaignProcessorsLoading, orgProcessors, orgProcessorsLoading]);

    // Effect to select default payment method
    useEffect(() => {
        // If current selection is NOT in the filtered list, reset to "new" or a valid default
        if (selectedPaymentMethodId !== "new") {
            const isStillValid = paymentMethods.some(pm => pm.id === selectedPaymentMethodId);
            if (!isStillValid) {
                if (paymentMethods.length > 0) {
                    const defaultPm = paymentMethods.find(pm => pm.is_default) || paymentMethods[0];
                    setSelectedPaymentMethodId(defaultPm.id);
                } else {
                    setSelectedPaymentMethodId("new");
                }
            }
        } else if (paymentMethods.length > 0) {
            // If currently on "new" but we have valid cards, pick the default one
            const defaultPm = paymentMethods.find(pm => pm.is_default) || paymentMethods[0];
            setSelectedPaymentMethodId(defaultPm.id);
        }
    }, [paymentMethods, selectedPaymentMethodId, open]);

    // Reset form when modal closes
    useEffect(() => {
        if (!open) {
            resetForm();
        }
    }, [open]);

    // Debugging logs
    useEffect(() => {
        if (open && campaign) {
            console.log(`[DonateModal] Campaign: ${campaign.name}`);
            console.log(`[DonateModal] Allowed IDs:`, campaignProcessorIds);
            console.log(`[DonateModal] Filtered count: ${paymentMethods.length} / Total: ${allPaymentMethods?.length}`);
            if (paymentMethods.length > 0) {
                console.log(`[DonateModal] Visible cards:`, paymentMethods.map(p => p.card_last_four));
            }
        }
    }, [open, campaign, campaignProcessorIds, paymentMethods, allPaymentMethods]);

    const handleDonate = async () => {
        if (!campaign || !amount || parseFloat(amount) <= 0) {
            toast.error("Please enter a valid amount");
            return;
        }

        if (!memberId && (!donorName || !donorEmail)) {
            toast.error("Please provide your name and email");
            return;
        }

        setIsSubmitting(true);
        try {
            const payload: any = {
                organizationId: campaign.organization_id,
                campaignId: campaign.id,
                amount: parseFloat(amount),
                memberId: memberId,
                donorName: donorName,
                donorEmail: donorEmail,
                isAnonymous: isAnonymous,
            };

            if (selectedPaymentMethodId === "new") {
                if (!cardNumber || !expiry || !cvc) {
                    throw new Error("Please enter your card details");
                }
                payload.cardNumber = cardNumber.replace(/\s/g, "");
                payload.cardExp = expiry.replace("/", "");
                payload.cardCvc = cvc;
                payload.zipCode = zipCode;
            } else {
                payload.paymentMethodId = selectedPaymentMethodId;
            }

            console.log("Invoking process-donation edge function");
            const { data, error } = await supabase.functions.invoke("process-donation", {
                body: payload,
            });

            if (error) throw error;
            if (!data.success) throw new Error(data.error || "Payment failed");

            toast.success("Thank you for your donation!");
            queryClient.invalidateQueries({ queryKey: ["public-campaign", campaign.id] });
            queryClient.invalidateQueries({ queryKey: ["campaigns"] });
            queryClient.invalidateQueries({ queryKey: ["donations"] });
            onOpenChange(false);
            resetForm();
        } catch (error: any) {
            console.error("Donation error:", error);
            toast.error(error.message || "Failed to process donation");
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetForm = () => {
        setAmount("");
        setCardNumber("");
        setExpiry("");
        setCvc("");
        setZipCode("");
        setIsSubmitting(false);
    };

    // Card formatting utilities
    const formatCardNumber = (value: string) => {
        const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
        const matches = v.match(/\d{4,16}/g);
        const match = (matches && matches[0]) || "";
        const parts = [];
        for (let i = 0, len = match.length; i < len; i += 4) {
            parts.push(match.substring(i, i + 4));
        }
        if (parts.length) {
            return parts.join(" ");
        }
        return v;
    };

    const formatExpiry = (value: string) => {
        const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
        if (v.length >= 2) {
            return v.substring(0, 2) + "/" + v.substring(2, 4);
        }
        return v;
    };

    const getCardBrand = (number: string) => {
        const v = number.replace(/\s+/g, "");
        if (v.startsWith("4")) return "visa";
        if (/^5[1-5]/.test(v)) return "mastercard";
        if (/^3[47]/.test(v)) return "amex";
        if (/^6(?:011|5)/.test(v)) return "discover";
        return "unknown";
    };

    const cardBrand = getCardBrand(cardNumber);

    if (!campaign) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                        <Heart className="h-6 w-6 text-primary" />
                    </div>
                    <DialogTitle className="text-center text-xl">Support {campaign.name}</DialogTitle>
                    <DialogDescription className="text-center">
                        Your contribution makes a difference in our community.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Amount Selection */}
                    <div className="space-y-3">
                        <Label>Donation Amount</Label>
                        <div className="grid grid-cols-3 gap-2">
                            {[18, 36, 100, 180, 500, 1000].map((val) => (
                                <Button
                                    key={val}
                                    variant={parseFloat(amount) === val ? "default" : "outline"}
                                    onClick={() => setAmount(val.toString())}
                                    className="font-mono"
                                    size="sm"
                                >
                                    ${val}
                                </Button>
                            ))}
                        </div>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                            <Input
                                type="number"
                                placeholder="Enter amount"
                                className="pl-7 font-mono"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                            />
                        </div>
                    </div>

                    {!memberId && (
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Name</Label>
                                <Input value={donorName} onChange={(e) => setDonorName(e.target.value)} placeholder="Full Name" />
                            </div>
                            <div className="space-y-2">
                                <Label>Email</Label>
                                <Input value={donorEmail} onChange={(e) => setDonorEmail(e.target.value)} placeholder="email@example.com" />
                            </div>
                        </div>
                    )}

                    {/* Payment Method Selection */}
                    {paymentMethods && paymentMethods.length > 0 && (
                        <div className="space-y-2">
                            <Label>Payment Method</Label>
                            <div className="space-y-2">
                                {paymentMethods.map((pm) => (
                                    <div
                                        key={pm.id}
                                        onClick={() => setSelectedPaymentMethodId(pm.id)}
                                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${selectedPaymentMethodId === pm.id ? "bg-primary/5 border-primary" : "hover:bg-muted"
                                            }`}
                                    >
                                        <CreditCard className="h-4 w-4" />
                                        <span className="text-sm font-medium">
                                            {pm.card_brand} •••• {pm.card_last_four}
                                        </span>
                                        {pm.is_default && <Badge variant="secondary" className="ml-auto text-[10px]">Default</Badge>}
                                    </div>
                                ))}
                                <div
                                    onClick={() => setSelectedPaymentMethodId("new")}
                                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${selectedPaymentMethodId === "new" ? "bg-primary/5 border-primary" : "hover:bg-muted"
                                        }`}
                                >
                                    <PlusIcon className="h-4 w-4" />
                                    <span className="text-sm font-medium">Use a new card</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* New Card Details */}
                    {selectedPaymentMethodId === "new" && (
                        <div className="space-y-4 pt-2">
                            <div className="space-y-2">
                                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Card Details</Label>
                                <div className="border rounded-lg p-3 space-y-3 bg-muted/20">
                                    <div className="relative">
                                        <Input
                                            placeholder="0000 0000 0000 0000"
                                            value={cardNumber}
                                            onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                                            maxLength={19}
                                            className="bg-background pr-10"
                                        />
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                            {cardBrand === "visa" && <img src="https://upload.wikimedia.org/wikipedia/commons/d/d6/Visa_2021.svg" className="h-4 w-auto" alt="Visa" />}
                                            {cardBrand === "mastercard" && <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" className="h-6 w-auto" alt="Mastercard" />}
                                            {cardBrand === "amex" && <img src="https://upload.wikimedia.org/wikipedia/commons/3/30/American_Express_logo.svg" className="h-6 w-auto" alt="Amex" />}
                                            {cardBrand === "discover" && <img src="https://upload.wikimedia.org/wikipedia/commons/5/57/Discover_Card_logo.svg" className="h-4 w-auto" alt="Discover" />}
                                            {cardBrand === "unknown" && <CreditCard className="h-4 w-4 text-muted-foreground" />}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-3">
                                        <Input
                                            placeholder="MM/YY"
                                            value={expiry}
                                            onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                                            maxLength={5}
                                            className="bg-background"
                                        />
                                        <Input
                                            placeholder="CVC"
                                            value={cvc}
                                            onChange={(e) => setCvc(e.target.value)}
                                            className="bg-background"
                                        />
                                        <Input
                                            placeholder="ZIP"
                                            value={zipCode}
                                            onChange={(e) => setZipCode(e.target.value)}
                                            className="bg-background"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="anonymous"
                            checked={isAnonymous}
                            onChange={(e) => setIsAnonymous(e.target.checked)}
                            className="rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <Label htmlFor="anonymous" className="text-sm text-muted-foreground cursor-pointer">
                            Keep my donation anonymous
                        </Label>
                    </div>
                </div>

                <DialogFooter className="flex-col sm:flex-col gap-2">
                    <Button
                        className="w-full"
                        size="lg"
                        disabled={isSubmitting || !amount}
                        onClick={handleDonate}
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Processing...
                            </>
                        ) : (
                            `Donate $${amount || "0"}`
                        )}
                    </Button>
                    <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
                        <Lock className="h-3 w-3" />
                        SECURE ENCRYPTED TRANSACTION
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function PlusIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M5 12h14" />
            <path d="M12 5v14" />
        </svg>
    );
}
