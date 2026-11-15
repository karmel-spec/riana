// Inline stroke icons (no emoji, no icon font). All decorative: aria-hidden.
import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };
const base = (size: number) => ({
  width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor",
  strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true,
});

export const Home = ({ size = 22, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M3 11l9-7 9 7" /><path d="M5 10v10h14V10" /><path d="M10 20v-6h4v6" /></svg>
);
export const Question = ({ size = 22, ...p }: P) => (
  <svg {...base(size)} {...p}><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14" /><path d="M12 17.5h.01" /></svg>
);
export const Calendar = ({ size = 22, ...p }: P) => (
  <svg {...base(size)} {...p}><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M4 10h16" /><path d="M9 3v4" /><path d="M15 3v4" /></svg>
);
export const People = ({ size = 22, ...p }: P) => (
  <svg {...base(size)} {...p}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><circle cx="17" cy="9" r="2.5" /><path d="M16 14.5a5 5 0 0 1 5.5 5.5" /></svg>
);
export const Heart = ({ size = 22, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M20.8 8.6a5 5 0 0 0-8.8-3.2A5 5 0 0 0 3.2 8.6C3.2 14 12 20 12 20s8.8-6 8.8-11.4z" /></svg>
);
export const House = ({ size = 22, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M4 21V9l8-6 8 6v12" /><path d="M9 21v-7h6v7" /></svg>
);
export const Car = ({ size = 22, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M5 16l1.5-5.5A2 2 0 0 1 8.4 9h7.2a2 2 0 0 1 1.9 1.5L19 16" /><path d="M3 16h18v3H3z" /><path d="M6 19v2" /><path d="M18 19v2" /><path d="M7 16h.01" /><path d="M17 16h.01" /></svg>
);
export const Bank = ({ size = 22, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M3 10l9-6 9 6" /><path d="M5 10v8" /><path d="M9.5 10v8" /><path d="M14.5 10v8" /><path d="M19 10v8" /><path d="M3 20h18" /></svg>
);
export const Shield = ({ size = 22, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" /><path d="M9 12l2 2 4-4" /></svg>
);
export const Scroll = ({ size = 22, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M6 3h9l4 4v14H6z" /><path d="M14 3v5h5" /><path d="M9 13h7" /><path d="M9 17h5" /></svg>
);
export const Dove = ({ size = 22, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M12 21s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.5-7 10-7 10z" /></svg>
);
export const Book = ({ size = 22, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z" /><path d="M5 17a3 3 0 0 1 3-3h11" /></svg>
);
export const Key = ({ size = 22, ...p }: P) => (
  <svg {...base(size)} {...p}><circle cx="8" cy="14" r="4" /><path d="M11 11l9-9" /><path d="M16 6l2 2" /><path d="M18 4l2 2" /></svg>
);
export const Paw = ({ size = 22, ...p }: P) => (
  <svg {...base(size)} {...p}><circle cx="7" cy="9" r="1.8" /><circle cx="11" cy="6" r="1.8" /><circle cx="15.5" cy="7" r="1.8" /><circle cx="18.5" cy="11" r="1.8" /><path d="M8 18a4 4 0 0 1 8 0c0 1.5-1.5 2.5-4 2.5S8 19.5 8 18z" /></svg>
);
export const Check = ({ size = 22, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M5 12l4 4L19 7" /></svg>
);
export const Bell = ({ size = 22, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" /><path d="M10 20a2 2 0 0 0 4 0" /></svg>
);
export const Search = ({ size = 22, ...p }: P) => (
  <svg {...base(size)} {...p}><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>
);
export const Menu = ({ size = 22, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M4 7h16" /><path d="M4 12h16" /><path d="M4 17h16" /></svg>
);
export const Close = ({ size = 22, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M6 6l12 12" /><path d="M18 6L6 18" /></svg>
);
export const Plus = ({ size = 22, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M12 5v14" /><path d="M5 12h14" /></svg>
);
export const Alert = ({ size = 22, ...p }: P) => (
  <svg {...base(size)} {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v6" /><path d="M12 17h.01" /></svg>
);
export const Lock = ({ size = 22, ...p }: P) => (
  <svg {...base(size)} {...p}><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
);
export const Mic = ({ size = 22, ...p }: P) => (
  <svg {...base(size)} {...p}><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0" /><path d="M12 18v3" /></svg>
);
export const Sparkle = ({ size = 22, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" /></svg>
);
export const ChevronRight = ({ size = 22, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M9 6l6 6-6 6" /></svg>
);
export const Phone = ({ size = 22, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" /></svg>
);
export const Mail = ({ size = 22, ...p }: P) => (
  <svg {...base(size)} {...p}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></svg>
);
export const Tag = ({ size = 22, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M3 12V4h8l10 10-8 8z" /><circle cx="7.5" cy="8.5" r="1.5" /></svg>
);
export const Receipt = ({ size = 22, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M5 3h14v18l-2.5-1.5L14 21l-2-1.5L10 21l-2.5-1.5L5 21z" /><path d="M9 8h6" /><path d="M9 12h6" /></svg>
);
