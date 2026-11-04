import { useMemo, useRef, useState } from 'react';
import ForgeReconciler, { Button, Heading, Label, Link, Select, Spinner, Stack, Text, TextArea, Textfield } from '@forge/react';
import { parseAndValidateAtlassianProjectSnapshot, type AtlassianProjectSnapshot, type SnapshotValidationResult } from '../contracts/atlassianProjectSnapshot';
import { buildConfluencePageDraft, defaultConfluencePageTitle, validateConfluencePageTitle } from '../confluence/confluencePageDraft';
import { ConfluenceServiceError, createSingleFlightPublisher, type ConfluencePublishResult, type ConfluenceSpace } from '../confluence/confluenceService';
import { forgeConfluenceService } from '../confluence/forgeConfluenceService';

const App = () => {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<SnapshotValidationResult | null>(null);
  const [snapshot, setSnapshot] = useState<AtlassianProjectSnapshot | null>(null);
  const [spaces, setSpaces] = useState<ConfluenceSpace[]>([]);
  const [spacesLoading, setSpacesLoading] = useState(false);
  const [spacesError, setSpacesError] = useState('');
  const [selectedSpaceId, setSelectedSpaceId] = useState('');
  const [title, setTitle] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState('');
  const [publishResult, setPublishResult] = useState<ConfluencePublishResult | null>(null);
  const publisher = useRef(createSingleFlightPublisher(forgeConfluenceService));
  const selectedSpace = spaces.find((space) => space.id === selectedSpaceId) ?? null;
  const titleError = validateConfluencePageTitle(title);
  const preview = useMemo(() => snapshot && !titleError ? buildConfluencePageDraft(snapshot, title) : null, [snapshot, title, titleError]);

  async function validateSnapshot() {
    const validation = parseAndValidateAtlassianProjectSnapshot(input);
    setResult(validation);
    setSnapshot(validation.ok ? validation.snapshot : null);
    setSpaces([]);
    setSelectedSpaceId('');
    setSpacesError('');
    setPublishError('');
    setPublishResult(null);
    if (!validation.ok) return;

    setTitle(defaultConfluencePageTitle(validation.snapshot.project.name));
    setSpacesLoading(true);
    try {
      setSpaces(await forgeConfluenceService.listSpaces());
    } catch (error) {
      setSpacesError(safeErrorMessage(error));
    } finally {
      setSpacesLoading(false);
    }
  }

  async function publishNewPage() {
    if (publishing || publisher.current.isPending()) return;
    setPublishError('');
    setPublishResult(null);

    const validation = parseAndValidateAtlassianProjectSnapshot(input);
    if (!validation.ok) {
      setResult(validation);
      setSnapshot(null);
      setPublishError('The snapshot changed and is no longer valid. Validate it again before publishing.');
      return;
    }
    const currentSpace = spaces.find((space) => space.id === selectedSpaceId);
    if (!currentSpace) {
      setPublishError('Choose an available Confluence space before publishing.');
      return;
    }
    const currentTitleError = validateConfluencePageTitle(title);
    if (currentTitleError) {
      setPublishError(currentTitleError);
      return;
    }

    setPublishing(true);
    try {
      const draft = buildConfluencePageDraft(validation.snapshot, title);
      setPublishResult(await publisher.current.publish({ spaceId: currentSpace.id, draft }));
    } catch (error) {
      setPublishError(safeErrorMessage(error));
    } finally {
      setPublishing(false);
    }
  }

  return (
    <Stack space="space.200">
      <Heading as="h1">ForgeMind Atlassian Companion</Heading>
      <Text>Connected to Atlassian Forge</Text>
      <Text>Paste a local ForgeMind Atlassian Project Snapshot. Validation is ephemeral and does not publish, store, or send the snapshot to an API.</Text>
      <Label labelFor="snapshot">Atlassian Project Snapshot JSON</Label>
      <TextArea id="snapshot" name="snapshot" isMonospaced value={input} onChange={(event) => setInput(event.target.value)} />
      <Button appearance="primary" onClick={() => void validateSnapshot()}>Validate Snapshot</Button>
      {result?.ok ? (
        <Stack space="space.100">
          <Heading as="h2">Snapshot valid</Heading>
          <Text>Project: {result.snapshot.project.name}</Text>
          <Text>Project ID: {result.snapshot.project.projectId}</Text>
          <Text>Schema version: {result.snapshot.schemaVersion}</Text>
          <Text>Sections: {result.sectionCount}</Text>
          <Text>Entries: {result.entryCount}</Text>
        </Stack>
      ) : null}
      {result && !result.ok ? (
        <Stack space="space.100">
          <Heading as="h2">Snapshot invalid</Heading>
          {result.errors.slice(0, 10).map((error) => <Text key={error}>{error}</Text>)}
        </Stack>
      ) : null}
      {snapshot ? (
        <Stack space="space.200">
          <Heading as="h2">Choose Confluence destination</Heading>
          {spacesLoading ? <Stack space="space.100"><Spinner size="small" /><Text>Loading visible Confluence spaces...</Text></Stack> : null}
          {spacesError ? <Text>Space list failed: {spacesError}</Text> : null}
          {!spacesLoading && !spacesError && spaces.length === 0 ? <Text>No visible Confluence spaces are available. Confirm the app is connected to Confluence and you can view a space.</Text> : null}
          {spaces.length > 0 ? (
            <Select
              inputId="confluence-space"
              name="confluence-space"
              placeholder="Choose a Confluence space"
              options={spaces.map((space) => ({ label: `${space.name} (${space.key})`, value: space.id }))}
              value={selectedSpace ? { label: `${selectedSpace.name} (${selectedSpace.key})`, value: selectedSpace.id } : null}
              onChange={(option) => setSelectedSpaceId(option && !Array.isArray(option) ? String(option.value) : '')}
            />
          ) : null}
          <Label labelFor="confluence-page-title">Page title</Label>
          <Textfield id="confluence-page-title" name="confluence-page-title" value={title} maxLength={255} onChange={(event) => setTitle(event.target.value)} />
          {titleError ? <Text>{titleError}</Text> : null}
        </Stack>
      ) : null}
      {preview ? (
        <Stack space="space.100">
          <Heading as="h2">Publish preview</Heading>
          <Text>Project: {snapshot?.project.name}</Text>
          <Text>Target space: {selectedSpace ? `${selectedSpace.name} (${selectedSpace.key})` : 'Not selected'}</Text>
          <Text>Page title: {preview.title}</Text>
          <Text>Sections: {preview.sectionCount}</Text>
          <Text>Entries: {preview.entryCount}</Text>
          <Text>Authority: {preview.authoritySummary.length > 0 ? preview.authoritySummary.map((item) => `${item.authority} ${item.count}`).join(', ') : 'No entries'}</Text>
          <Text>Confluence will receive a published copy. ForgeMind remains the source of truth.</Text>
          <Text>Each successful publish creates one new page. This is not sync, update, or republish behavior.</Text>
          <Button appearance="primary" isDisabled={!selectedSpace || Boolean(titleError) || spacesLoading || publishing} onClick={() => void publishNewPage()}>
            {publishing ? 'Publishing...' : 'Publish new page to Confluence'}
          </Button>
        </Stack>
      ) : null}
      {publishError ? <Text>Publish failed: {publishError}</Text> : null}
      {publishResult ? (
        <Stack space="space.100">
          <Heading as="h2">Published successfully</Heading>
          <Text>{publishResult.title}</Text>
          <Text>Target space: {selectedSpace ? `${selectedSpace.name} (${selectedSpace.key})` : publishResult.spaceId}</Text>
          <Text>Confluence page ID: {publishResult.pageId}</Text>
          <Text>A new derived page was created. Its ID is not stored in ForgeMind.</Text>
          {publishResult.url ? <Link href={publishResult.url} openNewTab>Open in Confluence</Link> : null}
        </Stack>
      ) : null}
    </Stack>
  );
};

function safeErrorMessage(error: unknown): string {
  if (error instanceof ConfluenceServiceError || error instanceof Error) return error.message;
  return 'The Confluence request failed. Confirm the app connection and try again.';
}

ForgeReconciler.render(<App />);
