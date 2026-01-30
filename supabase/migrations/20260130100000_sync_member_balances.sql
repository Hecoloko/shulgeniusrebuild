-- Migration to add automatic member balance synchronization
-- Created: 2026-01-30

-- 1. Create function to recalculate a specific member's balance
CREATE OR REPLACE FUNCTION public.calculate_member_balance(target_member_id UUID)
RETURNS DECIMAL(10, 2)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    total_invoiced DECIMAL(10, 2);
    total_paid DECIMAL(10, 2);
BEGIN
    -- Sum all sent/overdue/paid invoices
    SELECT COALESCE(SUM(total), 0)
    INTO total_invoiced
    FROM public.invoices
    WHERE member_id = target_member_id
      AND status IN ('sent', 'overdue', 'paid');

    -- Sum all payments
    SELECT COALESCE(SUM(amount), 0)
    INTO total_paid
    FROM public.payments
    WHERE member_id = target_member_id;

    RETURN GREATEST(0, total_invoiced - total_paid);
END;
$$;

-- 2. Create function to be called by triggers
CREATE OR REPLACE FUNCTION public.sync_member_balance_trigger_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    target_member_id UUID;
BEGIN
    -- Determine which member to update
    IF (TG_OP = 'DELETE') THEN
        target_member_id := OLD.member_id;
    ELSE
        target_member_id := NEW.member_id;
    END IF;

    -- Update member balance
    UPDATE public.members
    SET balance = public.calculate_member_balance(target_member_id),
        updated_at = now()
    WHERE id = target_member_id;

    -- If it's an update and member_id changed (rare but possible), update the old member too
    IF (TG_OP = 'UPDATE' AND OLD.member_id IS DISTINCT FROM NEW.member_id) THEN
        UPDATE public.members
        SET balance = public.calculate_member_balance(OLD.member_id),
            updated_at = now()
        WHERE id = OLD.member_id;
    END IF;

    RETURN NULL;
END;
$$;

-- 3. Create triggers on invoices table
DROP TRIGGER IF EXISTS on_invoice_change_balance_sync ON public.invoices;
CREATE TRIGGER on_invoice_change_balance_sync
AFTER INSERT OR UPDATE OR DELETE ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.sync_member_balance_trigger_fn();

-- 4. Create triggers on payments table
DROP TRIGGER IF EXISTS on_payment_change_balance_sync ON public.payments;
CREATE TRIGGER on_payment_change_balance_sync
AFTER INSERT OR UPDATE OR DELETE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.sync_member_balance_trigger_fn();

-- 5. Initialize existing balances
DO $$
DECLARE
    m RECORD;
BEGIN
    FOR m IN SELECT id FROM public.members LOOP
        UPDATE public.members
        SET balance = public.calculate_member_balance(m.id)
        WHERE id = m.id;
    END LOOP;
END;
$$;
