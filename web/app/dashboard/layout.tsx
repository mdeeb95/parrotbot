import { redirect } from "next/navigation";
import Link from "next/link";
import { Toaster } from "sonner";
import { getAuthContext } from "@/lib/auth";
import { SidebarNav } from "./_components/sidebar-nav";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/");

  return (
    <div className="min-h-screen bg-bg">
      <div className="mx-auto flex max-w-[1200px] gap-8 px-6 py-8">
        <aside className="sticky top-8 hidden h-[calc(100vh-4rem)] w-[220px] shrink-0 flex-col justify-between md:flex">
          <div>
            <Link href="/dashboard" className="mb-8 flex items-center gap-2.5 text-[20px] font-bold">
              <span className="text-[24px]">🦜</span>
              Parrot
            </Link>
            <SidebarNav />
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-border bg-bg-elevated p-3">
            {ctx.user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={ctx.user.avatarUrl}
                alt=""
                className="h-9 w-9 rounded-full"
              />
            ) : (
              <div className="h-9 w-9 rounded-full bg-bg" />
            )}
            <div className="flex-1 overflow-hidden">
              <div className="truncate text-[13px] font-semibold text-text">
                {ctx.user.displayName}
              </div>
              <form action="/api/auth/signout" method="post">
                <button
                  type="submit"
                  className="text-[12px] text-text-muted hover:text-text"
                >
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
      <Toaster theme="dark" position="bottom-right" />
    </div>
  );
}
