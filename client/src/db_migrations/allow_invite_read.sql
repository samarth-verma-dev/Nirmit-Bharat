-- Run this in your Supabase SQL Editor to allow employees to validate their invites

CREATE POLICY "Allow public read access to invites"
ON invites
FOR SELECT
USING (true);
