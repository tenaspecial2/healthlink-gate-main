import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { HeartPulse, Stethoscope, ShieldCheck, MessageSquareHeart, Loader2, Send } from "lucide-react";
import { toast } from "sonner";

import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

import { useAuth, homeForUser } from "@/hooks/useAuth";
import { verifyTelegramAuth } from "@/lib/telegram-auth";

const BOT_USERNAME = "Tenaspecialbot";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tena Specal — Talk to Verified Specialist Doctors" },
      {
        name: "description",
        content:
          "Sign up as a patient or a doctor on Tena Specal and start secure online specialist consultations in Ethiopia.",
      },
      { property: "og:title", content: "Tena Specal — Talk to Verified Specialist Doctors" },
      {
        property: "og:description",
        content: "Sign up as a patient or a doctor on Tena Specal and start secure online specialist consultations in Ethiopia.",
      },
    ],
  }),
  component: LandingPage,
});

type Role = "patient" | "doctor";

function LandingPage() {
  const { user, profile, isAdmin, loading, refresh } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user && profile) {
      void navigate({ to: homeForUser({ isAdmin, accountType: profile.account_type }) });
    }
  }, [loading, user, profile, isAdmin, navigate]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-soft">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-gradient-glow" />
      <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-10 lg:grid-cols-2 lg:gap-16 lg:py-20">
        <div>
          <BrandLogo size={54} subtitle="የጤና እገዛ እና የጤና ባለሙያዎች መድረክ" />
          <h1 className="mt-10 text-4xl font-extrabold leading-tight sm:text-5xl">
            Real doctors.
            <br />
            <span className="text-gradient-brand">Real answers.</span>
          </h1>
          <p className="mt-5 max-w-md text-base text-muted-foreground">
            Tena Specal connects patients with verified specialist doctors for private online
            consultations — no queues, no travel, no guesswork.
          </p>

          <div className="mt-9 grid gap-3 sm:grid-cols-2">
            <Feature
              icon={<ShieldCheck className="h-5 w-5" />}
              title="Verified doctors only"
              text="Every doctor uploads a certificate reviewed by our team."
            />
            <Feature
              icon={<MessageSquareHeart className="h-5 w-5" />}
              title="Private chat"
              text="Chat one-on-one once your payment is confirmed."
            />
            <Feature
              icon={<HeartPulse className="h-5 w-5" />}
              title="All specialties"
              text="From general care to cardiology and mental health."
            />
            <Feature
              icon={<Stethoscope className="h-5 w-5" />}
              title="Fair plans"
              text="300, 500 or 1000 ETB — pay only for what you need."
            />
          </div>
        </div>

        <div className="lg:pt-6">
          <AuthCard onDone={refresh} />
        </div>
      </div>
    </div>
  );
}

function Feature({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-xl border border-border bg-card/70 p-4 shadow-soft">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
        {icon}
      </div>
      <div className="mt-3 text-sm font-semibold">{title}</div>
      <p className="mt-1 text-xs text-muted-foreground">{text}</p>
    </div>
  );
}

