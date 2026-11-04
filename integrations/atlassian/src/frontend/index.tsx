import { useMemo, useRef, useState } from "react";
import ForgeReconciler, { Button, Heading, Label, Link, Select, Spinner, Stack, Text, TextArea, Textfield } from "@forge/react";
import { parseAndValidateAtlassianProjectSnapshot, type AtlassianProjectSnapshot, type SnapshotValidationResult } from "../contracts/atlassianProjectSnapshot";
import { buildConfluencePageDraft, defaultConfluencePageTitle, validateConfluencePageTitle } from "../confluence/confluencePageDraft";
import { ConfluenceServiceError, createSingleFlightPublisher, createSingleFlightUpdater, type ConfluencePage, type ConfluencePublishResult, type ConfluenceSpace } from "../confluence/confluenceService";
import { forgeConfluenceService } from "../confluence/forgeConfluenceService";
import { fingerprintConfluencePageDraft } from "../publication/contentFingerprint";
import type { ConfluencePublicationMapping } from "../publication/confluencePublicationMapping";
import { forgePublicationMappingService } from "../publication/forgePublicationMappingService";
import { determinePublicationStatus, inspectPublication, type PublicationStatus } from "../publication/publicationStatus";

const App = () => {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<SnapshotValidationResult | null>(null);
  const [snapshot, setSnapshot] = useState<AtlassianProjectSnapshot | null>(null);
  const [spaces, setSpaces] = useState<ConfluenceSpace[]>([]);
  const [spacesLoading, setSpacesLoading] = useState(false);
  const [spacesError, setSpacesError] = useState("");
  const [selectedSpaceId, setSelectedSpaceId] = useState("");
  const [title, setTitle] = useState("");
  const [publicationLoading, setPublicationLoading] = useState(false);
  const [publicationStatus, setPublicationStatus] = useState<PublicationStatus | null>(null);
  const [publicationMessage, setPublicationMessage] = useState("");
  const [mapping, setMapping] = useState<ConfluencePublicationMapping | null>(null);
  const [mappedPage, setMappedPage] = useState<ConfluencePage | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [forgetting, setForgetting] = useState(false);
  const [actionError, setActionError] = useState("");
  const [publishResult, setPublishResult] = useState<ConfluencePublishResult | null>(null);
  const publisher = useRef(createSingleFlightPublisher(forgeConfluenceService));
  const updater = useRef(createSingleFlightUpdater(forgeConfluenceService));
  const selectedSpace = spaces.find((space) => space.id === selectedSpaceId) ?? null;
  const titleError = validateConfluencePageTitle(title);
  const preview = useMemo(() => snapshot && !titleError ? buildConfluencePageDraft(snapshot, title) : null, [snapshot, title, titleError]);
  const fingerprint = useMemo(() => preview ? fingerprintConfluencePageDraft(preview) : "", [preview]);
  const visibleStatus = mapping && mappedPage && publicationStatus !== "ACCESS_ERROR" && publicationStatus !== "MAPPED_PAGE_MISSING"
    ? determinePublicationStatus(mapping, fingerprint)
    : publicationStatus;

  async function loadSpaces(): Promise<void> {
    setSpacesLoading(true);
    setSpacesError("");
    try {
      setSpaces(await forgeConfluenceService.listSpaces());
    } catch (error) {
      setSpacesError(safeErrorMessage(error));
    } finally {
      setSpacesLoading(false);
    }
  }

  async function validateSnapshot(): Promise<void> {
    const validation = parseAndValidateAtlassianProjectSnapshot(input);
    setResult(validation);
    setSnapshot(validation.ok ? validation.snapshot : null);
    resetPublicationView();
    if (!validation.ok) return;

    setPublicationLoading(true);
    try {
      let storedMapping: ConfluencePublicationMapping | null;
      try {
        storedMapping = await forgePublicationMappingService.getMapping(validation.snapshot.project.projectId);
      } catch {
        setTitle(defaultConfluencePageTitle(validation.snapshot.project.name));
        setPublicationStatus("ACCESS_ERROR");
        setPublicationMessage("Publication metadata could not be read or is malformed. No mapping was changed.");
        return;
      }

      const proposedTitle = storedMapping?.pageTitle ?? defaultConfluencePageTitle(validation.snapshot.project.name);
      setTitle(proposedTitle);
      const draft = buildConfluencePageDraft(validation.snapshot, proposedTitle);
      const inspection = await inspectPublication(async () => storedMapping, (pageId) => forgeConfluenceService.getPage(pageId), validation.snapshot.project.projectId, fingerprintConfluencePageDraft(draft));
      setMapping(inspection.mapping);
      setMappedPage(inspection.page);
      setPublicationStatus(inspection.status);
      setPublicationMessage(inspection.message ?? "");
      if (inspection.status === "NOT_PUBLISHED") await loadSpaces();
    } finally {
      setPublicationLoading(false);
    }
  }

  async function publishNewPage(): Promise<void> {
    if (publishing || publisher.current.isPending()) return;
    setActionError("");
    setPublishResult(null);
    const validation = parseAndValidateAtlassianProjectSnapshot(input);
    if (!validation.ok) return invalidateChangedSnapshot(validation);
    const currentSpace = spaces.find((space) => space.id === selectedSpaceId);
    if (!currentSpace) return setActionError("Choose an available Confluence space before publishing.");
    const currentTitleError = validateConfluencePageTitle(title);
    if (currentTitleError) return setActionError(currentTitleError);

    setPublishing(true);
    try {
      const existing = await forgePublicationMappingService.getMapping(validation.snapshot.project.projectId);
      if (existing) throw new Error("This project already has a stored Confluence page mapping. Validate the snapshot again; no new page was created.");
      const draft = buildConfluencePageDraft(validation.snapshot, title);
      const created = await publisher.current.publish({ spaceId: currentSpace.id, draft });
      setPublishResult(created);
      let saved: ConfluencePublicationMapping;
      try {
        saved = await forgePublicationMappingService.saveMapping({ projectId: validation.snapshot.project.projectId, pageId: created.pageId, spaceId: created.spaceId, pageTitle: created.title, sourceSnapshotSchemaVersion: validation.snapshot.schemaVersion, sourceGeneratedAt: validation.snapshot.generatedAt, contentFingerprint: fingerprintConfluencePageDraft(draft) });
      } catch {
        throw new Error(`Confluence page ${created.pageId} was created, but its publication mapping could not be saved. Do not publish again; record this safe page ID for recovery.`);
      }
      setMapping(saved);
      setPublicationStatus("UP_TO_DATE");
      setPublicationMessage("");
      try {
        setMappedPage(await forgeConfluenceService.getPage(created.pageId));
      } catch {
        setMappedPage(null);
        setPublicationStatus("ACCESS_ERROR");
        setPublicationMessage("The mapping was saved, but the new page could not be re-verified.");
      }
    } catch (error) {
      setActionError(safeErrorMessage(error));
    } finally {
      setPublishing(false);
    }
  }

  async function updateExistingPage(): Promise<void> {
    if (updating || updater.current.isPending() || !mapping) return;
    setActionError("");
    const validation = parseAndValidateAtlassianProjectSnapshot(input);
    if (!validation.ok) return invalidateChangedSnapshot(validation);
    const currentTitleError = validateConfluencePageTitle(title);
    if (currentTitleError) return setActionError(currentTitleError);

    setUpdating(true);
    try {
      const currentMapping = await forgePublicationMappingService.getMapping(validation.snapshot.project.projectId);
      if (!currentMapping || currentMapping.pageId !== mapping.pageId) throw new Error("The publication mapping changed. Validate the snapshot again before updating.");
      const currentPage = await forgeConfluenceService.getPage(currentMapping.pageId);
      if (currentPage.spaceId !== currentMapping.spaceId) throw new Error("The mapped page is no longer in its recorded space. No update was sent.");
      const draft = buildConfluencePageDraft(validation.snapshot, title);
      const updated = await updater.current.update({ pageId: currentMapping.pageId, currentVersion: currentPage.version, draft });
      let saved: ConfluencePublicationMapping;
      try {
        saved = await forgePublicationMappingService.saveMapping({ projectId: currentMapping.projectId, pageId: currentMapping.pageId, spaceId: currentMapping.spaceId, pageTitle: updated.title, sourceSnapshotSchemaVersion: validation.snapshot.schemaVersion, sourceGeneratedAt: validation.snapshot.generatedAt, contentFingerprint: fingerprintConfluencePageDraft(draft) });
      } catch {
        throw new Error(`Confluence page ${updated.pageId} was updated, but its publication metadata could not be saved. Check the page before trying again.`);
      }
      setMapping(saved);
      setMappedPage(updated);
      setPublicationStatus("UP_TO_DATE");
      setPublicationMessage("");
    } catch (error) {
      setActionError(safeErrorMessage(error));
    } finally {
      setUpdating(false);
    }
  }

  async function forgetMapping(): Promise<void> {
    if (!snapshot || !mapping || visibleStatus !== "MAPPED_PAGE_MISSING" || forgetting) return;
    setForgetting(true);
    setActionError("");
    try {
      await forgePublicationMappingService.deleteMapping(snapshot.project.projectId);
      setMapping(null);
      setMappedPage(null);
      setPublicationStatus("NOT_PUBLISHED");
      setPublicationMessage("The missing-page mapping was forgotten. Project Brain was not changed.");
      setTitle(defaultConfluencePageTitle(snapshot.project.name));
      await loadSpaces();
    } catch (error) {
      setActionError(safeErrorMessage(error));
    } finally {
      setForgetting(false);
    }
  }

  function resetPublicationView(): void {
    setSpaces([]); setSelectedSpaceId(""); setSpacesError(""); setPublicationStatus(null); setPublicationMessage("");
    setMapping(null); setMappedPage(null); setActionError(""); setPublishResult(null);
  }

  function invalidateChangedSnapshot(validation: SnapshotValidationResult): void {
    setResult(validation); setSnapshot(null);
    setActionError("The snapshot changed and is no longer valid. Validate it again before publishing or updating.");
  }

  return (
    <Stack space="space.200">
      <Heading as="h1">ForgeMind Atlassian Companion</Heading>
      <Text>Connected to Atlassian Forge</Text>
      <Text>Paste a local ForgeMind Atlassian Project Snapshot. Validation is ephemeral; only publication mapping metadata is stored.</Text>
      <Label labelFor="snapshot">Atlassian Project Snapshot JSON</Label>
      <TextArea id="snapshot" name="snapshot" isMonospaced value={input} onChange={(event) => setInput(event.target.value)} />
      <Button appearance="primary" onClick={() => void validateSnapshot()}>Validate Snapshot</Button>
      {result?.ok ? <SnapshotSummary result={result} /> : null}
      {result && !result.ok ? <Stack space="space.100"><Heading as="h2">Snapshot invalid</Heading>{result.errors.slice(0, 10).map((error) => <Text key={error}>{error}</Text>)}</Stack> : null}
      {publicationLoading ? <Stack space="space.100"><Spinner size="small" /><Text>Checking publication mapping and mapped page...</Text></Stack> : null}
      {snapshot && visibleStatus ? (
        <Stack space="space.100">
          <Heading as="h2">Confluence publication</Heading>
          <Text>Status: {visibleStatus.replaceAll("_", " ")}</Text>
          {mapping ? <Text>Page: {mapping.pageTitle}</Text> : null}
          {mapping ? <Text>Confluence page ID: {mapping.pageId}</Text> : null}
          {mapping ? <Text>Last published: {mapping.lastPublishedAt}</Text> : null}
          {publicationMessage ? <Text>{publicationMessage}</Text> : null}
          {mappedPage?.url ? <Link href={mappedPage.url} openNewTab>Open in Confluence</Link> : null}
          {visibleStatus === "MAPPED_PAGE_MISSING" ? <Button isDisabled={forgetting} onClick={() => void forgetMapping()}>{forgetting ? "Forgetting..." : "Forget mapping"}</Button> : null}
          {visibleStatus === "ACCESS_ERROR" ? <Text>The mapping was preserved. Restore access or correct the stored metadata before publishing.</Text> : null}
        </Stack>
      ) : null}
      {snapshot && visibleStatus === "NOT_PUBLISHED" ? (
        <Stack space="space.200">
          <Heading as="h2">Choose Confluence destination</Heading>
          {spacesLoading ? <Stack space="space.100"><Spinner size="small" /><Text>Loading visible Confluence spaces...</Text></Stack> : null}
          {spacesError ? <Text>Space list failed: {spacesError}</Text> : null}
          {!spacesLoading && !spacesError && spaces.length === 0 ? <Text>No visible Confluence spaces are available. Confirm the app is connected to Confluence and you can view a space.</Text> : null}
          {spaces.length > 0 ? <Select inputId="confluence-space" name="confluence-space" placeholder="Choose a Confluence space" options={spaces.map((space) => ({ label: `${space.name} (${space.key})`, value: space.id }))} value={selectedSpace ? { label: `${selectedSpace.name} (${selectedSpace.key})`, value: selectedSpace.id } : null} onChange={(option) => setSelectedSpaceId(option && !Array.isArray(option) ? String(option.value) : "")} /> : null}
          <PageTitleField title={title} setTitle={setTitle} titleError={titleError} />
        </Stack>
      ) : null}
      {snapshot && mapping && mappedPage && visibleStatus !== "ACCESS_ERROR" && visibleStatus !== "MAPPED_PAGE_MISSING" ? (
        <Stack space="space.100">
          <Heading as="h2">Update preview</Heading>
          <PageTitleField title={title} setTitle={setTitle} titleError={titleError} />
          <Text>Project: {snapshot.project.name}</Text><Text>Mapped page: {mapping.pageId}</Text><Text>Space: {mapping.spaceId} (fixed for CONF-2)</Text>
          <Text>Current mapped title: {mapping.pageTitle}</Text><Text>Proposed title: {preview?.title}</Text><Text>Sections: {preview?.sectionCount}</Text><Text>Entries: {preview?.entryCount}</Text>
          <Text>Last published: {mapping.lastPublishedAt}</Text><Text>Snapshot generated: {snapshot.generatedAt}</Text><Text>Publication status: {visibleStatus?.replaceAll("_", " ")}</Text>
          <Text>This will replace the ForgeMind-managed content of the mapped Confluence page. ForgeMind remains the source of truth. Manual Confluence edits to this managed page may be overwritten.</Text>
          <Button appearance="primary" isDisabled={Boolean(titleError) || updating || visibleStatus !== "OUTDATED"} onClick={() => void updateExistingPage()}>{updating ? "Updating..." : "Update existing page"}</Button>
        </Stack>
      ) : null}
      {preview && visibleStatus === "NOT_PUBLISHED" ? (
        <Stack space="space.100"><Heading as="h2">Publish preview</Heading><Text>Project: {snapshot?.project.name}</Text><Text>Target space: {selectedSpace ? `${selectedSpace.name} (${selectedSpace.key})` : "Not selected"}</Text><Text>Page title: {preview.title}</Text><Text>Sections: {preview.sectionCount}</Text><Text>Entries: {preview.entryCount}</Text><Text>Confluence will receive a managed published copy. ForgeMind remains the source of truth.</Text><Button appearance="primary" isDisabled={!selectedSpace || Boolean(titleError) || spacesLoading || publishing} onClick={() => void publishNewPage()}>{publishing ? "Publishing..." : "Publish new page to Confluence"}</Button></Stack>
      ) : null}
      {actionError ? <Text>Action failed: {actionError}</Text> : null}
      {publishResult ? <Stack space="space.100"><Heading as="h2">Published successfully</Heading><Text>{publishResult.title}</Text><Text>Confluence page ID: {publishResult.pageId}</Text><Text>The page is mapped to this ForgeMind project for future explicit updates.</Text>{publishResult.url ? <Link href={publishResult.url} openNewTab>Open in Confluence</Link> : null}</Stack> : null}
    </Stack>
  );
};

function SnapshotSummary({ result }: { result: Extract<SnapshotValidationResult, { ok: true }> }) {
  return <Stack space="space.100"><Heading as="h2">Snapshot valid</Heading><Text>Project: {result.snapshot.project.name}</Text><Text>Project ID: {result.snapshot.project.projectId}</Text><Text>Schema version: {result.snapshot.schemaVersion}</Text><Text>Sections: {result.sectionCount}</Text><Text>Entries: {result.entryCount}</Text></Stack>;
}

function PageTitleField({ title, setTitle, titleError }: { title: string; setTitle: (value: string) => void; titleError: string | null }) {
  return <Stack space="space.050"><Label labelFor="confluence-page-title">Page title</Label><Textfield id="confluence-page-title" name="confluence-page-title" value={title} maxLength={255} onChange={(event) => setTitle(event.target.value)} />{titleError ? <Text>{titleError}</Text> : null}</Stack>;
}

function safeErrorMessage(error: unknown): string {
  if (error instanceof ConfluenceServiceError || error instanceof Error) return error.message;
  return "The Confluence request failed. Confirm the app connection and try again.";
}

ForgeReconciler.render(<App />);
