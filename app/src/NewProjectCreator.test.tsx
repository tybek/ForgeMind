import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState, type ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  emptyProjectFoundation,
  NewProjectCreator,
} from "./NewProjectCreator";
import type { ProjectFoundationInput } from "./platform/workspaceDirectory";

function renderCreator(overrides?: Partial<ComponentProps<typeof NewProjectCreator>>) {
  const onChooseDirectory = vi.fn().mockResolvedValue(undefined);
  const onInitialize = vi.fn().mockResolvedValue(undefined);
  const onCancel = vi.fn();

  function Harness() {
    const [draft, setDraft] = useState<ProjectFoundationInput>({ ...emptyProjectFoundation, pillars: [] });
    return (
      <NewProjectCreator
        draft={draft}
        onChange={setDraft}
        onChooseDirectory={onChooseDirectory}
        selectedDirectory={null}
        onInitialize={onInitialize}
        isInitializing={false}
        creationError={null}
        onClearDirectory={() => undefined}
        onCancel={onCancel}
        {...overrides}
      />
    );
  }

  render(<Harness />);
  return { onChooseDirectory, onInitialize, onCancel };
}

async function completeRequiredFoundation(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Working title"), "Ashfall Courier");
  await user.click(screen.getByRole("button", { name: "Continue" }));
  await user.type(screen.getByLabelText("Game pitch"), "Carry fragile messages through a changing volcanic frontier.");
  await user.click(screen.getByRole("button", { name: "Continue" }));
}

async function continueToReview(user: ReturnType<typeof userEvent.setup>) {
  for (let step = 0; step < 5; step += 1) {
    await user.click(screen.getByRole("button", { name: "Continue" }));
  }
}

describe("New Project Creator", () => {
  it("keeps validation minimal and preserves entered state across Back and Continue", async () => {
    const user = userEvent.setup();
    renderCreator();

    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByRole("alert")).toHaveTextContent("working title");
    expect(screen.getByText("Step 1 of 8", { exact: false })).toBeInTheDocument();

    await user.type(screen.getByLabelText("Working title"), "Ashfall Courier");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.type(screen.getByLabelText("Game pitch"), "Too short");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByRole("alert")).toHaveTextContent("short sentence");

    await user.type(screen.getByLabelText("Game pitch"), " but meaningful now");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("button", { name: "Back" }));

    expect(screen.getByLabelText("Game pitch")).toHaveValue("Too short but meaningful now");
    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByLabelText("Working title")).toHaveValue("Ashfall Courier");
  });

  it("allows optional sections to remain empty and reviews only deterministic gaps", async () => {
    const user = userEvent.setup();
    const { onChooseDirectory, onInitialize } = renderCreator();
    await completeRequiredFoundation(user);
    await continueToReview(user);

    expect(screen.getByRole("heading", { name: "Your Game Foundation" })).toBeInTheDocument();
    expect(screen.getByText("Ashfall Courier")).toBeInTheDocument();
    expect(screen.getByText("Carry fragile messages through a changing volcanic frontier.")).toBeInTheDocument();
    expect(screen.getByText("What will players do again and again?")).toBeInTheDocument();
    expect(screen.getAllByText("Not defined yet.").length).toBeGreaterThan(0);
    expect(onChooseDirectory).not.toHaveBeenCalled();
    expect(onInitialize).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Create Project" }));
    expect(onChooseDirectory).toHaveBeenCalledWith(expect.objectContaining({
      workingTitle: "Ashfall Courier",
      openQuestions: expect.arrayContaining(["What will players do again and again?"]),
    }));
  });

  it("adds, edits, removes, and accurately reviews design pillars", async () => {
    const user = userEvent.setup();
    renderCreator();
    await completeRequiredFoundation(user);

    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("button", { name: "Add design pillar" }));
    await user.type(screen.getByLabelText("Pillar 1 title"), "Meaningful routes");
    await user.type(screen.getByLabelText(/Pillar 1 explanation/), "Every path changes the risk and story.");
    await user.click(screen.getByRole("button", { name: "Add design pillar" }));
    await user.type(screen.getByLabelText("Pillar 2 title"), "Temporary pillar");
    await user.click(screen.getByRole("button", { name: "Remove pillar 2" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));

    const pillarSection = screen.getByRole("heading", { name: "Design Pillars" }).closest("article")!;
    expect(within(pillarSection).getByText("Meaningful routes")).toBeInTheDocument();
    expect(pillarSection).toHaveTextContent("Every path changes the risk and story.");
    expect(screen.queryByText("Temporary pillar")).not.toBeInTheDocument();
  });

  it("edits an earlier section from Review and protects a substantial draft on cancel", async () => {
    const user = userEvent.setup();
    const { onCancel, onChooseDirectory } = renderCreator();
    await completeRequiredFoundation(user);
    await continueToReview(user);

    await user.click(screen.getByRole("button", { name: "Edit Core Loop" }));
    expect(screen.getByRole("heading", { name: "What will players do again and again?" })).toBeInTheDocument();
    await user.type(screen.getByLabelText(/Core loop/), "Plan a route, cross the frontier, and deliver a message.");
    await user.click(screen.getByRole("button", { name: "Return to Review" }));
    expect(screen.getByText("Plan a route, cross the frontier, and deliver a message.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Return Home" }));
    expect(screen.getByRole("alertdialog")).toHaveTextContent("Discard this foundation draft?");
    expect(onCancel).not.toHaveBeenCalled();
    expect(onChooseDirectory).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Continue editing" }));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Return Home" }));
    await user.click(screen.getByRole("button", { name: "Discard and return Home" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
