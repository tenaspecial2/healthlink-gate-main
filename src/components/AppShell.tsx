import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut, Bell, ShieldCheck } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { SecurityQuestionsGate } from "@/components/SecurityQuestionsGate";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { SUPPORT_TELEGRAM, SUPPORT_TELEGRAM_URL, DOCS_BOT_TELEGRAM, DOCS_BOT_URL } from "@/lib/tena";


type Notification = {
  id: string;
  title: string;
  body: string | null;
  read: boolean;
  created_at: string;
};

export function AppShell({
  children,
  nav,
  homeTo = "/",
}: {
  children: ReactNode;
  nav?: ReactNode;
  homeTo?: string;
}) {
  const { profile, signOut, user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (!user) return;
    void supabase
      .from("notifications")
      .select("id, title, body, read, created_at")
      .order("created_at", { ascending: false })
      .limit(15)
      .then(({ data }) => setNotifications((data as Notification[]) ?? []));
  }, [user]);

  // Presence heartbeat: powers the green/grey online dot on doctor profiles.
  useEffect(() => {
    if (!user) return;
    const beat = () => {
      void supabase.rpc("touch_presence");
    };
    beat();
    const id = window.setInterval(beat, 60_000);
    return () => window.clearInterval(id);
  }, [user]);


  const unread = notifications.filter((n) => !n.read).length;

  const markRead = async () => {
    if (unread === 0) return;
    await supabase.from("notifications").update({ read: true }).eq("read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-card/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
          <Link to={homeTo} className="shrink-0">
            <BrandLogo size={36} />
          </Link>
          <div className="ml-auto flex items-center gap-1">
            {nav}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative" onClick={markRead}>
                  <Bell />
                  {unread > 0 && (
                    <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {notifications.length === 0 && (
                  <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                    Nothing yet.
                  </div>
                )}
                {notifications.map((n) => (
                  <div key={n.id} className="border-b border-border/60 px-2 py-2 last:border-0">
                    <div className="text-sm font-medium">{n.title}</div>
                    {n.body && <div className="text-xs text-muted-foreground">{n.body}</div>}
                    <div className="mt-1 text-[10px] text-muted-foreground">
                      {new Date(n.created_at).toLocaleString()}
                    </div>
                  </div>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="soft" size="sm" className="gap-2">
                  <span className="max-w-[140px] truncate">
                    {profile?.full_name || profile?.email || "Account"}
                  </span>
                  <Badge variant="secondary" className="capitalize">
                    {profile?.account_type ?? "user"}
                  </Badge>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                  {profile?.email}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {isAdmin && (
                  <>
                    <DropdownMenuItem
                      onClick={() => {
                        void navigate({ to: "/admin" });
                      }}
                      className="text-primary font-medium"
                    >
                      <ShieldCheck className="mr-2 h-4 w-4" /> Admin Console
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem
                  onClick={async () => {
                    await signOut();
                    void navigate({ to: "/" });
                  }}
                >
                  <LogOut className="mr-2 h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
      <main>{children}</main>
      <footer className="mt-12 border-t border-border bg-card/60">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="text-muted-foreground">
            Need help? Message our support on Telegram{" "}
            <a
              href={SUPPORT_TELEGRAM_URL}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-primary hover:underline"
            >
              {SUPPORT_TELEGRAM}
            </a>
          </div>
          <div className="text-muted-foreground">
            Free health documents:{" "}
            <a
              href={DOCS_BOT_URL}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-primary hover:underline"
            >
              {DOCS_BOT_TELEGRAM}
            </a>
          </div>
        </div>
      </footer>
      <SecurityQuestionsGate />

    </div>
  );
}
