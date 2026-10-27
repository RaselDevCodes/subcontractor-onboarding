CREATE TABLE `notification_outbox` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`recipient` text NOT NULL,
	`subject` text NOT NULL,
	`body` text NOT NULL,
	`status` text DEFAULT 'queued' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`last_error` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	`sent_at` text
);
--> statement-breakpoint
CREATE TABLE `signature_events` (
	`event_hash` text PRIMARY KEY NOT NULL,
	`provider_document_id` text NOT NULL,
	`event_type` text NOT NULL,
	`event_time` integer NOT NULL,
	`received_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `signature_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`template_key` text NOT NULL,
	`template_name` text NOT NULL,
	`provider_document_id` text,
	`signer_name` text NOT NULL,
	`signer_email` text NOT NULL,
	`status` text DEFAULT 'creating' NOT NULL,
	`test_mode` integer DEFAULT 1 NOT NULL,
	`signed_object_key` text,
	`created_by` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`completed_at` text,
	`last_event` text,
	`last_error` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `signature_requests_provider_doc_unique` ON `signature_requests` (`provider_document_id`);