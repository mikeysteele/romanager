ALTER TABLE "systems" ADD COLUMN "emulatable" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "systems" ADD COLUMN "emulator_core" text;