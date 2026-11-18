-- An approved bounty whose listing text was edited afterwards is flagged, so an admin can look at the new text.
-- The bounty stays public: hiding live work would hurt contributors who are already working on it.
ALTER TABLE bounties ADD COLUMN IF NOT EXISTS listing_edited_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS ix_bounties_listing_edited ON bounties (listing_edited_at DESC) WHERE listing_edited_at IS NOT NULL;
