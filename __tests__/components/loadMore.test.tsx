import { describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import LoadMore from "@/components/shared/LoadMore";
import { useIncrementalList } from "@/lib/pagination/useIncrementalList";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const ITEMS = Array.from({ length: 30 }, (_, i) => `item-${i}`);

function List({ items, resetKey }: { items: string[]; resetKey: string }) {
  const { visible, shown, total, showMore } = useIncrementalList(items, 12, resetKey);
  return (
    <div>
      <ul>{visible.map((v) => <li key={v}>{v}</li>)}</ul>
      <LoadMore shown={shown} total={total} onLoadMore={showMore} noun="things" />
    </div>
  );
}

function mount(node: React.ReactElement) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  act(() => root.render(node));
  return { host, root };
}

describe("LoadMore + useIncrementalList", () => {
  it("shows one page, then more on click, then hides the button", () => {
    const { host } = mount(<List items={ITEMS} resetKey="a" />);
    expect(host.querySelectorAll("li")).toHaveLength(12);
    expect(host.textContent).toContain("Showing 12 of 30 things");

    const btn = () => host.querySelector("button") as HTMLButtonElement | null;
    act(() => btn()!.click());
    expect(host.querySelectorAll("li")).toHaveLength(24);
    act(() => btn()!.click());
    expect(host.querySelectorAll("li")).toHaveLength(30);
    expect(btn()).toBeNull();
    expect(host.textContent).toContain("Showing 30 of 30 things");
  });

  it("goes back to the first page when the reset key changes", () => {
    const host = document.createElement("div");
    const root = createRoot(host);
    act(() => root.render(<List items={ITEMS} resetKey="a" />));
    act(() => (host.querySelector("button") as HTMLButtonElement).click());
    expect(host.querySelectorAll("li")).toHaveLength(24);

    act(() => root.render(<List items={ITEMS.slice(0, 20)} resetKey="b" />));
    expect(host.querySelectorAll("li")).toHaveLength(12);
    expect(host.textContent).toContain("Showing 12 of 20 things");
  });

  it("renders no button for a short list", () => {
    const { host } = mount(<List items={ITEMS.slice(0, 5)} resetKey="a" />);
    expect(host.querySelectorAll("li")).toHaveLength(5);
    expect(host.querySelector("button")).toBeNull();
  });

  it("loads the next page when the sentinel scrolls into view", () => {
    let trigger: (() => void) | undefined;
    const disconnect = vi.fn();
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(cb: IntersectionObserverCallback) {
          trigger = () => cb([{ isIntersecting: true } as IntersectionObserverEntry], this as never);
        }
        observe() {}
        disconnect = disconnect;
      },
    );
    const { host } = mount(<List items={ITEMS} resetKey="a" />);
    expect(host.querySelectorAll("li")).toHaveLength(12);
    act(() => trigger!());
    expect(host.querySelectorAll("li")).toHaveLength(24);
    vi.unstubAllGlobals();
  });

  it("renders nothing for an empty list", () => {
    const { host } = mount(<List items={[]} resetKey="a" />);
    expect(host.querySelector("p")).toBeNull();
  });
});
