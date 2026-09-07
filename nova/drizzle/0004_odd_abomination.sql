CREATE TABLE `auth_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `auth_sessions` (
	`token` text PRIMARY KEY NOT NULL,
	`user` text NOT NULL,
	`expires` integer NOT NULL,
	`created` integer NOT NULL,
	FOREIGN KEY (`user`) REFERENCES `auth_users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `auth_sessions_user` ON `auth_sessions` (`user`);--> statement-breakpoint
CREATE TABLE `auth_users` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text,
	`password` text,
	`name` text NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`chatgpt` text,
	`recovery` text,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `auth_users_username_unique` ON `auth_users` (`username`);--> statement-breakpoint
CREATE UNIQUE INDEX `auth_users_chatgpt_unique` ON `auth_users` (`chatgpt`);