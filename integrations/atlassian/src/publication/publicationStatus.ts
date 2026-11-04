import type { ConfluencePage } from "../confluence/confluenceService";
import type { ConfluencePublicationMapping } from "./confluencePublicationMapping";

export type PublicationStatus = "NOT_PUBLISHED" | "UP_TO_DATE" | "OUTDATED" | "MAPPED_PAGE_MISSING" | "ACCESS_ERROR";

export function determinePublicationStatus(mapping: ConfluencePublicationMapping | null, fingerprint: string): PublicationStatus {
  if (!mapping) return "NOT_PUBLISHED";
  return mapping.contentFingerprint === fingerprint ? "UP_TO_DATE" : "OUTDATED";
}

export interface PublicationLookupResult {
  mapping: ConfluencePublicationMapping | null;
  page: ConfluencePage | null;
  status: PublicationStatus;
  message?: string;
}

export async function inspectPublication(
  getMapping: (projectId: string) => Promise<ConfluencePublicationMapping | null>,
  getPage: (pageId: string) => Promise<ConfluencePage>,
  projectId: string,
  fingerprint: string,
): Promise<PublicationLookupResult> {
  let mapping: ConfluencePublicationMapping | null;
  try {
    mapping = await getMapping(projectId);
  } catch {
    return { mapping: null, page: null, status: "ACCESS_ERROR", message: "Publication metadata could not be read or is malformed." };
  }
  if (!mapping) return { mapping: null, page: null, status: "NOT_PUBLISHED" };
  try {
    const page = await getPage(mapping.pageId);
    return { mapping, page, status: determinePublicationStatus(mapping, fingerprint) };
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String((error as Error & { code: unknown }).code) : "";
    if (code === "MAPPED_PAGE_MISSING") return { mapping, page: null, status: "MAPPED_PAGE_MISSING", message: error instanceof Error ? error.message : undefined };
    return { mapping, page: null, status: "ACCESS_ERROR", message: error instanceof Error ? error.message : undefined };
  }
}
