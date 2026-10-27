// Shared by the browser UI and the server routes. Keep this file free of server-only imports.

/** Categories for documents uploaded outside the checklist (Additional Documents). */
export const DOCUMENT_CATEGORIES = [
  { value: "corporate", label: "Corporate / formation" },
  { value: "license", label: "License or certificate" },
  { value: "insurance", label: "Insurance" },
  { value: "tax_financial", label: "Tax or financial" },
  { value: "policy", label: "Policy or procedure" },
  { value: "correspondence", label: "Correspondence" },
  { value: "other", label: "Other" },
] as const;

export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number]["value"];

export const isDocumentCategory = (value: string): value is DocumentCategory =>
  DOCUMENT_CATEGORIES.some((category) => category.value === value);

export const categoryLabel = (value: string) =>
  DOCUMENT_CATEGORIES.find((category) => category.value === value)?.label ?? "";

export const TITLE_MAX = 160;
export const DESCRIPTION_MAX = 500;
