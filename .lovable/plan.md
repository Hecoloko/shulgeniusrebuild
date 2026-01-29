
# Invoice & Payment Improvements Plan

This plan addresses five enhancements to the invoicing and payment system:

1. **Record Payment modal improvements** - Match the payment UI from the reference image
2. **Partially-paid invoice status** - Track and display partial payments
3. **Record Payment button state change** - Gray "PAID" when invoice is fully paid
4. **Card display improvements** - Show nickname, last 4 digits, and delete option

---

## Overview of Changes

### 1. Database Schema Changes
- Add `partially_paid` to the `invoice_status` enum
- Add `nickname` column to `payment_methods` table

### 2. Frontend Changes

#### RecordPaymentModal Improvements
- Add payment processor recommendation banner (like in your reference image)
- Enhance the Sola/Cardknox tab with full card entry form including:
  - Card Number field
  - Exp. Date, CVV, ZIP Code fields
  - Cardholder Name field
  - "Secure payment processing powered by Cardknox" footer
- Connect to the cardknox-customer edge function for processing

#### Invoice Partial Payment Logic
- Calculate actual balance by summing existing payments for the invoice
- When recording a payment:
  - If payment amount < remaining balance: set status to `partially_paid`
  - If payment amount >= remaining balance: set status to `paid`
- Display paid amount in InvoiceDetailModal

#### Record Payment Button State
- In InvoiceDetailModal: Change the green "Record Payment" button to a gray "PAID" button when invoice status is `paid`
- Disable click functionality when paid

#### Card Display Improvements
- Show card nickname (if set) in the card display
- Display format: "Nickname - Visa ****1234" or just "Visa ****1234" if no nickname
- Add delete button with confirmation dialog
- Create mutation to delete payment methods

---

## Technical Details

### Database Migration

```sql
-- Add partially_paid to invoice_status enum
ALTER TYPE invoice_status ADD VALUE 'partially_paid';

-- Add nickname column to payment_methods
ALTER TABLE payment_methods ADD COLUMN nickname TEXT;
```

### File Changes

#### `src/components/invoices/RecordPaymentModal.tsx`
- Add balance calculation using existing payments query
- Update mutation logic to set `partially_paid` vs `paid` based on total payments
- Enhance Sola tab with card input form matching the reference image
- Add processor recommendation banner

#### `src/components/invoices/InvoiceDetailModal.tsx`
- Fetch payments for the invoice to calculate actual paid amount
- Conditionally render "Record Payment" (green) or "PAID" (gray disabled) based on status
- Display paid amount in totals section

#### `src/pages/MemberDetail.tsx`
- Update card display to show nickname + last 4 digits
- Add delete button with trash icon on each card
- Add confirmation dialog for deletion
- Add delete mutation

#### `src/components/members/AddCardModal.tsx`
- Ensure nickname is saved to database (already collects it, but need to save it)

#### `supabase/functions/cardknox-customer/index.ts`
- Add nickname to the database insert

### UI Component Changes

**Card Display (new format):**
```
| Corporate Visa - •••• 1234     [Default] [🗑] |
| Expires 12/2031                              |
```

**Invoice Status Badges:**
- `draft` - Gray
- `sent` - Blue/Gray
- `partially_paid` - Orange/Yellow (new)
- `paid` - Green
- `overdue` - Red
- `void` - Gray strikethrough

**Record Payment Button States:**
- Unpaid invoice: Green "Record Payment" button with DollarSign icon
- Paid invoice: Gray "PAID" button, disabled

---

## Implementation Order

1. Run database migration to add `partially_paid` status and `nickname` column
2. Update `cardknox-customer` edge function to save nickname
3. Update `RecordPaymentModal` with enhanced UI and partial payment logic
4. Update `InvoiceDetailModal` with payment tracking and button state
5. Update `MemberDetail.tsx` cards section with improved display and delete
6. Test end-to-end flow

---

## Summary

| Change | Files Affected |
|--------|----------------|
| Add `partially_paid` status | Database migration |
| Add `nickname` column | Database migration |
| Record Payment modal UI | `RecordPaymentModal.tsx` |
| Partial payment logic | `RecordPaymentModal.tsx`, `InvoiceDetailModal.tsx` |
| Button state change | `InvoiceDetailModal.tsx` |
| Card display + delete | `MemberDetail.tsx` |
| Save nickname | `cardknox-customer/index.ts`, `AddCardModal.tsx` |
