import { invoke } from "@forge/bridge";
import { createPublicationMappingService } from "./confluencePublicationMapping";

export const forgePublicationMappingService = createPublicationMappingService((functionKey, payload) => invoke(functionKey, payload));