function AuthCard({ onDone }: { onDone: () => Promise<void> }) {
  const [role, setRole] = useState<Role>("patient");
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const widgetRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // ── Telegram Login Widget ────────────────────────────────────────
  useEffect(() => {
    const container = widgetRef.current;
    if (!container) return;
    container.innerHTML = "";

    (window as any).onTelegramAuth = async (tgUser: any) => {
      setBusy(true);
      try {
        const result = await verifyTelegramAuth({ data: { telegramUser: tgUser, role } });
        if (!result?.token) throw new Error("Auth failed");

        const { error } = await supabase.auth.verifyOtp({
          type: "email",
          token_hash: result.token,
        });
        if (error) throw error;

        toast.success("Signed in with Telegram! 🚀");
        await onDone();
        const { data } = await supabase.auth.getUser();
        const userId = data.user?.id;
        if (userId) {
          const [{ data: prof }, { data: roles }] = await Promise.all([
            supabase.from("profiles").select("account_type").eq("id", userId).maybeSingle(),
            supabase.from("user_roles").select("role").eq("user_id", userId),
          ]);
          const admin = Boolean(roles?.some((r: any) => r.role === "admin"));
          void navigate({ to: homeForUser({ isAdmin: admin, accountType: prof?.account_type ?? role }) });
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Telegram login failed.");
      } finally {
        setBusy(false);
      }
    };

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.setAttribute("data-telegram-login", BOT_USERNAME);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-radius", "8");
    script.setAttribute("data-onauth", "onTelegramAuth(user)");
    script.setAttribute("data-request-access", "write");
    script.async = true;
    container.appendChild(script);

    return () => { delete (window as any).onTelegramAuth; };
  }, [role]);

  // ── Email / Password submit ──────────────────────────────────────
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        if (!fullName.trim()) { toast.error("Please enter your full name."); return; }
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName.trim(), phone: phone.trim(), account_type: role },
          },
        });
        if (error) throw error;
        toast.success("Account created. Welcome to Tena Specal!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        toast.success("Signed in.");
      }
      await onDone();
      const { data } = await supabase.auth.getUser();
      const userId = data.user?.id;
      if (userId) {
        const [{ data: prof }, { data: roles }] = await Promise.all([
          supabase.from("profiles").select("account_type").eq("id", userId).maybeSingle(),
          supabase.from("user_roles").select("role").eq("user_id", userId),
        ]);
        const admin = Boolean(roles?.some((r: any) => r.role === "admin"));
        void navigate({ to: homeForUser({ isAdmin: admin, accountType: prof?.account_type ?? role }) });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="border-border shadow-card">
      <CardContent className="p-6">
        {/* Role selector */}
        <Tabs value={role} onValueChange={(v) => setRole(v as Role)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="patient" className="gap-2"><HeartPulse className="h-4 w-4" /> Patient</TabsTrigger>
            <TabsTrigger value="doctor" className="gap-2"><Stethoscope className="h-4 w-4" /> Doctor</TabsTrigger>
          </TabsList>
          <TabsContent value="patient" className="mt-4">
            <p className="text-sm text-muted-foreground">Create a patient account to browse specialists, choose a plan and start chatting.</p>
          </TabsContent>
          <TabsContent value="doctor" className="mt-4">
            <p className="text-sm text-muted-foreground">Join as a doctor. You'll complete a professional profile and upload your certificate for verification.</p>
          </TabsContent>
        </Tabs>

        {/* Telegram Login */}
        <div className="mt-5 flex flex-col items-center gap-2">
          <p className="text-xs text-muted-foreground font-medium">Sign in instantly with Telegram</p>
          <div ref={widgetRef} className="flex justify-center" />
          {busy && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
        </div>

        {/* Divider */}
        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">or use email</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        {/* Mode toggle */}
        <div className="flex rounded-lg bg-muted p-1 text-sm font-medium">
          {(["signup", "signin"] as const).map((m) => (
            <button key={m} type="button" onClick={() => setMode(m)}
              className={`flex-1 rounded-md py-1.5 transition-colors ${mode === m ? "bg-card text-foreground shadow-soft" : "text-muted-foreground"}`}>
              {m === "signup" ? "Sign up" : "Log in"}
            </button>
          ))}
        </div>

        {/* Email / Password form */}
        <form onSubmit={submit} className="mt-5 space-y-4">
          {mode === "signup" && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="fullName">Full name</Label>
                <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)}
                  placeholder={role === "doctor" ? "Dr. Abebe Kebede" : "Hanna Tesfaye"} maxLength={100} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone number</Label>
                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="09xxxxxxxx" maxLength={20} />
              </div>
            </>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com" maxLength={255} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters" minLength={6} maxLength={72} required />
          </div>
          <Button type="submit" variant="hero" size="lg" className="w-full" disabled={busy}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === "signup" ? `Create ${role} account` : "Log in"}
          </Button>
        </form>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          By continuing you agree that consultations are advisory and not a replacement for emergency care.
        </p>
      </CardContent>
    </Card>
  );
}

