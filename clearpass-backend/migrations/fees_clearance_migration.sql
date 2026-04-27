-- ================================================================
-- fees_clearance_migration.sql
-- Adds fee approval columns to clearance_requests
-- Run with: node run_fees_migration.js
-- ================================================================

ALTER TABLE clearance_requests
  ADD COLUMN IF NOT EXISTS fee_status      VARCHAR(20) DEFAULT 'pending'
    CHECK (fee_status IN ('pending', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS fee_remarks     TEXT,
  ADD COLUMN IF NOT EXISTS fee_approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS fee_approved_at TIMESTAMP;
