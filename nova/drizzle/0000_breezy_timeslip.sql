CREATE TABLE `chapters` (
	`id` text PRIMARY KEY NOT NULL,
	`project` text NOT NULL,
	`title` text NOT NULL,
	`content` text DEFAULT '' NOT NULL,
	`position` integer NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`words` integer DEFAULT 0 NOT NULL,
	`updated` text NOT NULL,
	FOREIGN KEY (`project`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `chapters_project_position` ON `chapters` (`project`,`position`);--> statement-breakpoint
CREATE TABLE `chunks` (
	`id` text PRIMARY KEY NOT NULL,
	`source` text NOT NULL,
	`position` integer NOT NULL,
	`content` text NOT NULL,
	`search` text NOT NULL,
	FOREIGN KEY (`source`) REFERENCES `sources`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `chunks_source_position` ON `chunks` (`source`,`position`);--> statement-breakpoint
CREATE TABLE `memories` (
	`id` text PRIMARY KEY NOT NULL,
	`project` text NOT NULL,
	`kind` text NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`date` text DEFAULT '' NOT NULL,
	`updated` text NOT NULL,
	FOREIGN KEY (`project`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `memories_project` ON `memories` (`project`);--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`title` text NOT NULL,
	`kind` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`goal` integer DEFAULT 50000 NOT NULL,
	`style` text DEFAULT '' NOT NULL,
	`sample` text DEFAULT '' NOT NULL,
	`archived` integer DEFAULT 0 NOT NULL,
	`created` text NOT NULL,
	`updated` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `projects_owner_updated` ON `projects` (`owner`,`updated`);--> statement-breakpoint
CREATE TABLE `revisions` (
	`id` text PRIMARY KEY NOT NULL,
	`chapter` text NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`version` integer NOT NULL,
	`words` integer NOT NULL,
	`created` text NOT NULL,
	FOREIGN KEY (`chapter`) REFERENCES `chapters`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `revisions_chapter_version` ON `revisions` (`chapter`,`version`);--> statement-breakpoint
CREATE TABLE `sources` (
	`id` text PRIMARY KEY NOT NULL,
	`project` text NOT NULL,
	`title` text NOT NULL,
	`author` text DEFAULT '' NOT NULL,
	`url` text DEFAULT '' NOT NULL,
	`object_key` text NOT NULL,
	`filename` text NOT NULL,
	`bytes` integer NOT NULL,
	`created` text NOT NULL,
	FOREIGN KEY (`project`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `sources_project` ON `sources` (`project`);