CREATE TABLE `credentialing_intakes` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`business_type` text NOT NULL,
	`service_area` text DEFAULT '' NOT NULL,
	`website` text DEFAULT '' NOT NULL,
	`credentialing_needs` text DEFAULT '' NOT NULL,
	`npi_status` text DEFAULT 'not_sure' NOT NULL,
	`organization_npi` text DEFAULT '' NOT NULL,
	`taxonomy` text DEFAULT '' NOT NULL,
	`current_stage` text DEFAULT 'not_started' NOT NULL,
	`target_date` text,
	`workflow_status` text DEFAULT 'new' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`submitted_by` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `credentialing_intakes_company_unique` ON `credentialing_intakes` (`company_id`);