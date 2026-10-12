ALTER TABLE "app_settings" ADD COLUMN "password_signup_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "app_settings" ADD COLUMN "oauth_signup_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
UPDATE "app_settings" SET "password_signup_enabled" = "signup_enabled", "oauth_signup_enabled" = "signup_enabled";--> statement-breakpoint
ALTER TABLE "app_settings" DROP COLUMN "signup_enabled";