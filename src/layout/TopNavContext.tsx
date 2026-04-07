import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type DependencyList,
  type ReactNode,
} from "react";
import { ScreenHeader } from "../components/ScreenHeader";
import type { OverflowMenuItem } from "../components/OverflowMenu";

export type TopNavMainConfig = {
  variant: "main";
  title: string;
  createLabel: string;
  onCreate: () => void;
  createDisabled?: boolean;
  omitCreate?: boolean;
  menuLabel: string;
  menuItems: OverflowMenuItem[];
};

export type TopNavDetailConfig = {
  variant: "detail";
  leading: ReactNode;
  center?: ReactNode;
  trailing?: ReactNode;
};

export type TopNavConfig = TopNavMainConfig | TopNavDetailConfig;

type Ctx = {
  setTopNav: (config: TopNavConfig | null) => void;
};

const TopNavContext = createContext<Ctx | null>(null);

export function useTopNavContext(): Ctx {
  const c = useContext(TopNavContext);
  if (!c) throw new Error("useTopNavContext must be used within TopNavShell");
  return c;
}

/** Register route chrome; clears on unmount. Return `null` to hide the bar (e.g. loading). */
export function useTopNav(factory: () => TopNavConfig | null, deps: DependencyList) {
  const { setTopNav } = useTopNavContext();
  useLayoutEffect(() => {
    setTopNav(factory());
    return () => setTopNav(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mirror `factory` dependencies in `deps`
  }, [setTopNav, ...deps]);
}

export function TopNavShell({ children }: { children: ReactNode }) {
  const [topNav, setTopNavState] = useState<TopNavConfig | null>(null);
  const setTopNav = useCallback((config: TopNavConfig | null) => {
    setTopNavState(config);
  }, []);

  const shellRef = useRef<HTMLElement>(null);
  const navRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    function applyHeight() {
      const shell = shellRef.current;
      const nav = navRef.current;
      if (!shell || !nav) return;
      const h = topNav != null ? nav.getBoundingClientRect().height : 0;
      shell.style.setProperty("--app-top-nav-height", `${h}px`);
    }

    applyHeight();
    if (topNav == null) return;

    const nav = navRef.current;
    if (!nav) return;

    const ro = new ResizeObserver(applyHeight);
    ro.observe(nav);
    return () => ro.disconnect();
  }, [topNav]);

  const ctx = useMemo(() => ({ setTopNav }), [setTopNav]);

  return (
    <TopNavContext.Provider value={ctx}>
      <main ref={shellRef} className="app-shell">
        <div className="app-top-nav" ref={navRef}>
          {topNav != null ? (
            topNav.variant === "main" ? (
              <ScreenHeader
                variant="main"
                title={topNav.title}
                createLabel={topNav.createLabel}
                onCreate={topNav.onCreate}
                createDisabled={topNav.createDisabled}
                omitCreate={topNav.omitCreate}
                menuLabel={topNav.menuLabel}
                menuItems={topNav.menuItems}
              />
            ) : (
              <ScreenHeader
                variant="detail"
                leading={topNav.leading}
                center={topNav.center}
                trailing={topNav.trailing}
              />
            )
          ) : null}
        </div>
        <div className="app-page">{children}</div>
      </main>
    </TopNavContext.Provider>
  );
}
