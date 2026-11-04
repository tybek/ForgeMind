import type { ConfluencePageDraft } from "../confluence/confluencePageDraft";

// FNV-1a 64 is a deterministic content-change detector, not a security primitive.
export function fingerprintConfluencePageDraft(draft: Pick<ConfluencePageDraft, "title" | "body">): string {
  const canonical = `${draft.title.length}:${draft.title}\n${draft.body.length}:${draft.body}`;
  const bytes = new TextEncoder().encode(canonical);
  let hash = 0xcbf29ce484222325n;
  for (const byte of bytes) {
    hash ^= BigInt(byte);
    hash = BigInt.asUintN(64, hash * 0x100000001b3n);
  }
  return `fnv1a64-v1:${hash.toString(16).padStart(16, "0")}`;
}
