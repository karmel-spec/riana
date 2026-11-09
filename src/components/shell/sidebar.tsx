"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { NavItem } from "@/lib/nav";
import { Close, Menu, Search } from "@/components/icons";
import { ViewToggle } from "./view-toggle";

const GROUPS_KEY = "greene_nav_groups";

type Props = {
  items: Omit<NavItem, "icon">[] & { icon?: never }[];
  adminItems: Omit<NavItem, "icon">[];
  viewerName: string;
  viewerBlurb: string;
  demo: boolean;
  canToggleView: boolean;      // false for parents, who only have the Brief version
  children?: React.ReactNode;  // the role switcher, demo-only
};

function NavLink({ item, active, onClick }: { item: Omit<NavItem, "icon">; active: boolean; onClick: () => void }) {
  return (
    <Link
      href={item.href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`mr-4 flex min-h-[44px] items-center justify-between rounded-r-full py-1.5 pl-7 pr-4 no-underline ${
        active ? "bg-parchment font-bold text-evergreen" : "text-paper hover:bg-evergreen-mid/40"
      }`}
    >
      <span>{item.label}</span>
      {item.built === false && (
        <span className={`text-[0.7rem] font-bold uppercase tracking-wide ${active ? "text-evergreen-mid" : "text-mist"}`}>soon</span>
      )}
    </Link>
  );
}

