import { redirect } from "next/navigation";
import { Brand } from "@/components/Brand";
import { NavTabs } from "@/components/NavTabs";
import { LogoutButton } from "@/components/LogoutButton";
import { ToastProvider } from "@/components/Toast";
import { isAuthenticated } from "@/lib/server/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if (!(await isAuthenticated())) redirect("/login");
  return (
    <ToastProvider>
      <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col">
        <header className="relative px-4 pt-3 pb-2">
          <div className="absolute top-3 right-3">
            <LogoutButton />
          </div>
          <Brand />
        </header>
        <main className="flex-1 px-4 pb-28">{children}</main>
        <NavTabs />
      </div>
    </ToastProvider>
  );
}
