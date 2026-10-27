CREATE TABLE `checklist_requirements` (
	`id` text PRIMARY KEY NOT NULL,
	`checklist_id` text NOT NULL,
	`company_id` text NOT NULL,
	`business_type` text NOT NULL,
	`item_key` text NOT NULL,
	`title` text NOT NULL,
	`required` integer DEFAULT 1 NOT NULL,
	`status` text DEFAULT 'not_received' NOT NULL,
	`document_id` text,
	`review_note` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `checklist_requirement_company_type_key_unique` ON `checklist_requirements` (`company_id`,`business_type`,`item_key`);--> statement-breakpoint
CREATE TABLE `onboarding_checklists` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`business_type` text NOT NULL,
	`title` text NOT NULL,
	`documents_submitted_at` text,
	`completed_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `onboarding_checklist_company_type_unique` ON `onboarding_checklists` (`company_id`,`business_type`);--> statement-breakpoint
ALTER TABLE `documents` ADD `requirement_id` text;--> statement-breakpoint
ALTER TABLE `documents` ADD `review_note` text DEFAULT '' NOT NULL;