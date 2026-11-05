"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, Dove, Home, People, Question, Book } from "@/components/icons";

const ITEMS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/calendar", label: "My Calendar", icon: Calendar },
  { href: "/questions", label: "Questions", icon: Question },
  { href: "/wishes", label: "My Wishes", icon: Dove },
  { href: "/contacts", label: "People", icon: People },
  { href: "/history", label: "Memories", icon: Book },
];

export function ParentNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="mx-auto w-full max-w-[1100px] px-2 sm:px-6">
      <ul className="flex gap-1 overflow-x-auto pb-3 sm:gap-2">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href} className="shrink-0">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-[52px] items-center gap-2 rounded-full px-4 font-semibold no-underline sm:px-5 ${
                  active ? "bg-parchment text-evergreen" : "text-paper hover:bg-evergreen-mid/40"
                }`}
              >
                <Icon size={22} />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
