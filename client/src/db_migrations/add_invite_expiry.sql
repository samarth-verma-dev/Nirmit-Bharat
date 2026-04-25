-- Run this in your Supabase SQL Editor to add the expires_at column to the invites table

ALTER TABLE invites
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

-- Optional: index for fast lookups by email + invite_code
CREATE INDEX IF NOT EXISTS idx_invites_code_email
  ON invites (invite_code, email);
