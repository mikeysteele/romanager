CREATE TABLE "system_firmware_files" (
	"id" text PRIMARY KEY NOT NULL,
	"firmware_id" text NOT NULL,
	"rel_path" text NOT NULL,
	"path" text NOT NULL,
	"filename" text NOT NULL,
	"size" bigint NOT NULL,
	"sha1" text,
	"md5" text,
	"crc32" text,
	"created_at" text DEFAULT CURRENT_TIMESTAMP::text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "system_firmware" ADD COLUMN "name" text;--> statement-breakpoint
ALTER TABLE "system_firmware" ADD COLUMN "total_size" bigint;--> statement-breakpoint
ALTER TABLE "system_firmware_files" ADD CONSTRAINT "system_firmware_files_firmware_id_system_firmware_id_fk" FOREIGN KEY ("firmware_id") REFERENCES "public"."system_firmware"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "system_firmware_files_firmware_id_idx" ON "system_firmware_files" USING btree ("firmware_id");--> statement-breakpoint
CREATE INDEX "system_firmware_files_path_idx" ON "system_firmware_files" USING btree ("path");