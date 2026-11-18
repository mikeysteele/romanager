CREATE TABLE `system_firmware_files` (
	`id` text PRIMARY KEY NOT NULL,
	`firmware_id` text NOT NULL,
	`rel_path` text NOT NULL,
	`path` text NOT NULL,
	`filename` text NOT NULL,
	`size` integer NOT NULL,
	`sha1` text,
	`md5` text,
	`crc32` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`firmware_id`) REFERENCES `system_firmware`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `system_firmware_files_firmware_id_idx` ON `system_firmware_files` (`firmware_id`);--> statement-breakpoint
CREATE INDEX `system_firmware_files_path_idx` ON `system_firmware_files` (`path`);--> statement-breakpoint
ALTER TABLE `system_firmware` ADD `name` text;--> statement-breakpoint
ALTER TABLE `system_firmware` ADD `total_size` integer;