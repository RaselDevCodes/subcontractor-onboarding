import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const companies = sqliteTable("companies", {
  id: text("id").primaryKey(), name: text("name").notNull(), type: text("type").notNull(), status: text("status").notNull().default("active"), createdAt: text("created_at").notNull(),
});
export const memberships = sqliteTable("memberships", {
  id: text("id").primaryKey(), email: text("email").notNull(), userId: text("user_id"), role: text("role").notNull(), companyId: text("company_id").notNull(), status: text("status").notNull().default("pending"), createdAt: text("created_at").notNull(),
}, (table) => [uniqueIndex("memberships_email_unique").on(table.email), uniqueIndex("memberships_user_unique").on(table.userId)]);
export const primeVendorLinks = sqliteTable("prime_vendor_links", {
  id: text("id").primaryKey(), primeCompanyId: text("prime_company_id").notNull(), vendorCompanyId: text("vendor_company_id").notNull(),
}, (table) => [uniqueIndex("prime_vendor_link_unique").on(table.primeCompanyId, table.vendorCompanyId)]);
export const documents = sqliteTable("documents", {
  id: text("id").primaryKey(), companyId: text("company_id").notNull(), uploadedBy: text("uploaded_by").notNull(), filename: text("filename").notNull(), contentType: text("content_type").notNull(), size: integer("size").notNull(), objectKey: text("object_key").notNull(), status: text("status").notNull().default("pending_review"), createdAt: text("created_at").notNull(), reviewedBy: text("reviewed_by"), reviewedAt: text("reviewed_at"), requirementId: text("requirement_id"), reviewNote: text("review_note").notNull().default(""),
  title: text("title").notNull().default(""), category: text("category").notNull().default(""), description: text("description").notNull().default(""),
});
export const onboardingChecklists = sqliteTable("onboarding_checklists", {
  id: text("id").primaryKey(), companyId: text("company_id").notNull(), businessType: text("business_type").notNull(), title: text("title").notNull(), documentsSubmittedAt: text("documents_submitted_at"), completedAt: text("completed_at"), createdAt: text("created_at").notNull(), updatedAt: text("updated_at").notNull(),
}, (table) => [uniqueIndex("onboarding_checklist_company_type_unique").on(table.companyId, table.businessType)]);
export const checklistRequirements = sqliteTable("checklist_requirements", {
  id: text("id").primaryKey(), checklistId: text("checklist_id").notNull(), companyId: text("company_id").notNull(), businessType: text("business_type").notNull(), itemKey: text("item_key").notNull(), title: text("title").notNull(), required: integer("required").notNull().default(1), status: text("status").notNull().default("not_received"), documentId: text("document_id"), reviewNote: text("review_note").notNull().default(""), createdAt: text("created_at").notNull(), updatedAt: text("updated_at").notNull(),
  source: text("source").notNull().default("template"), description: text("description").notNull().default(""),
}, (table) => [uniqueIndex("checklist_requirement_company_type_key_unique").on(table.companyId, table.businessType, table.itemKey)]);
export const communications = sqliteTable("communications", {
  id: text("id").primaryKey(), companyId: text("company_id").notNull(), authorId: text("author_id").notNull(), authorName: text("author_name").notNull(), body: text("body").notNull(), createdAt: text("created_at").notNull(),
});
export const auditEvents = sqliteTable("audit_events", {
  id: text("id").primaryKey(), actorId: text("actor_id").notNull(), action: text("action").notNull(), targetId: text("target_id").notNull(), createdAt: text("created_at").notNull(),
});
export const credentialingIntakes = sqliteTable("credentialing_intakes", {
  id: text("id").primaryKey(), companyId: text("company_id").notNull(), businessType: text("business_type").notNull(), serviceArea: text("service_area").notNull().default(""), website: text("website").notNull().default(""), credentialingNeeds: text("credentialing_needs").notNull().default(""), npiStatus: text("npi_status").notNull().default("not_sure"), organizationNpi: text("organization_npi").notNull().default(""), taxonomy: text("taxonomy").notNull().default(""), currentStage: text("current_stage").notNull().default("not_started"), targetDate: text("target_date"), workflowStatus: text("workflow_status").notNull().default("new"), notes: text("notes").notNull().default(""), submittedBy: text("submitted_by").notNull(), updatedAt: text("updated_at").notNull(),
}, (table) => [uniqueIndex("credentialing_intakes_company_unique").on(table.companyId)]);
export const signatureRequests = sqliteTable("signature_requests", {
  id: text("id").primaryKey(), companyId: text("company_id").notNull(), templateKey: text("template_key").notNull(), templateName: text("template_name").notNull(), providerDocumentId: text("provider_document_id"), signerName: text("signer_name").notNull(), signerEmail: text("signer_email").notNull(), status: text("status").notNull().default("creating"), testMode: integer("test_mode").notNull().default(1), signedObjectKey: text("signed_object_key"), createdBy: text("created_by").notNull(), createdAt: text("created_at").notNull(), updatedAt: text("updated_at").notNull(), completedAt: text("completed_at"), lastEvent: text("last_event"), lastError: text("last_error"),
}, (table) => [uniqueIndex("signature_requests_provider_doc_unique").on(table.providerDocumentId)]);
export const signatureEvents = sqliteTable("signature_events", {
  eventHash: text("event_hash").primaryKey(), providerDocumentId: text("provider_document_id").notNull(), eventType: text("event_type").notNull(), eventTime: integer("event_time").notNull(), receivedAt: text("received_at").notNull(),
});
export const notificationOutbox = sqliteTable("notification_outbox", {
  id: text("id").primaryKey(), companyId: text("company_id").notNull(), recipient: text("recipient").notNull(), subject: text("subject").notNull(), body: text("body").notNull(), status: text("status").notNull().default("queued"), attempts: integer("attempts").notNull().default(0), lastError: text("last_error").notNull().default(""), createdAt: text("created_at").notNull(), sentAt: text("sent_at"),
});
