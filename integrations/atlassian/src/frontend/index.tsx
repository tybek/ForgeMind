import { useState } from 'react';
import ForgeReconciler, { Button, Heading, Label, Stack, Text, TextArea } from '@forge/react';
import { parseAndValidateAtlassianProjectSnapshot, type SnapshotValidationResult } from '../contracts/atlassianProjectSnapshot';

const App = () => {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<SnapshotValidationResult | null>(null);

  return (
    <Stack space="space.200">
      <Heading as="h1">ForgeMind Atlassian Companion</Heading>
      <Text>Connected to Atlassian Forge</Text>
      <Text>Paste a local ForgeMind Atlassian Project Snapshot. Validation is ephemeral and does not publish, store, or send the snapshot to an API.</Text>
      <Label labelFor="snapshot">Atlassian Project Snapshot JSON</Label>
      <TextArea id="snapshot" name="snapshot" isMonospaced value={input} onChange={(event) => setInput(event.target.value)} />
      <Button appearance="primary" onClick={() => setResult(parseAndValidateAtlassianProjectSnapshot(input))}>Validate Snapshot</Button>
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
    </Stack>
  );
};

ForgeReconciler.render(<App />);
