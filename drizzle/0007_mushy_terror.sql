CREATE TABLE `save_files` (
	`id` text PRIMARY KEY NOT NULL,
	`device_id` text NOT NULL,
	`system_id` text,
	`relative_path` text NOT NULL,
	`current_sha1` text,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`device_id`) REFERENCES `devices`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `save_files_device_id_idx` ON `save_files` (`device_id`);--> statement-breakpoint
CREATE INDEX `save_files_rel_path_idx` ON `save_files` (`relative_path`);--> statement-breakpoint
CREATE TABLE `save_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`save_file_id` text NOT NULL,
	`sha1` text NOT NULL,
	`size` integer NOT NULL,
	`device_mtime` text,
	`stored_path` text NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`save_file_id`) REFERENCES `save_files`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `save_versions_save_file_id_idx` ON `save_versions` (`save_file_id`);