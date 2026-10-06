CREATE TABLE `comparisons` (
	`id` text PRIMARY KEY NOT NULL,
	`a_id` text NOT NULL,
	`b_id` text NOT NULL,
	`author_id` text NOT NULL,
	`author_name` text NOT NULL,
	`note` text NOT NULL,
	`analysis` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`a_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`b_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `comparison_created` ON `comparisons` (`created_at`);--> statement-breakpoint
CREATE INDEX `comparison_author_time` ON `comparisons` (`author_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `games` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`developer` text NOT NULL,
	`published` text DEFAULT '' NOT NULL,
	`announced` text DEFAULT '' NOT NULL,
	`source_url` text NOT NULL,
	`description` text NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `game_title_source` ON `games` (`title`,`source_url`);--> statement-breakpoint
CREATE INDEX `games_created` ON `games` (`created_at`);--> statement-breakpoint
CREATE TABLE `responses` (
	`id` text PRIMARY KEY NOT NULL,
	`comparison_id` text NOT NULL,
	`user_id` text NOT NULL,
	`display_name` text NOT NULL,
	`body` text NOT NULL,
	`source_url` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`comparison_id`) REFERENCES `comparisons`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `response_comparison_time` ON `responses` (`comparison_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `review_history` (
	`id` text PRIMARY KEY NOT NULL,
	`comparison_id` text NOT NULL,
	`user_id` text NOT NULL,
	`display_name` text NOT NULL,
	`verdict` text NOT NULL,
	`reason` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`comparison_id`) REFERENCES `comparisons`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `history_comparison_time` ON `review_history` (`comparison_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`comparison_id` text NOT NULL,
	`user_id` text NOT NULL,
	`display_name` text NOT NULL,
	`verdict` text NOT NULL,
	`reason` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`comparison_id`) REFERENCES `comparisons`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `one_review_per_account` ON `reviews` (`comparison_id`,`user_id`);