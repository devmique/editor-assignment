-- QUICK FIX: Drop old tables and recreate with fixed schema
-- Run this ENTIRE script in Supabase SQL Editor if you already created the old tables

-- Drop existing tables (safe order: shares first, then documents, then profiles)
DROP TABLE IF EXISTS document_shares CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Now run the full schema
-- Copy everything from supabase/schema.sql and run it
