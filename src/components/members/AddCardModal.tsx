import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { toast } from "sonner";
import { CreditCard, Lock, Loader2 } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Member {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface AddCardModalProps {
  member: Member | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddCardModal({ member, open, onOpenChange }: AddCardModalProps) {
  const { orgId } = useCurrentOrg();
  const queryClient = useQueryClient();

  const [selectedProcessorId, setSelectedProcessorId] = useState<string>("");
  const [cardNickname, setCardNickname] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch payment processors for the org
  const { data: processors, isLoading: processorsLoading } = useQuery({
    queryKey: ["payment-processors", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from("payment_processors")
        .select("*")
        .eq("organization_id", orgId)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!orgId && open,
  });

  // Filter to only cardknox/sola processors
  const cardProcessors = processors?.filter(
    (p) => p.processor_type === "cardknox" || p.processor_type === "sola"
  );

  const resetForm = () => {
    setSelectedProcessorId("");
    setCardNickname("");
    setCardNumber("");
    setExpiry("");
    setCvc("");
    setZipCode("");
    setIsDefault(false);
  };

  const handleClose = (openState: boolean) => {
    if (!openState) {
      resetForm();
    }
    onOpenChange(openState);
  };

  // Format card number with spaces
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
    return value;
  };

  // Format expiry as MM/YY
  const formatExpiry = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    if (v.length >= 2) {
      return v.substring(0, 2) + "/" + v.substring(2, 4);
    }
    return v;
  };

  const handleSaveCard = async () => {
    if (!member || !orgId || !selectedProcessorId) {
      toast.error("Please select a payment processor");
      return;
    }

    const cleanCardNumber = cardNumber.replace(/\s/g, "");
    if (cleanCardNumber.length < 13 || cleanCardNumber.length > 19) {
      toast.error("Invalid card number");
      return;
    }

    const expiryParts = expiry.split("/");
    if (expiryParts.length !== 2 || expiryParts[0].length !== 2 || expiryParts[1].length !== 2) {
      toast.error("Invalid expiry date (use MM/YY)");
      return;
    }

    if (cvc.length < 3 || cvc.length > 4) {
      toast.error("Invalid CVC");
      return;
    }

    setIsSubmitting(true);

    try {
      const selectedProcessor = cardProcessors?.find((p) => p.id === selectedProcessorId);
      if (!selectedProcessor) {
        throw new Error("Processor not found");
      }

      // Get session for auth
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Not authenticated");
      }

      // Call edge function to save card
      const cardExpMMYY = expiryParts[0] + expiryParts[1]; // Convert MM/YY to MMYY

      const response = await supabase.functions.invoke("cardknox-customer", {
        body: {
          action: "save_card",
          organizationId: orgId,
          memberId: member.id,
          memberEmail: member.email,
          memberName: `${member.first_name} ${member.last_name}`,
          processorId: selectedProcessorId,
          // Note: In production, you'd tokenize via iFields first
          // For now, we pass the card data to be tokenized server-side
          cardNumber: cleanCardNumber,
          cardExp: cardExpMMYY,
          cardCvc: cvc,
          zipCode: zipCode,
          isDefault: isDefault,
          nickname: cardNickname || null,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to save card");
      }

      if (!response.data?.success) {
        throw new Error(response.data?.error || "Failed to save card");
      }

      toast.success("Card saved successfully");
      queryClient.invalidateQueries({ queryKey: ["member-payment-methods", member.id] });
      handleClose(false);
    } catch (error: any) {
      console.error("Error saving card:", error);
      toast.error(error.message || "Failed to save card");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Card</DialogTitle>
          <DialogDescription>
            Securely save a credit card for future payments.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Payment Processor Selection */}
          <div className="space-y-2">
            <Label>Payment Processor</Label>
            <Select value={selectedProcessorId} onValueChange={setSelectedProcessorId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a payment processor" />
              </SelectTrigger>
              <SelectContent>
                {processorsLoading ? (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">Loading...</div>
                ) : cardProcessors?.length === 0 ? (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                    No card processors configured
                  </div>
                ) : (
                  cardProcessors?.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} ({p.processor_type})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Card Nickname */}
          <div className="space-y-2">
            <Label>Card Nickname (Optional)</Label>
            <Input
              placeholder="e.g. Corporate Visa"
              value={cardNickname}
              onChange={(e) => setCardNickname(e.target.value)}
            />
          </div>

          {/* Card Details */}
          <div className="border rounded-lg p-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground text-sm">Card Number</Label>
              <div className="relative">
                <Input
                  placeholder="0000 0000 0000 0000"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                  maxLength={19}
                  className="pr-10"
                />
                <CreditCard className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground text-sm">Expires</Label>
                <Input
                  placeholder="MM/YY"
                  value={expiry}
                  onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                  maxLength={5}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground text-sm">CVC</Label>
                <div className="relative">
                  <Input
                    placeholder="123"
                    value={cvc}
                    onChange={(e) => setCvc(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    maxLength={4}
                    className="pr-10"
                  />
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground text-sm">ZIP Code</Label>
              <Input
                placeholder="12345"
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value.replace(/\D/g, "").slice(0, 10))}
                maxLength={10}
              />
            </div>
          </div>

          {/* Default toggle */}
          <div className="flex items-center justify-between">
            <Label htmlFor="default-card" className="cursor-pointer">
              Set as default payment method
            </Label>
            <Switch
              id="default-card"
              checked={isDefault}
              onCheckedChange={setIsDefault}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSaveCard} disabled={isSubmitting || !selectedProcessorId}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Card
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
