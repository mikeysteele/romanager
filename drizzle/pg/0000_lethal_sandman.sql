CREATE TABLE "api_keys" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"prefix" text NOT NULL,
	"key_hash" text NOT NULL,
	"scope" text DEFAULT 'device' NOT NULL,
	"device_id" text,
	"created_at" text DEFAULT CURRENT_TIMESTAMP::text NOT NULL,
	"last_used_at" text,
	"revoked_at" text,
	CONSTRAINT "api_keys_key_hash_unique" UNIQUE("key_hash")
);
--> statement-breakpoint
CREATE TABLE "device_profiles" (
	"device_id" text PRIMARY KEY NOT NULL,
	"region_preference" text DEFAULT 'USA,EUR,JPN' NOT NULL,
	"one_rom_per_game" boolean DEFAULT false NOT NULL,
	"include_firmware" boolean DEFAULT true NOT NULL,
	"updated_at" text DEFAULT CURRENT_TIMESTAMP::text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "devices" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"preset" text DEFAULT 'batocera' NOT NULL,
	"storage_budget_bytes" bigint,
	"last_seen_at" text,
	"last_sync_at" text,
	"agent_version" text,
	"last_report" text,
	"created_at" text DEFAULT CURRENT_TIMESTAMP::text NOT NULL,
	"updated_at" text DEFAULT CURRENT_TIMESTAMP::text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "file_type_whitelist" (
	"id" text PRIMARY KEY NOT NULL,
	"extension" text NOT NULL,
	"magic_number" text,
	"description" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" text DEFAULT CURRENT_TIMESTAMP::text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "game_platforms" (
	"game_id" text NOT NULL,
	"platform_id" text NOT NULL,
	CONSTRAINT "game_platforms_game_id_platform_id_pk" PRIMARY KEY("game_id","platform_id")
);
--> statement-breakpoint
CREATE TABLE "games" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"background_image" text,
	"released" text,
	"rating" integer,
	"created_at" text DEFAULT CURRENT_TIMESTAMP::text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platforms" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	CONSTRAINT "platforms_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "profile_rules" (
	"id" text PRIMARY KEY NOT NULL,
	"device_id" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"kind" text NOT NULL,
	"target_id" text NOT NULL,
	"created_at" text DEFAULT CURRENT_TIMESTAMP::text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rom_files" (
	"id" text PRIMARY KEY NOT NULL,
	"rom_id" text NOT NULL,
	"rel_path" text NOT NULL,
	"path" text NOT NULL,
	"filename" text NOT NULL,
	"size" bigint NOT NULL,
	"sha1" text,
	"md5" text,
	"crc32" text,
	"role" text DEFAULT 'launch' NOT NULL,
	"mtime" bigint,
	"created_at" text DEFAULT CURRENT_TIMESTAMP::text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roms" (
	"id" text PRIMARY KEY NOT NULL,
	"game_id" text,
	"system_id" text,
	"name" text,
	"set_type" text DEFAULT 'single' NOT NULL,
	"base_path" text,
	"launch_file" text DEFAULT '' NOT NULL,
	"filename" text NOT NULL,
	"path" text,
	"size" bigint DEFAULT 0 NOT NULL,
	"total_size" bigint DEFAULT 0 NOT NULL,
	"set_hash" text,
	"status" text DEFAULT 'complete' NOT NULL,
	"region" text,
	"crc32" text,
	"md5" text,
	"sha1" text,
	"created_at" text DEFAULT CURRENT_TIMESTAMP::text NOT NULL,
	"updated_at" text DEFAULT CURRENT_TIMESTAMP::text NOT NULL,
	"pending_delete" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "save_files" (
	"id" text PRIMARY KEY NOT NULL,
	"device_id" text NOT NULL,
	"system_id" text,
	"relative_path" text NOT NULL,
	"current_sha1" text,
	"updated_at" text DEFAULT CURRENT_TIMESTAMP::text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "save_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"save_file_id" text NOT NULL,
	"sha1" text NOT NULL,
	"size" bigint NOT NULL,
	"device_mtime" text,
	"stored_path" text NOT NULL,
	"created_at" text DEFAULT CURRENT_TIMESTAMP::text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scanned_files" (
	"id" text PRIMARY KEY NOT NULL,
	"path" text NOT NULL,
	"filename" text NOT NULL,
	"size" bigint NOT NULL,
	"ignored" boolean DEFAULT false NOT NULL,
	"set_id" text,
	"set_type" text DEFAULT 'single',
	"role" text DEFAULT 'launch',
	"status" text DEFAULT 'complete',
	"sha1" text,
	"md5" text,
	"crc32" text,
	"created_at" text DEFAULT CURRENT_TIMESTAMP::text NOT NULL,
	CONSTRAINT "scanned_files_path_unique" UNIQUE("path")
);
--> statement-breakpoint
CREATE TABLE "scanned_set_files" (
	"id" text PRIMARY KEY NOT NULL,
	"set_id" text NOT NULL,
	"rel_path" text NOT NULL,
	"path" text NOT NULL,
	"filename" text NOT NULL,
	"size" bigint NOT NULL,
	"sha1" text,
	"md5" text,
	"crc32" text,
	"role" text DEFAULT 'launch' NOT NULL,
	"mtime" bigint,
	"created_at" text DEFAULT CURRENT_TIMESTAMP::text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scanned_sets" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"set_type" text DEFAULT 'single' NOT NULL,
	"base_path" text NOT NULL,
	"launch_file" text NOT NULL,
	"total_size" bigint DEFAULT 0 NOT NULL,
	"set_hash" text,
	"status" text DEFAULT 'complete' NOT NULL,
	"ignored" boolean DEFAULT false NOT NULL,
	"created_at" text DEFAULT CURRENT_TIMESTAMP::text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_firmware" (
	"id" text PRIMARY KEY NOT NULL,
	"system_id" text NOT NULL,
	"filename" text NOT NULL,
	"description" text,
	"path" text NOT NULL,
	"md5" text,
	"crc32" text,
	"sha1" text,
	"created_at" text DEFAULT CURRENT_TIMESTAMP::text NOT NULL,
	"updated_at" text DEFAULT CURRENT_TIMESTAMP::text NOT NULL,
	CONSTRAINT "system_firmware_path_unique" UNIQUE("path")
);
--> statement-breakpoint
CREATE TABLE "systems" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"path" text,
	"es_folder" text,
	CONSTRAINT "systems_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_profiles" ADD CONSTRAINT "device_profiles_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_platforms" ADD CONSTRAINT "game_platforms_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_platforms" ADD CONSTRAINT "game_platforms_platform_id_platforms_id_fk" FOREIGN KEY ("platform_id") REFERENCES "public"."platforms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_rules" ADD CONSTRAINT "profile_rules_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rom_files" ADD CONSTRAINT "rom_files_rom_id_roms_id_fk" FOREIGN KEY ("rom_id") REFERENCES "public"."roms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roms" ADD CONSTRAINT "roms_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roms" ADD CONSTRAINT "roms_system_id_systems_id_fk" FOREIGN KEY ("system_id") REFERENCES "public"."systems"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "save_files" ADD CONSTRAINT "save_files_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "save_versions" ADD CONSTRAINT "save_versions_save_file_id_save_files_id_fk" FOREIGN KEY ("save_file_id") REFERENCES "public"."save_files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scanned_set_files" ADD CONSTRAINT "scanned_set_files_set_id_scanned_sets_id_fk" FOREIGN KEY ("set_id") REFERENCES "public"."scanned_sets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_firmware" ADD CONSTRAINT "system_firmware_system_id_systems_id_fk" FOREIGN KEY ("system_id") REFERENCES "public"."systems"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "api_keys_prefix_idx" ON "api_keys" USING btree ("prefix");--> statement-breakpoint
CREATE INDEX "api_keys_device_id_idx" ON "api_keys" USING btree ("device_id");--> statement-breakpoint
CREATE INDEX "game_platforms_platform_id_idx" ON "game_platforms" USING btree ("platform_id");--> statement-breakpoint
CREATE INDEX "profile_rules_device_id_idx" ON "profile_rules" USING btree ("device_id");--> statement-breakpoint
CREATE INDEX "rom_files_rom_id_idx" ON "rom_files" USING btree ("rom_id");--> statement-breakpoint
CREATE INDEX "rom_files_path_idx" ON "rom_files" USING btree ("path");--> statement-breakpoint
CREATE INDEX "roms_game_id_idx" ON "roms" USING btree ("game_id");--> statement-breakpoint
CREATE INDEX "roms_system_id_idx" ON "roms" USING btree ("system_id");--> statement-breakpoint
CREATE INDEX "roms_pending_delete_idx" ON "roms" USING btree ("pending_delete");--> statement-breakpoint
CREATE INDEX "save_files_device_id_idx" ON "save_files" USING btree ("device_id");--> statement-breakpoint
CREATE INDEX "save_files_rel_path_idx" ON "save_files" USING btree ("relative_path");--> statement-breakpoint
CREATE INDEX "save_versions_save_file_id_idx" ON "save_versions" USING btree ("save_file_id");--> statement-breakpoint
CREATE INDEX "scanned_files_ignored_idx" ON "scanned_files" USING btree ("ignored");--> statement-breakpoint
CREATE INDEX "scanned_files_set_id_idx" ON "scanned_files" USING btree ("set_id");--> statement-breakpoint
CREATE INDEX "scanned_set_files_set_id_idx" ON "scanned_set_files" USING btree ("set_id");--> statement-breakpoint
CREATE INDEX "scanned_set_files_path_idx" ON "scanned_set_files" USING btree ("path");--> statement-breakpoint
CREATE INDEX "scanned_sets_ignored_idx" ON "scanned_sets" USING btree ("ignored");--> statement-breakpoint
CREATE INDEX "system_firmware_system_id_idx" ON "system_firmware" USING btree ("system_id");