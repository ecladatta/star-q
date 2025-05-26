-- Enable extensions for fuzzy string matching
CREATE EXTENSION IF NOT EXISTS fuzzystrmatch;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Verify extensions are installed
SELECT extname FROM pg_extension WHERE extname IN ('fuzzystrmatch', 'pg_trgm');