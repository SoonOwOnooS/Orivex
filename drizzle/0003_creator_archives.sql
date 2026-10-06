CREATE TABLE `archive_activity` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `archive_activity_user_time` ON `archive_activity` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `archive_items` (
	`id` text PRIMARY KEY NOT NULL,
	`game_id` text NOT NULL,
	`kind` text NOT NULL,
	`title` text NOT NULL,
	`body` text DEFAULT '' NOT NULL,
	`url` text NOT NULL,
	`credit` text DEFAULT '' NOT NULL,
	`category` text DEFAULT '' NOT NULL,
	`occurred_on` text DEFAULT '' NOT NULL,
	`author_id` text NOT NULL,
	`author_name` text NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`removed` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `archive_game_kind` ON `archive_items` (`game_id`,`kind`,`created_at`);--> statement-breakpoint
CREATE TABLE `archive_related_games` (
	`item_id` text NOT NULL,
	`game_id` text NOT NULL,
	FOREIGN KEY (`item_id`) REFERENCES `archive_items`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `archive_related_unique` ON `archive_related_games` (`item_id`,`game_id`);--> statement-breakpoint
CREATE INDEX `archive_related_game` ON `archive_related_games` (`game_id`);--> statement-breakpoint
CREATE TABLE `archive_revisions` (
	`id` text PRIMARY KEY NOT NULL,
	`item_id` text NOT NULL,
	`revision` integer NOT NULL,
	`snapshot` text NOT NULL,
	`reason` text NOT NULL,
	`display_name` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`item_id`) REFERENCES `archive_items`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `archive_revision_unique` ON `archive_revisions` (`item_id`,`revision`);--> statement-breakpoint
CREATE TABLE `archive_votes` (
	`id` text PRIMARY KEY NOT NULL,
	`item_id` text NOT NULL,
	`revision` integer NOT NULL,
	`user_id` text NOT NULL,
	`display_name` text NOT NULL,
	`verdict` text NOT NULL,
	`reason` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`item_id`) REFERENCES `archive_items`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `archive_vote_unique` ON `archive_votes` (`item_id`,`revision`,`user_id`);--> statement-breakpoint
ALTER TABLE `games` ADD `series` text DEFAULT '' NOT NULL;
--> statement-breakpoint
-- Move existing registration sources into the new public timeline.
INSERT INTO archive_items (id,game_id,kind,title,body,url,category,occurred_on,author_id,author_name,created_at,updated_at)
SELECT 'announcement:'||id,id,'evidence',title,substr(description,1,2000),source_url,'showcase',announced,created_by,'Member',created_at,created_at
FROM games WHERE announced<>'';
--> statement-breakpoint
INSERT INTO archive_items (id,game_id,kind,title,body,url,category,occurred_on,author_id,author_name,created_at,updated_at)
SELECT 'release:'||id,id,'evidence',title,substr(description,1,2000),source_url,'release',published,created_by,'Member',created_at,created_at
FROM games WHERE published<>'';
--> statement-breakpoint
INSERT INTO archive_revisions (id,item_id,revision,snapshot,reason,display_name,created_at)
SELECT 'initial:'||id,id,1,json_object('kind',kind,'game_id',game_id,'title',title,'body',body,'url',url,'category',category,'occurred_on',occurred_on),'首次收录',author_name,created_at
FROM archive_items;
