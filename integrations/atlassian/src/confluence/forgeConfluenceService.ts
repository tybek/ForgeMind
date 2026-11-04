import { requestConfluence } from "@forge/bridge";
import { createConfluenceService } from "./confluenceService";

export const forgeConfluenceService = createConfluenceService(requestConfluence);
