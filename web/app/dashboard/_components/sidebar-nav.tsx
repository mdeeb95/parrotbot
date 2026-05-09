"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BookOpen, Activity, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/dashboard", label: "Overview", Icon: Home, exact: true },
  { href: "/dashboard/kb", label: "Knowledge Base", Icon: BookOpen },
  { href: "/dashboard/activity", label: "Activity", Icon: Activity },
  { href: "/dashboard/settings", label: "Settings", Icon: Settings },
];

export function SidebarNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {items.map(({ href, label, Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-2 text-[14px] transition-colors",
              active
                ? "bg-bg-elevated text-text"
                : "text-text-muted hover:bg-bg-elevated hover:text-text",
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