export function Sidebar({ items, adminItems, viewerName, viewerBlurb, demo, canToggleView, children }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  // Stores the path the menu was opened on, so navigating closes it.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const setOpen = (next: boolean) => setOpenOn(next ? pathname : null);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const close = () => setOpen(false);

  // Only the group headers show by default; a group opens when clicked or when it holds the current page.
  const all = [...items, ...adminItems.map((i) => ({ ...i, group: "Admin" }))];
  // Blocks in the order the nav lists them: a bare link, or a collapsible group.
  type Block = { kind: "link"; item: (typeof all)[number] } | { kind: "group"; name: string; items: typeof all };
  const blocks = all.reduce<Block[]>((acc, i) => {
    if (!i.group) { acc.push({ kind: "link", item: i }); return acc; }
    const g = acc.find((b): b is Extract<Block, { kind: "group" }> => b.kind === "group" && b.name === i.group);
    if (g) g.items.push(i); else acc.push({ kind: "group", name: i.group, items: [i] });
    return acc;
  }, []);
  const [openGroups, setOpenGroupsState] = useState<Record<string, boolean>>({});
  // Remembered per browser so the sidebar opens the way it was left (read once the client has mounted).
  useEffect(() => {
    let saved: Record<string, boolean> | null = null;
    try { const raw = localStorage.getItem(GROUPS_KEY); saved = raw ? JSON.parse(raw) : null; } catch { /* storage unavailable */ }
    if (saved) queueMicrotask(() => setOpenGroupsState(saved!));
  }, []);
  const setOpenGroups = (fn: (o: Record<string, boolean>) => Record<string, boolean>) => setOpenGroupsState((o) => {
    const next = fn(o);
    try { localStorage.setItem(GROUPS_KEY, JSON.stringify(next)); } catch { /* storage unavailable */ }
    return next;
  });

  const panel = (
    <nav aria-label="Binder sections" className="on-dark flex h-full flex-col gap-1 overflow-y-auto bg-evergreen py-7 text-paper">
      <div className="mb-4 px-7">
        <Link href="/" className="block font-serif text-[1.45rem] font-bold leading-tight text-paper no-underline">
          The Greene<br />Family Binder
        </Link>
        <div className="mt-1 text-[0.85rem] text-mist">Rich &amp; Diana · Lake Havasu City</div>
      </div>
      {canToggleView && <div className="mb-3 px-7"><ViewToggle current="full" /></div>}
      <form
        role="search"
        className="mb-3 px-7"
        onSubmit={(e) => {
          e.preventDefault();
          const q = new FormData(e.currentTarget).get("q");
          if (typeof q === "string" && q.trim()) { close(); router.push(`/search?q=${encodeURIComponent(q.trim())}`); }
        }}
      >
        <label className="flex min-h-[44px] items-center gap-2 rounded-xl border border-mist/50 bg-evergreen-deep/40 px-3 text-paper focus-within:border-paper">
          <Search size={18} className="shrink-0 text-mist" aria-hidden />
          <input type="search" name="q" placeholder="Search…" aria-label="Search the whole binder"
            className="min-w-0 flex-1 bg-transparent text-[1rem] text-paper placeholder:text-mist focus:outline-none" />
        </label>
      </form>
      {blocks.map((b) => {
        if (b.kind === "link") return <NavLink key={b.item.href} item={b.item} active={isActive(b.item.href)} onClick={close} />;
        const g = b;
        const hasActive = g.items.some((i) => isActive(i.href));
        const expanded = openGroups[g.name] ?? hasActive;
        const id = `nav-group-${g.name.replace(/\W+/g, "-").toLowerCase()}`;
        return (
          <div key={g.name} className="mt-1">
            <button
              type="button"
              aria-expanded={expanded}
              aria-controls={id}
              onClick={() => setOpenGroups((o) => ({ ...o, [g.name]: !expanded }))}
              className={`mr-4 flex min-h-[44px] w-[calc(100%-1rem)] items-center justify-between rounded-r-full py-1.5 pl-7 pr-4 text-left text-[0.8rem] font-bold uppercase tracking-[0.1em] hover:bg-evergreen-mid/40 ${hasActive && !expanded ? "text-paper" : "text-mist"}`}
            >
              <span>{g.name}</span>
              <span aria-hidden className={`text-[0.7rem] transition-transform ${expanded ? "rotate-90" : ""}`}>▶</span>
            </button>
            {expanded && (
              <div id={id} className="mb-1">
                {g.items.map((i) => <NavLink key={i.href} item={i} active={isActive(i.href)} onClick={close} />)}
              </div>
            )}
          </div>
        );
      })}
      <div className="mx-7 mt-auto border-t border-evergreen-mid pt-5">
        <div className="text-[0.85rem] text-mist">Signed in as</div>
        <div className="font-bold">{viewerName}</div>
        <div className="text-[0.85rem] text-mist">{viewerBlurb}</div>
        {children}
        {!demo && <Link href="/account/password" className="mt-3 block text-[0.9rem] text-mist underline">Change password</Link>}
        {!demo && (
          <form action="/logout" method="post" className="mt-3">
            <button className="btn border border-mist/50 px-4 text-[0.9rem] text-paper hover:bg-evergreen-mid/40">Sign out</button>
          </form>
        )}
      </div>
    </nav>
  );

  return (
    <>
      {/* Desktop */}
      <aside className="hidden w-[270px] shrink-0 lg:block">
        <div className="sticky top-0 h-dvh">{panel}</div>
      </aside>

      {/* Phone / tablet header */}
      <header className="on-dark sticky top-0 z-30 flex items-center justify-between bg-evergreen px-3 py-2 text-paper lg:hidden">
        <button
          type="button"
          aria-label={open ? "Close sections" : "Open sections"}
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen(!open)}
          className="flex h-11 w-11 items-center justify-center rounded-xl"
        >
          {open ? <Close /> : <Menu />}
        </button>
        <Link href="/" className="font-serif text-[1.15rem] font-bold text-paper no-underline">The Greene Family Binder</Link>
        <div className="w-11" />
      </header>
      {open && (
        <div id="mobile-nav" className="fixed inset-0 top-[60px] z-20 lg:hidden">
          <button type="button" aria-label="Close sections" onClick={close} className="absolute inset-0 bg-ink/40" />
          <div className="relative h-full w-[min(320px,85vw)] shadow-xl">{panel}</div>
        </div>
      )}
    </>
  );
}
