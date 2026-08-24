ALTER TABLE "corpus" ADD COLUMN "settings" jsonb DEFAULT '{}'::jsonb NOT NULL;
