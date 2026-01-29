-- Rename Cardknox columns to better reflect Cardknox terminology
ALTER TABLE public.organization_settings 
  RENAME COLUMN cardknox_account_id TO cardknox_ifields_key;

ALTER TABLE public.organization_settings 
  RENAME COLUMN cardknox_api_key TO cardknox_transaction_key;