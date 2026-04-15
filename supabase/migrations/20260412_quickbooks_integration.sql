-- QuickBooks OAuth tokens (singleton row — only one QBO company connected)
CREATE TABLE IF NOT EXISTS quickbooks_tokens (
  id                       uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  access_token             text NOT NULL,
  refresh_token            text NOT NULL,
  realm_id                 text NOT NULL,
  expires_at               timestamptz NOT NULL,
  refresh_token_expires_at timestamptz NOT NULL,
  created_at               timestamptz DEFAULT now(),
  updated_at               timestamptz DEFAULT now()
);

-- Maps local records to their QuickBooks counterparts
CREATE TABLE IF NOT EXISTS quickbooks_entity_map (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type text NOT NULL,  -- 'customer' | 'vendor' | 'invoice' | 'bill'
  local_id    uuid NOT NULL,
  qbo_id      text NOT NULL,
  realm_id    text NOT NULL,
  synced_at   timestamptz DEFAULT now(),
  UNIQUE (entity_type, local_id, realm_id)
);

-- Auto-update updated_at on quickbooks_tokens
CREATE OR REPLACE FUNCTION update_quickbooks_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_quickbooks_tokens_updated_at
  BEFORE UPDATE ON quickbooks_tokens
  FOR EACH ROW EXECUTE FUNCTION update_quickbooks_tokens_updated_at();
