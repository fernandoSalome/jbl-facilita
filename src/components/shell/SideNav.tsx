"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavItem = { href?: string; label: string; icon: keyof typeof ICONS; soon?: boolean; exact?: boolean };

const ICONS = {
  grid: "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z",
  map: "M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14",
  doc: "M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6M8 13h8M8 17h5",
  layers: "m12 3 9 5-9 5-9-5 9-5zM3 13l9 5 9-5",
  target: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  users: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8",
  key: "M15 7a4 4 0 1 1-3.9 5H3v3h3v3h3v-3h2.1A4 4 0 0 1 15 7z",
  chart: "M3 3v18h18M7 15l4-4 3 3 5-6",
  folder: "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
  flag: "M4 21V4M4 4h12l-2 4 2 4H4",
  check: "M9 11l3 3 8-8M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9",
  chat: "M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-6.4A8 8 0 1 1 21 12z",
};

function Icon({ d }: { d: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

export default function SideNav({ items }: { items: NavItem[] }) {
  const path = usePathname();
  return (
    <nav className="flex-1 overflow-auto px-3 py-4">
      <ul className="grid gap-0.5">
        {items.map((it) => {
          const active = it.href && (it.exact ? path === it.href : path.startsWith(it.href));
          if (it.soon || !it.href) {
            return (
              <li key={it.label} className="flex cursor-default items-center gap-3 rounded px-3 py-2 text-[14px] text-white/35" title="Em breve">
                <Icon d={ICONS[it.icon]} />
                <span className="flex-1">{it.label}</span>
                <span className="rounded-sm border border-white/15 px-1.5 py-px text-[9.5px] font-bold uppercase tracking-wider text-white/40">em breve</span>
              </li>
            );
          }
          return (
            <li key={it.label}>
              <Link
                href={it.href}
                className={`relative flex items-center gap-3 rounded px-3 py-2 text-[14px] font-medium transition ${
                  active ? "bg-white/[0.09] text-white" : "text-white/75 hover:bg-white/[0.05] hover:text-white"
                }`}
              >
                {active && <span className="absolute inset-y-1.5 left-0 w-[3px] rounded-full bg-gold" />}
                <span className={active ? "text-gold" : ""}>
                  <Icon d={ICONS[it.icon]} />
                </span>
                {it.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
