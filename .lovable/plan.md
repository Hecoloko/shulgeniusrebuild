

# Implementation Plan: Payment Architecture, Test Billing & Delete Subscription

## Summary

This plan implements the complete payment logic architecture including processor-based filtering for cards, switchboard routing for payments, default processor configuration, a Test Billing feature to process live subscription charges, and a Delete Subscription capability.

---

## Part 1: Payment Architecture Upgrade

### Current State Analysis

**What's Already Built:**
- `payment_processors` table: Stores multiple processor accounts with credentials (UUID-based)
- `campaign_processors` table: Links campaigns to specific processors (many-to-many)
- `payment_methods` table: Stores card tokens per member
- `AddCardModal`: Lets users select a processor when saving cards
- `AddSubscriptionModal`: Lets users toggle Auto CC vs Invoiced
- `FinancialTab`: Has a "Set Default" button for processors

**What Needs Work:**
1. `payment_methods.processor` stores a type string ("cardknox") instead of `processor_id` UUID
2. Subscription modal doesn't filter cards by campaign's processor
3. Invoice creation doesn't route to the correct processor
4. No dedicated "Default Processor" display in Financial Settings

---

### Step 1: Database Migration - Add `processor_id` to `payment_methods`

Add a new `processor_id` column (UUID) to the `payment_methods` table that references the actual processor account used when the card was saved.

```text
+-----------------------+          +---------------------+
| payment_methods       |          | payment_processors  |
+-----------------------+          +---------------------+
| id (uuid)             |          | id (uuid)           |
| member_id             |          | organization_id     |
| processor (text) -----+-legacy   | name                |
| processor_id (uuid) --+--NEW---→ | processor_type      |
| processor_customer_id |          | credentials         |
| card_last_four        |          | is_default          |
+-----------------------+          +---------------------+
```

**Migration SQL:**
- Add `processor_id` column (nullable initially for backward compatibility)
- Create a foreign key reference to `payment_processors.id`
- Create index for faster lookups

---

### Step 2: Database Migration - Add `campaign_id` to `invoices`

Add `campaign_id` column to the invoices table so the payment router knows which processor to use for settlement.

---

### Step 3: Update Card Saving Flow

**File: `supabase/functions/cardknox-customer/index.ts`**
- Already receives `processorId` parameter
- Update to save `processor_id` (UUID) to `payment_methods` instead of just the type string

**File: `src/components/members/AddCardModal.tsx`**
- Already selects processor by ID
- No changes needed (already passing `processorId`)

---

### Step 4: Update Subscription Modal - Filter Cards by Campaign Processor

**File: `src/components/members/AddSubscriptionModal.tsx`**

When "Auto CC" is selected:
1. Fetch the selected campaign's linked processors from `campaign_processors`
2. Filter payment methods to only show cards saved with matching `processor_id`
3. If no matching cards exist, show a message: "No cards available for this campaign's processor"

```text
User Flow:
┌─────────────────────────────────────────────────────────┐
│ Add Subscription                                        │
├─────────────────────────────────────────────────────────┤
│ Campaign: [Kol Nidre Appeal ▼]  ← Uses Cardknox Acct A  │
│ Amount: [$500]                                          │
│ Payment Type: [Recurring] [Installments]                │
│ Billing Method: [Invoiced] [●Auto CC]                   │
│                                                         │
│ Select Card:                                            │
│ ┌─────────────────────────────────────────────────┐    │
│ │ Visa •••• 4242 (Cardknox Acct A) ← SHOWN       │    │
│ │ Amex •••• 1234 (Stripe Live)     ← HIDDEN      │    │
│ └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

---

### Step 5: Invoice Payment Routing (Switchboard Logic)

**File: `src/components/invoices/CreateInvoiceModal.tsx`**

Changes:
- Save the selected campaign when creating invoice
- When paying invoice, use campaign's processor (or org default if no override)

**New Helper Function: `src/lib/payment-router.ts`**

```text
Input: campaign_id, organization_id
Logic:
  1. Check if campaign has specific processor(s) in campaign_processors
  2. If yes → return primary processor for that campaign
  3. If no → return organization's default processor
