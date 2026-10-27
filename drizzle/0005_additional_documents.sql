ALTER TABLE `checklist_requirements` ADD `source` text DEFAULT 'template' NOT NULL;--> statement-breakpoint
ALTER TABLE `checklist_requirements` ADD `description` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `documents` ADD `title` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `documents` ADD `category` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `documents` ADD `description` text DEFAULT '' NOT NULL;