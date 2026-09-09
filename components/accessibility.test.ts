import { createElement, createRef, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import Home from "../app/page";
import MobileDrawer from "./MobileDrawer";
import Sidebar from "./Sidebar";
import Base64Tool from "./tools/Base64Tool";
import CommandGenerator from "./tools/CommandGenerator";
import HashTool from "./tools/HashTool";
import HeaderAnalyzer from "./tools/HeaderAnalyzer";
import JsonTool from "./tools/JsonTool";
import PayloadGenerator from "./tools/PayloadGenerator";
import UrlTool from "./tools/UrlTool";
import { Field, TextArea, TextInput } from "./ui/Field";
import { getDrawerKeyAction, restoreDrawerFocus } from "../lib/drawer-keyboard";

const TestField = Field as (props: { label: string; children?: ReactNode }) => ReactNode;

const toolMarkup = [
  Base64Tool,
  UrlTool,
  HashTool,
  JsonTool,
  HeaderAnalyzer,
  CommandGenerator,
  PayloadGenerator,
]
  .map((Component) => renderToStaticMarkup(createElement(Component)))
  .join("");

function attributesFor(tag: "input" | "textarea" | "select"): string[] {
  return [...toolMarkup.matchAll(new RegExp(`<${tag}\\b([^>]*)>`, "g"))].map(
    (match) => match[1]
  );
}

function hasAccessibleName(attributes: string): boolean {
  const ariaLabel = /aria-label="[^"]+"/.test(attributes);
  const id = /\bid="([^"]+)"/.exec(attributes)?.[1];
  const explicitLabel = id ? toolMarkup.includes(`for="${id}"`) : false;
  return ariaLabel || explicitLabel;
}

describe("form and navigation accessibility", () => {
  it("gives every rendered text input an accessible name", () => {
    const textInputs = attributesFor("input").filter(
      (attributes) => !/type="checkbox"/.test(attributes)
    );
    expect(textInputs.length).toBeGreaterThan(0);
    expect(textInputs.every(hasAccessibleName)).toBe(true);
  });

  it("gives every rendered textarea an accessible name", () => {
    expect(attributesFor("textarea").every(hasAccessibleName)).toBe(true);
  });

  it("gives every rendered select an accessible name", () => {
    expect(attributesFor("select").every(hasAccessibleName)).toBe(true);
  });

  it("associates visible Field labels and preserves explicit IDs", () => {
    const input = renderToStaticMarkup(
      createElement(TestField, { label: "Stable" }, createElement(TextInput, { id: "stable-id" }))
    );
    const textarea = renderToStaticMarkup(
      createElement(TestField, { label: "Details" }, createElement(TextArea))
    );
    expect(input).toContain('<label class="eyebrow" for="stable-id">Stable</label>');
    expect(input).toContain('id="stable-id"');
    const generatedId = /<label class="eyebrow" for="([^"]+)">Details/.exec(textarea)?.[1];
    expect(generatedId).toBeTruthy();
    expect(textarea).toContain(`id="${generatedId}"`);
  });

  it("keeps Payload Reference search explicitly named", () => {
    expect(toolMarkup).toContain('aria-label="Search payloads"');
  });

  it("gives the menu button a name, controlled drawer, and expanded state", () => {
    const markup = renderToStaticMarkup(createElement(Home));
    expect(markup).toContain('aria-label="Open navigation"');
    expect(markup).toContain('aria-expanded="false"');
    expect(markup).toContain('aria-controls="mobile-tool-navigation"');
  });

  it("renders the open drawer as labelled modal navigation", () => {
    const markup = renderToStaticMarkup(
      createElement(MobileDrawer, {
        activeId: "payloads",
        drawerRef: createRef<HTMLElement>(),
        onClose: vi.fn(),
        onKeyDown: vi.fn(),
        onSelect: vi.fn(),
      })
    );
    expect(markup).toContain('role="dialog"');
    expect(markup).toContain('aria-modal="true"');
    expect(markup).toContain('aria-label="Tool navigation"');
    expect(markup).toContain('<nav aria-label="Tools"');
  });

  it("maps Escape to drawer closure", () => {
    expect(getDrawerKeyAction("Escape", false, 2, 7)).toBe("close");
  });

  it("restores focus to the menu trigger after closure", () => {
    const focus = vi.fn();
    restoreDrawerFocus({ focus }, (callback) => callback());
    expect(focus).toHaveBeenCalledOnce();
  });

  it("keeps Tab navigation inside the drawer while navigation uses buttons", () => {
    expect(getDrawerKeyAction("Tab", false, 6, 7)).toBe("focus-first");
    expect(getDrawerKeyAction("Tab", true, 0, 7)).toBe("focus-last");
    const sidebar = renderToStaticMarkup(
      createElement(Sidebar, { activeId: "payloads", onSelect: vi.fn() })
    );
    expect(sidebar.match(/<button/g)?.length).toBeGreaterThan(1);
  });
});
