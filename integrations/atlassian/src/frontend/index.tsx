import ForgeReconciler, { Heading, Stack, Text } from '@forge/react';

const App = () => (
  <Stack space="space.200">
    <Heading as="h1">ForgeMind Atlassian Companion</Heading>
    <Text>Connected to Atlassian Forge</Text>
  </Stack>
);

ForgeReconciler.render(<App />);
