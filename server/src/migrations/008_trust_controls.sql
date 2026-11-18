-- Trust controls (phase 1 of the trust and tasks proposal): reports, a link blocklist, saved bounties, per-bounty
-- access rules, automatic submission checks, and verified projects. None of it touches the contract or moves USDC.

-- ------------------------------------------------------------------------------
-- 1. Reports from signed-in users, reviewed by admins
-- ------------------------------------------------------------------------------
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('bounty', 'submission', 'profile', 'project')),
  target_id VARCHAR(80) NOT NULL,
  reason VARCHAR(30) NOT NULL CHECK (reason IN ('scam', 'spam', 'phishing', 'impersonation', 'plagiarism', 'inappropriate', 'other')),
  details VARCHAR(1000) NOT NULL DEFAULT '',
  status VARCHAR(12) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'actioned', 'dismissed')),
  admin_note VARCHAR(500) NOT NULL DEFAULT '',
  resolved_by VARCHAR(255),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- One open report per person per target, so a single account cannot flood the queue.
CREATE UNIQUE INDEX ux_reports_open ON reports (reporter_user_id, target_type, target_id) WHERE status = 'open';
CREATE INDEX ix_reports_status ON reports (status, created_at DESC);
CREATE INDEX ix_reports_target ON reports (target_type, target_id);

-- ------------------------------------------------------------------------------
-- 2. Domains that cannot be linked from bounties or submissions
-- ------------------------------------------------------------------------------
CREATE TABLE blocked_domains (
  domain VARCHAR(253) PRIMARY KEY,
  reason VARCHAR(200) NOT NULL DEFAULT '',
  created_by VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 3. Saved bounties
-- ------------------------------------------------------------------------------
CREATE TABLE saved_bounties (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bounty_id UUID NOT NULL REFERENCES bounties(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, bounty_id)
);
CREATE INDEX ix_saved_bounties_user ON saved_bounties (user_id, created_at DESC);

-- ------------------------------------------------------------------------------
-- 4. Who may attach notes to a submission. The contract cannot refuse a submission, so these rules decide whose
--    notes are shown: a submission without verified notes stays hidden.
-- ------------------------------------------------------------------------------
ALTER TABLE bounties
  ADD COLUMN min_account_age_days INTEGER NOT NULL DEFAULT 0 CHECK (min_account_age_days BETWEEN 0 AND 365),
  ADD COLUMN require_github BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN min_approved_submissions INTEGER NOT NULL DEFAULT 0 CHECK (min_approved_submissions BETWEEN 0 AND 50);

-- ------------------------------------------------------------------------------
-- 5. Automatic checks stored with each submission
-- ------------------------------------------------------------------------------
ALTER TABLE submissions
  ADD COLUMN checks JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN text_fingerprint VARCHAR(64);
CREATE INDEX ix_submissions_fingerprint ON submissions (text_fingerprint) WHERE text_fingerprint IS NOT NULL;

-- ------------------------------------------------------------------------------
-- 6. Verified projects: the owner proves control of the GitHub repository
-- ------------------------------------------------------------------------------
ALTER TABLE projects
  ADD COLUMN verification_token VARCHAR(40),
  ADD COLUMN verified_at TIMESTAMPTZ,
  ADD COLUMN verified_by VARCHAR(200);
