-- Reviewers a creator trusts on one bounty. They can comment on its submission threads and see its review tools.
-- They never pick winners (only the creator's wallet can call approveWinners) and no money is attached to the role.
CREATE TABLE IF NOT EXISTS bounty_reviewers (
  bounty_id UUID NOT NULL REFERENCES bounties(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  wallet VARCHAR(42) NOT NULL,
  added_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (bounty_id, user_id)
);
CREATE INDEX IF NOT EXISTS ix_bounty_reviewers_user ON bounty_reviewers (user_id);
