ALTER TABLE `games` ADD `pending_delete` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `roms` ADD `pending_delete` integer DEFAULT false NOT NULL;