import { kvs } from "@forge/kvs";
import Resolver from "@forge/resolver";
import { confluencePublicationLookupResponse, createPublicationMappingRepository } from "../publication/confluencePublicationMapping";

const resolver = new Resolver();
const repository = createPublicationMappingRepository(kvs);

resolver.define("getConfluencePublicationMapping", async ({ payload }) => {
  try {
    return confluencePublicationLookupResponse(await repository.getMapping(projectIdFromPayload(payload)));
  } catch {
    throw new Error("Confluence publication metadata could not be read safely.");
  }
});

resolver.define("saveConfluencePublicationMapping", async ({ payload }) => {
  try {
    if (!isRecord(payload) || !("mapping" in payload)) throw new Error("Missing mapping.");
    return await repository.saveMapping(payload.mapping);
  } catch {
    throw new Error("Confluence publication metadata could not be saved safely.");
  }
});

resolver.define("deleteConfluencePublicationMapping", async ({ payload }) => {
  try {
    await repository.deleteMapping(projectIdFromPayload(payload));
    return { deleted: true };
  } catch {
    throw new Error("Confluence publication metadata could not be removed safely.");
  }
});

function projectIdFromPayload(payload: unknown): string {
  if (!isRecord(payload) || typeof payload.projectId !== "string" || !payload.projectId.trim()) throw new Error("Missing project identity.");
  return payload.projectId;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export const handler = resolver.getDefinitions();
