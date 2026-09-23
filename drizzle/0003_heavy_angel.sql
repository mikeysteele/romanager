CREATE TABLE `system_firmware` (
	`id` text PRIMARY KEY NOT NULL,
	`system_id` text NOT NULL,
	`filename` text NOT NULL,
	`description` text,
	`path` text NOT NULL,
	`md5` text,
	`crc32` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`system_id`) REFERENCES `systems`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `system_firmware_path_unique` ON `system_firmware` (`path`);