-- ============================================
-- CUSTOM TRADE ITEMS LIBRARY
-- Reusable trade line items that Blake has used
-- before and wants to pick from on future quotes.
-- ============================================
CREATE TABLE custom_trades (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  trade_name text NOT NULL,
  default_cost numeric(12,2),
  category text,
  notes text,
  usage_count integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_custom_trades_active ON custom_trades(active);
CREATE INDEX idx_custom_trades_usage ON custom_trades(usage_count DESC);

CREATE TRIGGER custom_trades_updated_at
  BEFORE UPDATE ON custom_trades
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE custom_trades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on custom_trades" ON custom_trades FOR ALL USING (true) WITH CHECK (true);
