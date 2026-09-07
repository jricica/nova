CREATE TABLE `author_profiles` (
	`owner` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`confirmed` text,
	`updated` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `author_samples` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`title` text NOT NULL,
	`kind` text NOT NULL,
	`object_key` text NOT NULL,
	`words` integer NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `author_samples_owner` ON `author_samples` (`owner`);