Output: processor credentials and type
```

---

### Step 6: Financial Settings - Default Processor UI Enhancement

**File: `src/components/settings/FinancialTab.tsx`**

Enhancements:
- Add a visual indicator showing which processor is the current default
- Add a card/section at the top: "Default Processor: [Processor Name]"
- This default is used for campaigns without a specific processor override

---

## Part 2: Test Billing Button for Subscriptions

### Overview

Add a "Test Billing" button to each subscription in the member's Subscriptions tab. When clicked, it will:

1. Process a real charge via Cardknox using the subscription's linked payment method
2. Create an invoice marked as "paid"
3. Record a payment entry linked to the invoice
4. Update the subscription tracking (installments_paid, next_billing_date)
5. The transaction will appear in the Cardknox portal as an approved transaction
6. Dashboard stats will reflect the new payment in real-time

---

### Step 7: Create Edge Function - `process-payment`

**File: `supabase/functions/process-payment/index.ts`**

A new backend function that handles charging a card via Cardknox and records the transaction.

**Actions:**
- Accept: `subscriptionId`, `memberId`, `organizationId`, `amount`, `description`
- Look up the subscription's payment method and processor credentials
- Call Cardknox API with `xCommand: cc:sale` using the stored token
- If successful:
  - Create invoice with status "paid"
  - Create payment record linked to invoice
  - Update subscription `installments_paid` if applicable
  - Update `next_billing_date`
- Return transaction result

**Cardknox API Call Structure:**
```text
POST https://x1.cardknox.com/gatewayjson
Content-Type: application/x-www-form-urlencoded

xKey: [transaction_key]
xVersion: 5.0.0
xSoftwareName: ShulGenius
xSoftwareVersion: 1.0.0
xCommand: cc:sale
xToken: [stored_card_token]
xAmount: [amount]
xInvoice: [invoice_number]
xDescription: [subscription description]
xEmail: [member_email]
```

**Success Response from Cardknox:**
- `xResult: "A"` = Approved
- `xRefNum` = Transaction reference number (save to `processor_transaction_id`)

---

### Step 8: Update Subscription Display in MemberDetail

**File: `src/pages/MemberDetail.tsx`**

Add a "Test Billing" button to each subscription row (visible only for "Auto CC" subscriptions with a linked payment method).

**UI Changes:**
```text
+-------------------------------------------------------------------+
| Kol Nidre Appeal                              |                   |
| $500.00 - Monthly - 2/12 paid                 |[Test Billing] [Delete] [Auto CC] [Active]|
+-------------------------------------------------------------------+
```

**Button Logic:**
- Only show "Test Billing" for subscriptions where `billing_method === "auto_cc"` AND `payment_method_id` exists
- On click: Call the new `process-payment` edge function
- Show loading state while processing
- Show success/error toast based on result
- Invalidate queries to refresh invoices, payments, and member data

---

### Step 9: Invoice Generation Logic

When a test billing is processed, an invoice is automatically created:

**Invoice Fields:**
- `organization_id`: From subscription
- `member_id`: From subscription
- `invoice_number`: Auto-generated (e.g., `SUB-{timestamp}`)
- `status`: "paid" (immediately, since payment is successful)
- `paid_at`: Current timestamp
- `subtotal/total`: Subscription amount
- `notes`: "Subscription billing - [Campaign Name]"

---

### Step 10: Payment Recording

When charge is approved, a payment record is created:

**Payment Fields:**
- `organization_id`: From subscription
- `member_id`: From subscription
- `invoice_id`: Newly created invoice ID
- `amount`: Charged amount
- `payment_method`: "card"
- `processor`: "cardknox" (or from processor type)
- `processor_transaction_id`: Cardknox `xRefNum`
- `notes`: "Auto-charge for [Campaign Name]"

---

### Step 11: Subscription Update

After successful billing:
- Increment `installments_paid` (if payment type is "installments")
- Update `next_billing_date` based on frequency
- If `installments_paid >= installments_total`, set `is_active = false`

---

## Part 3: Delete Subscription Button

### Overview

Add a "Delete" button to each subscription row with a confirmation dialog to prevent accidental deletions.

---

### Step 12: Add Delete Button and Confirmation Dialog

**File: `src/pages/MemberDetail.tsx`**

**UI Changes:**
- Add a `Trash2` icon button next to each subscription row
- When clicked, show a confirmation dialog asking "Are you sure you want to delete this subscription?"
- Include subscription details in the dialog (campaign name, amount) for context

**Confirmation Dialog:**
```text
┌──────────────────────────────────────────────┐
│ Delete Subscription                          │
├──────────────────────────────────────────────┤
│ Are you sure you want to delete this         │
│ subscription?                                │
│                                              │
│ Campaign: Kol Nidre Appeal                   │
│ Amount: $500.00 / Monthly                    │
│                                              │
│ This action cannot be undone.                │
│                                              │
│              [Cancel]  [Delete]              │
└──────────────────────────────────────────────┘
```

---

### Step 13: Delete Mutation

**File: `src/pages/MemberDetail.tsx`**

Add a mutation to handle subscription deletion:

```typescript
const deleteSubscriptionMutation = useMutation({
  mutationFn: async (subscriptionId: string) => {
    const { error } = await supabase
      .from("subscriptions")
      .delete()
      .eq("id", subscriptionId);
    if (error) throw error;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["member-subscriptions", memberId] });
    toast.success("Subscription deleted successfully");
  },
  onError: (err: Error) => {
    toast.error("Failed to delete subscription: " + err.message);
  },
});
```

**RLS Verification:**
The `subscriptions` table already has an RLS policy "Admins can manage subscriptions" with `ALL` command permission, which includes DELETE operations for org admins.

---

## Data Flow Diagram

```text
User clicks "Test Billing"
        |
        v
