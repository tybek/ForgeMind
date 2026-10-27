import { render, screen } from "@testing-library/react";
// @ts-expect-error Vitest supplies Node at test time; production TypeScript intentionally omits Node globals.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { BrandLockup, Button, IconButton, PageHeader, StatusBadge } from "./designSystem";

describe("design system semantics", () => {
  it("resolves every design token used by application styles", () => {
    const css = `${readFileSync("src/design-system.css", "utf8")}\n${readFileSync("src/styles.css", "utf8")}`;
    const definitions = new Set([...css.matchAll(/(--[A-Za-z0-9_-]+)\s*:/g)].map((match) => match[1]));
    const references = new Set([...css.matchAll(/var\((--[A-Za-z0-9_-]+)/g)].map((match) => match[1]));

    expect([...references].filter((token) => !definitions.has(token))).toEqual([]);
  });

  it("renders the production SVG brand configurations with an accessible name", () => {
    const { rerender } = render(<BrandLockup />);

    const fullBrand = screen.getByRole("img", { name: "ForgeMind, AI for Game Development" });
    expect(fullBrand.querySelector("img")).toHaveAttribute("data-brand-asset", "lockup");
    expect(fullBrand.querySelector("img")?.getAttribute("src")).toMatch(/^data:image\/svg\+xml|\.svg(?:\?|$)/);
    expect(screen.getByText("AI for Game Development")).toBeVisible();

    rerender(<BrandLockup compact />);
    const compactAssets = screen.getByRole("img", { name: "ForgeMind, AI for Game Development" }).querySelectorAll("img");
    expect(compactAssets).toHaveLength(2);
    expect(compactAssets[0]).toHaveAttribute("data-brand-asset", "mark");
    expect(compactAssets[1]).toHaveAttribute("data-brand-asset", "wordmark");
  });

  it("keeps status meaning visible in text while applying a shared semantic tone", () => {
    render(<StatusBadge status="OUT_OF_SYNC" />);

    const badge = screen.getByText("OUT OF SYNC");
    expect(badge).toHaveClass("status-badge");
    expect(badge).toHaveAttribute("data-tone", "danger");
  });

  it("exposes loading state and prevents repeated button activation", () => {
    render(<Button loading loadingLabel="Inspecting...">Refresh snapshot</Button>);

    const button = screen.getByRole("button", { name: "Inspecting..." });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
  });

  it("keeps icon actions as labeled buttons", () => {
    render(<IconButton icon="copy" label="Copy Implementation Brief" />);

    expect(screen.getByRole("button", { name: "Copy Implementation Brief" })).toBeEnabled();
  });

  it("renders the shared page hierarchy without hiding project context", () => {
    render(<PageHeader eyebrow="Example Project" title="Feature Contracts" description="Reviewed delivery scope." status="0K · Complete" />);

    expect(screen.getByText("Example Project")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Feature Contracts", level: 1 })).toBeVisible();
    expect(screen.getByText("Reviewed delivery scope.")).toBeVisible();
    expect(screen.getByText("0K · Complete")).toBeVisible();
  });
});
