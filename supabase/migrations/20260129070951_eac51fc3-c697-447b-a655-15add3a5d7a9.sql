-- Add partially_paid to invoice_status enum
ALTER TYPE invoice_status ADD VALUE 'partially_paid';

-- Add nickname column to payment_methods
ALTER TABLE payment_methods ADD COLUMN nickname TEXT;