+------------------+
| Frontend         |
| - Loading state  |
| - Call edge fn   |
+------------------+
        |
        v
+------------------+
| Edge Function    |
| process-payment  |
+------------------+
        |
        +-- Fetch subscription + payment method
        |
        +-- Get processor credentials
        |
        v
+------------------+
| Cardknox API     |
| cc:sale          |
+------------------+
        |
        v
   [Approved?]
        |
   Yes  |  No
        v   \
+--------+   +---> Return error
|        |
v        v
+------------------------+
| 1. Create Invoice      |
|    (status: paid)      |
+------------------------+
        |
        v
+------------------------+
| 2. Create Payment      |
|    (linked to invoice) |
+------------------------+
        |
        v
+------------------------+
| 3. Update Subscription |
|    - installments_paid |
|    - next_billing_date |
+------------------------+
        |
        v
+------------------+
| Return Success   |
| {transactionId,  |
|  invoiceId}      |
+------------------+
        |
        v
+------------------+
| Frontend         |
| - Toast success  |
| - Refresh data   |
+------------------+


User clicks "Delete"
        |
        v
+------------------------+
| Confirmation Dialog    |
| "Are you sure?"        |
+------------------------+
        |
   [Confirm?]
        |
   Yes  |  No
        v   \
+--------+   +---> Close dialog
|        |
v        
+------------------------+
| Delete from DB         |
| subscriptions.delete() |
+------------------------+
        |
        v
+------------------------+
| Invalidate queries     |
| Toast success          |
+------------------------+
```

---

## Files Summary

| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/xxx_add_processor_id.sql` | Create | Add `processor_id` to `payment_methods` |
| `supabase/migrations/xxx_add_campaign_to_invoices.sql` | Create | Add `campaign_id` to `invoices` |
| `supabase/functions/cardknox-customer/index.ts` | Modify | Save `processor_id` to payment_methods |
| `supabase/functions/process-payment/index.ts` | Create | Edge function to charge card and record transaction |
| `supabase/config.toml` | Modify | Add `[functions.process-payment]` config |
| `src/components/members/AddSubscriptionModal.tsx` | Modify | Filter cards by campaign's processor |
| `src/components/invoices/CreateInvoiceModal.tsx` | Modify | Save `campaign_id` to invoice |
| `src/components/settings/FinancialTab.tsx` | Modify | Display current default processor prominently |
| `src/lib/payment-router.ts` | Create | Helper to get processor for campaign |
| `src/pages/MemberDetail.tsx` | Modify | Add "Test Billing" and "Delete" buttons to subscription rows |

---

## Error Handling

1. **No payment method linked:** Show tooltip "No card linked to this subscription"
2. **Cardknox declined:** Show error toast with decline reason
3. **Processor not configured:** Show error toast asking to configure processor
4. **Network error:** Show retry option
5. **No matching cards for campaign processor:** Show message in dropdown
6. **Delete failed:** Show error toast with reason

---

## Testing Checklist

After implementation:
1. Add a card to a member, selecting a specific processor - verify `processor_id` is saved correctly
2. Create a campaign and link it to that processor
3. Add a subscription with "Auto CC" - verify only matching cards appear in dropdown
4. Create an invoice with that campaign - verify `campaign_id` is saved
5. Change the default processor in Financial Settings - verify it updates
6. Click "Test Billing" button on a subscription
7. Verify transaction appears in Cardknox portal as "Approved"
8. Verify invoice appears in member's Invoices tab with "Paid" status
9. Verify payment appears in payments list
10. Verify dashboard "Revenue This Month" updates correctly
11. Verify subscription's `installments_paid` increments (if installments type)
12. Click "Delete" on a subscription - verify confirmation dialog appears
13. Confirm deletion - verify subscription is removed from the list
14. Verify toast success message appears

---

## Deferred Items

- **Stripe Integration**: Will be implemented in a future iteration
- **Invoice Payment UI**: The actual "Pay by Card" flow for invoices (showing processor selection based on campaign)

