"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Calendar, Close, Dove, Home, Menu, People, Question, Book, Search, Sparkle, Tag } from "@/components/icons";

const ITEMS = [
  { href: "/", label: "Home", icon: Home, tab: true },
  { href: "/contacts", label: "Contacts", icon: People, tab: true },
  { href: "/calendar", label: "Calendar", icon: Calendar, tab: true },
  { href: "/collections/photos", label: "Photos", icon: Tag, tab: true },
  { href: "/riana", label: "Riana", icon: Sparkle },
  { href: "/questions", label: "Questions", icon: Question },
  { href: "/wishes", label: "Our Wishes", icon: Dove },
  { href: "/history", label: "Memories", icon: Book },
  { href: "/journals", label: "Journals", icon: Book },
  { href: "/collections/books", label: "Books", icon: Book },
  { href: "/collections/imemories", label: "Movies", icon: Book },
  { href: "/search", label: "Search", icon: Search },
];

/**
 * Brief-view navigation. Wide screens: a row of buttons under the title.
 * Phones: four tabs and "More" fixed along the bottom, where a thumb reaches.
 */
export function ParentNav() {
  const pathname = usePathname();
  // Remembers which page "More" was opened on, so going anywhere closes it.
  const [moreOn, setMoreOn] = useState<string | null>(null);
  const more = moreOn === pathname;
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const rest = ITEMS.filter((i) => !("tab" in i));
  const tabCls = (on: boolean) => `flex min-h-[64px] flex-1 flex-col items-center justify-center gap-0.5 text-[0.8rem] no-underline ${on ? "font-bold text-evergreen" : "font-semibold text-ink-soft"}`;

  return (
    <>
      <nav aria-label="Main" className="mx-auto hidden w-full max-w-[1100px] px-6 md:block">
        <ul className="flex flex-wrap gap-2 pb-3">
          {ITEMS.map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <Link href={href} aria-current={isActive(href) ? "page" : undefined}
                className={`flex min-h-[52px] items-center gap-2 rounded-full px-5 font-semibold no-underline ${isActive(href) ? "bg-parchment text-evergreen" : "text-paper hover:bg-evergreen-mid/40"}`}>
                <Icon size={22} /><span>{label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <nav aria-label="Main" className="fixed bottom-0 left-0 right-0 z-30 w-full max-w-[100vw] border-t border-rule bg-paper md:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <ul className="mx-auto flex max-w-[560px]">
          {ITEMS.filter((i) => "tab" in i).map(({ href, label, icon: Icon }) => (
            <li key={href} className="flex flex-1">
              <Link href={href} aria-current={isActive(href) && !more ? "page" : undefined} className={tabCls(isActive(href) && !more)}>
                <Icon size={26} /><span>{label}</span>
              </Link>
            </li>
          ))}
          <li className="flex flex-1">
            <button type="button" aria-expanded={more} onClick={() => setMoreOn(more ? null : pathname)} className={tabCls(more || rest.some((i) => isActive(i.href)))}>
              {more ? <Close size={26} /> : <Menu size={26} />}<span>More</span>
            </button>
          </li>
        </ul>
      </nav>

      {more && (
        <div role="dialog" aria-label="More places" className="fixed inset-x-0 bottom-0 top-0 z-20 flex flex-col justify-end bg-ink/40 md:hidden" onClick={() => setMoreOn(null)}>
          <ul className="mb-[64px] max-h-[75dvh] overflow-y-auto rounded-t-3xl bg-paper px-4 pb-4 pt-3 text-ink" style={{ marginBottom: "calc(64px + env(safe-area-inset-bottom))" }} onClick={(e) => e.stopPropagation()}>
            {rest.map(({ href, label, icon: Icon }) => (
              <li key={href} className="border-b border-rule-soft last:border-0">
                <Link href={href} aria-current={isActive(href) ? "page" : undefined} onClick={() => setMoreOn(null)}
                  className={`flex min-h-[60px] items-center gap-4 px-2 text-[1.2rem] font-semibold no-underline ${isActive(href) ? "text-evergreen" : "text-ink"}`}>
                  <Icon size={26} className="text-evergreen" /><span>{label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
