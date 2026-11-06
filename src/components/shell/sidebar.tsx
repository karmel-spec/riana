"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { NavItem } from "@/lib/nav";
import { Close, Menu } from "@/components/icons";

type Props = {
  items: Omit<NavItem, "icon">[] & { icon?: never }[];
  adminItems: Omit<NavItem, "icon">[];
  viewerName: string;
  viewerBlurb: string;
  demo: boolean;
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

export function Sidebar({ items, adminItems, viewerName, viewerBlurb, demo, children }: Props) {
  const pathname = usePathname();
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

  const panel = (
    <nav aria-label="Binder sections" className="on-dark flex h-full flex-col gap-1 overflow-y-auto bg-evergreen py-7 text-paper">
      <div className="mb-4 px-7">
        <Link href="/" className="block font-serif text-[1.45rem] font-bold leading-tight text-paper no-underline">
          The Greene<br />Family Binder
        </Link>
        <div className="mt-1 text-[0.85rem] text-mist">Rich &amp; Diana · Lake Havasu City</div>
      </div>
      {items.map((i) => <NavLink key={i.href} item={i} active={isActive(i.href)} onClick={close} />)}
      {adminItems.length > 0 && (
        <>
          <div className="mt-4 px-7 pb-1 text-[0.75rem] font-bold uppercase tracking-[0.1em] text-mist">Admin</div>
          {adminItems.map((i) => <NavLink key={i.href} item={i} active={isActive(i.href)} onClick={close} />)}
        </>
      )}
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
