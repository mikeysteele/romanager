CREATE TABLE IF NOT EXISTS `file_type_whitelist` (
	`id` text PRIMARY KEY NOT NULL,
	`extension` text NOT NULL,
	`magic_number` text,
	`description` text,
	`enabled` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `rom_files` (
	`id` text PRIMARY KEY NOT NULL,
	`rom_id` text NOT NULL,
	`rel_path` text NOT NULL,
	`path` text NOT NULL,
	`filename` text NOT NULL,
	`size` integer NOT NULL,
	`sha1` text,
	`md5` text,
	`crc32` text,
	`role` text DEFAULT 'launch' NOT NULL,
	`mtime` integer,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`rom_id`) REFERENCES `roms`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `rom_files_rom_id_idx` ON `rom_files` (`rom_id`);--> statement-breakpoint
CREATE INDEX `rom_files_path_idx` ON `rom_files` (`path`);--> statement-breakpoint
CREATE TABLE `scanned_set_files` (
	`id` text PRIMARY KEY NOT NULL,
	`set_id` text NOT NULL,
	`rel_path` text NOT NULL,
	`path` text NOT NULL,
	`filename` text NOT NULL,
	`size` integer NOT NULL,
	`sha1` text,
	`md5` text,
	`crc32` text,
	`role` text DEFAULT 'launch' NOT NULL,
	`mtime` integer,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`set_id`) REFERENCES `scanned_sets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `scanned_set_files_set_id_idx` ON `scanned_set_files` (`set_id`);--> statement-breakpoint
CREATE INDEX `scanned_set_files_path_idx` ON `scanned_set_files` (`path`);--> statement-breakpoint
CREATE TABLE `scanned_sets` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`set_type` text DEFAULT 'single' NOT NULL,
	`base_path` text NOT NULL,
	`launch_file` text NOT NULL,
	`total_size` integer DEFAULT 0 NOT NULL,
	`set_hash` text,
	`status` text DEFAULT 'complete' NOT NULL,
	`ignored` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `scanned_sets_ignored_idx` ON `scanned_sets` (`ignored`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_roms` (
	`id` text PRIMARY KEY NOT NULL,
	`game_id` text,
	`system_id` text,
	`name` text,
	`set_type` text DEFAULT 'single' NOT NULL,
	`base_path` text,
	`launch_file` text DEFAULT '' NOT NULL,
	`filename` text NOT NULL,
	`path` text,
	`size` integer DEFAULT 0 NOT NULL,
	`total_size` integer DEFAULT 0 NOT NULL,
	`set_hash` text,
	`status` text DEFAULT 'complete' NOT NULL,
	`region` text,
	`crc32` text,
	`md5` text,
	`sha1` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`pending_delete` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`system_id`) REFERENCES `systems`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_roms`("id", "game_id", "system_id", "filename", "path", "size", "total_size", "region", "crc32", "md5", "created_at", "updated_at", "pending_delete") SELECT "id", "game_id", "system_id", "filename", "path", "size", "size", "region", "crc32", "md5", "created_at", "created_at", "pending_delete" FROM `roms`;--> statement-breakpoint
DROP TABLE `roms`;--> statement-breakpoint
ALTER TABLE `__new_roms` RENAME TO `roms`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `roms_game_id_idx` ON `roms` (`game_id`);--> statement-breakpoint
CREATE INDEX `roms_system_id_idx` ON `roms` (`system_id`);--> statement-breakpoint
CREATE INDEX `roms_pending_delete_idx` ON `roms` (`pending_delete`);--> statement-breakpoint
ALTER TABLE `scanned_files` ADD `set_id` text;--> statement-breakpoint
ALTER TABLE `scanned_files` ADD `set_type` text DEFAULT 'single';--> statement-breakpoint
ALTER TABLE `scanned_files` ADD `role` text DEFAULT 'launch';--> statement-breakpoint
ALTER TABLE `scanned_files` ADD `status` text DEFAULT 'complete';--> statement-breakpoint
ALTER TABLE `scanned_files` ADD `sha1` text;--> statement-breakpoint
ALTER TABLE `scanned_files` ADD `md5` text;--> statement-breakpoint
ALTER TABLE `scanned_files` ADD `crc32` text;--> statement-breakpoint
CREATE INDEX `scanned_files_ignored_idx` ON `scanned_files` (`ignored`);--> statement-breakpoint
CREATE INDEX `scanned_files_set_id_idx` ON `scanned_files` (`set_id`);--> statement-breakpoint
ALTER TABLE `system_firmware` ADD `sha1` text;--> statement-breakpoint
ALTER TABLE `system_firmware` ADD `updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL;--> statement-breakpoint
CREATE INDEX `system_firmware_system_id_idx` ON `system_firmware` (`system_id`);--> statement-breakpoint
ALTER TABLE `systems` ADD `es_folder` text;--> statement-breakpoint
CREATE INDEX `game_platforms_platform_id_idx` ON `game_platforms` (`platform_id`);