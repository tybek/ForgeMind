import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ModelsPage } from "./ModelsPage";
import * as registry from "./platform/modelRegistry";

vi.mock("./platform/modelRegistry", () => ({
  loadModelManagementState: vi.fn(), loadObservedModelMetrics: vi.fn(), refreshModelCatalog: vi.fn(),
  enableAvailableModel: vi.fn(), setModelEnabled: vi.fn(), addCustomModel: vi.fn(),
}));

const nemotron = {
  provider: "nebius_token_factory", modelId: "nvidia/nemotron-3-super-120b-a12b", displayName: "NVIDIA Nemotron 3 Super 120B",
  family: "Nemotron 3 Super", availability: "configured", capabilities: { structuredOutput: "JSON_OBJECT" as const }, enabled: true,
};
const state = {
  providerConfigured: true,
  catalog: { formatVersion: 1, refreshedAt: "2026-10-27T10:00:00.000Z", models: [
    { providerModelId: nemotron.modelId, displayName: nemotron.modelId, provider: "nebius_token_factory", discoveredAt: "2026-10-27T10:00:00.000Z", availability: "AVAILABLE" as const },
    { providerModelId: "vendor/new-model", displayName: "vendor/new-model", provider: "nebius_token_factory", discoveredAt: "2026-10-27T10:00:00.000Z", availability: "AVAILABLE" as const },
  ] },
  registry: [nemotron],
};

describe("ModelsPage", () => {
  beforeEach(() => {
    vi.mocked(registry.loadModelManagementState).mockResolvedValue(state);
    vi.mocked(registry.loadObservedModelMetrics).mockResolvedValue([{ provider: "nebius_token_factory", modelId: nemotron.modelId, runCount: 3, inputTokens: 100, outputTokens: 50, medianLatencyMs: 900, lastUsed: "2026-10-27T10:00:00.000Z" }]);
    vi.mocked(registry.refreshModelCatalog).mockResolvedValue(state);
    vi.mocked(registry.enableAvailableModel).mockResolvedValue(state);
    vi.mocked(registry.setModelEnabled).mockResolvedValue(state);
    vi.mocked(registry.addCustomModel).mockResolvedValue(state);
  });

  it("separates catalog availability from verified registry capability without automatic refresh", async () => {
    render(<ModelsPage />);
    expect(await screen.findByText("NVIDIA Nemotron 3 Super 120B")).toBeInTheDocument();
    expect(registry.refreshModelCatalog).not.toHaveBeenCalled();
    const enabled = screen.getByRole("heading", { name: "Enabled models" }).closest("section")!;
    expect(within(enabled).getByText("JSON Object")).toHaveClass("model-badge--verified");
    expect(enabled).toHaveTextContent("3 runs · median 0.9 s");
    expect(within(enabled).queryByLabelText("Observed in this ForgeMind installation")).not.toBeInTheDocument();
    await userEvent.setup().click(within(enabled).getByRole("button", { name: "Expand" }));
    expect(within(enabled).getByLabelText("Observed in this ForgeMind installation")).toHaveTextContent("3");
    const available = screen.getByRole("heading", { name: "Available models" }).closest("section")!;
    expect(available).toHaveTextContent("Structured output: Not verified");
  });

  it("refreshes and enables only through explicit user actions", async () => {
    const user = userEvent.setup(); render(<ModelsPage />);
    await screen.findByText("NVIDIA Nemotron 3 Super 120B");
    await user.click(screen.getByRole("button", { name: "Refresh catalog" }));
    await waitFor(() => expect(registry.refreshModelCatalog).toHaveBeenCalledTimes(1));
    await user.click(screen.getByRole("button", { name: "Enable" }));
    await waitFor(() => expect(registry.enableAvailableModel).toHaveBeenCalledWith("vendor/new-model"));
  });

  it("keeps the current default enabled", async () => {
    render(<ModelsPage />);
    const disable = await screen.findByRole("button", { name: "Disable" });
    expect(disable).toBeDisabled();
    expect(disable).toHaveAttribute("title", expect.stringContaining("replacement default"));
  });
});
