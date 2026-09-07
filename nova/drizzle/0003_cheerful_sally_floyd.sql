CREATE TABLE `pilot_feedback` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`data` text NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `pilot_feedback_owner` ON `pilot_feedback` (`owner`,`created`);