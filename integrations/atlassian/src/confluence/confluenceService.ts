import type { ConfluencePageDraft } from "./confluencePageDraft";

export interface ConfluenceSpace {
  id: string;
  key: string;
  name: string;
}

export interface CreateConfluencePageInput {
  spaceId: string;
  draft: ConfluencePageDraft;
}

export interface ConfluencePublishResult {
  pageId: string;
  title: string;
  spaceId: string;
  url?: string;
}

export interface ConfluenceResponse {
  ok: boolean;
  status: number;
  statusText: string;
  json(): Promise<unknown>;
}

export type ConfluenceRequester = (path: string, init?: RequestInit) => Promise<ConfluenceResponse>;

export class ConfluenceServiceError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "ConfluenceServiceError";
    this.code = code;
  }
}

export function createConfluenceService(request: ConfluenceRequester) {
  return {
    async listSpaces(): Promise<ConfluenceSpace[]> {
      const spaces = new Map<string, ConfluenceSpace>();
      const visited = new Set<string>();
      let path: string | null = "/wiki/api/v2/spaces?limit=250&status=current";

      for (let page = 0; path && page < 20; page += 1) {
        if (visited.has(path)) throw malformedResponse("Confluence returned a repeated spaces page.");
        visited.add(path);
        const response = await performRequest(request, path, undefined, "list");
        if (!response.ok) throw responseError(response.status, "list");
        const payload = await readJson(response, "list");
        if (!isRecord(payload) || !Array.isArray(payload.results)) throw malformedResponse("Confluence returned an invalid spaces response.");
        for (const item of payload.results) {
          if (!isRecord(item) || !text(item.id) || !text(item.name) || !text(item.key)) throw malformedResponse("Confluence returned an invalid space entry.");
          spaces.set(item.id, { id: item.id, key: item.key, name: item.name });
        }
        path = nextSpacesPath(payload);
      }
      if (path) throw malformedResponse("Confluence returned too many spaces pages to validate safely.");
      return [...spaces.values()].sort((left, right) => left.name.localeCompare(right.name, "en") || left.key.localeCompare(right.key, "en"));
    },

    async createPage({ spaceId, draft }: CreateConfluencePageInput): Promise<ConfluencePublishResult> {
      if (!text(spaceId)) throw new ConfluenceServiceError("INVALID_SPACE", "Choose a Confluence space before publishing.");
      if (!text(draft.title)) throw new ConfluenceServiceError("INVALID_TITLE", "Page title is required.");
      if (draft.title.trim().length > 255) throw new ConfluenceServiceError("INVALID_TITLE", "Page title must be 255 characters or fewer.");
      if (!text(draft.body)) throw new ConfluenceServiceError("INVALID_BODY", "The Confluence page body is empty.");

      const response = await performRequest(request, "/wiki/api/v2/pages?root-level=true", {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({
          spaceId,
          status: "current",
          title: draft.title,
          body: { representation: "storage", value: draft.body },
        }),
      }, "create");
      if (!response.ok) throw responseError(response.status, "create");
      const payload = await readJson(response, "create");
      if (!isRecord(payload) || !text(payload.id) || !text(payload.title) || !text(payload.spaceId)) {
        throw new ConfluenceServiceError("MALFORMED_CREATE_RESPONSE", "Confluence may have created the page but returned an invalid result. Check Confluence before publishing again.");
      }
      return { pageId: payload.id, title: payload.title, spaceId: payload.spaceId, url: safePageUrl(payload) };
    },
  };
}

export function createSingleFlightPublisher(service: ReturnType<typeof createConfluenceService>) {
  let pending = false;
  return {
    isPending: () => pending,
    async publish(input: CreateConfluencePageInput): Promise<ConfluencePublishResult> {
      if (pending) throw new ConfluenceServiceError("PUBLISH_IN_PROGRESS", "A Confluence publish request is already in progress.");
      pending = true;
      try {
        return await service.createPage(input);
      } finally {
        pending = false;
      }
    },
  };
}

async function performRequest(request: ConfluenceRequester, path: string, init: RequestInit | undefined, operation: "list" | "create"): Promise<ConfluenceResponse> {
  try {
    return await request(path, init);
  } catch {
    if (operation === "create") {
      throw new ConfluenceServiceError("CREATE_RESULT_UNKNOWN", "The publish result is unknown because Confluence could not be reached. Check Confluence before publishing again.");
    }
    throw new ConfluenceServiceError("CONFLUENCE_UNAVAILABLE", "Confluence could not be reached. Confirm the app is connected to Confluence and try again.");
  }
}

async function readJson(response: ConfluenceResponse, operation: "list" | "create"): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    if (operation === "create") {
      throw new ConfluenceServiceError("MALFORMED_CREATE_RESPONSE", "Confluence may have created the page but returned an unreadable result. Check Confluence before publishing again.");
    }
    throw malformedResponse("Confluence returned an unreadable spaces response.");
  }
}

function responseError(status: number, operation: "list" | "create"): ConfluenceServiceError {
  if (status === 401 || status === 403) {
    return new ConfluenceServiceError("CONFLUENCE_PERMISSION_DENIED", operation === "list"
      ? "Confluence denied access to spaces. Confirm the app is connected and the read:space:confluence permission is approved."
      : "Confluence denied page creation. Confirm the target space allows page creation and the write:page:confluence permission is approved.");
  }
  if (status === 404) return new ConfluenceServiceError("CONFLUENCE_NOT_FOUND", "Confluence or the selected space is unavailable. Confirm the app is connected and choose an available space.");
  if (operation === "create" && (status === 400 || status === 409)) {
    return new ConfluenceServiceError("PAGE_REJECTED", "Confluence rejected the page. Check the title, target space, and whether that space already has a page with the same title.");
  }
  if (status >= 500 && operation === "create") {
    return new ConfluenceServiceError("CREATE_RESULT_UNKNOWN", "Confluence reported a server error and the publish result may be unknown. Check Confluence before publishing again.");
  }
  if (status >= 500) return new ConfluenceServiceError("CONFLUENCE_UNAVAILABLE", "Confluence reported a server error. Try listing spaces again later.");
  return new ConfluenceServiceError("CONFLUENCE_REQUEST_FAILED", `Confluence rejected the ${operation === "list" ? "space list" : "page publish"} request (HTTP ${status}).`);
}

function nextSpacesPath(payload: Record<string, unknown>): string | null {
  if (!isRecord(payload._links) || payload._links.next === undefined || payload._links.next === null) return null;
  if (!text(payload._links.next)) throw malformedResponse("Confluence returned an invalid spaces continuation link.");
  try {
    const url = new URL(payload._links.next, "https://confluence.invalid");
    if (url.pathname !== "/wiki/api/v2/spaces") throw malformedResponse("Confluence returned an unsafe spaces continuation link.");
    return `${url.pathname}${url.search}`;
  } catch (error) {
    if (error instanceof ConfluenceServiceError) throw error;
    throw malformedResponse("Confluence returned an invalid spaces continuation link.");
  }
}

function safePageUrl(payload: Record<string, unknown>): string | undefined {
  if (!isRecord(payload._links) || !text(payload._links.base) || !text(payload._links.webui)) return undefined;
  try {
    const base = new URL(payload._links.base);
    if (base.protocol !== "https:") return undefined;
    const page = new URL(payload._links.webui, base);
    return page.origin === base.origin && page.protocol === "https:" ? page.toString() : undefined;
  } catch {
    return undefined;
  }
}

function malformedResponse(message: string): ConfluenceServiceError {
  return new ConfluenceServiceError("MALFORMED_RESPONSE", message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
