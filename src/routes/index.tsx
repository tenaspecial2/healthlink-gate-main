import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { HeartPulse, Stethoscope, ShieldCheck, MessageSquareHeart, Loader2, Send, CheckCircle2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, homeForUser } from "@/hooks/useAuth";
import { generateLoginToken, pollLoginToken, createSessionFromToken } from "@/lib/bot-auth";

const BOT_USERNAME = "Tenaspecialbot";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tena Specal — Talk to Verified Specialist Doctors" },
      { name: "description", content: "Sign up as a patient or a doctor on Tena Specal and start secure online specialist consultations in Ethiopia." },
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
            Real doctors.<br />
            <span className="text-gradient-brand">Real answers.</span>
          </h1>
          <p className="mt-5 max-w-md text-base text-muted-foreground">
            Tena Specal connects patients with verified specialist doctors for private online consultations — no queues, no travel, no guesswork.
          </p>
          <div className="mt-9 grid gap-3 sm:grid-cols-2">
            <Feature icon={<ShieldCheck className="h-5 w-5" />} title="Verified doctors only" text="Every doctor uploads a certificate reviewed by our team." />
            <Feature icon={<MessageSquareHeart className="h-5 w-5" />} title="Private chat" text="Chat one-on-one once your payment is confirmed." />
            <Feature icon={<HeartPulse className="h-5 w-5" />} title="All specialties" text="From general care to cardiology and mental health." />
            <Feature icon={<Stethoscope className="h-5 w-5" />} title="Fair plans" text="300, 500 or 1000 ETB — pay only for what you need." />
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
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">{icon}</div>
      <div className="mt-3 text-sm font-semibold">{title}</div>
      <p className="mt-1 text-xs text-muted-foreground">{text}</p>
    </div>
  );
}

type Step = "idle" | "waiting" | "done";

function AuthCard({ onDone }: { onDone: () => Promise<void> }) {
  const [role, setRole] = useState<Role>("patient");
  const [step, setStep] = useState<Step>("idle");
  const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const navigate = useNavigate();

  // Clean up polling on unmount
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const startLogin = async () => {
    setBusy(true);
    try {
      const { token: t } = await generateLoginToken({ data: { role } });
      setToken(t);
      setStep("waiting");

      // Open bot deep link
      window.open(`https://t.me/${BOT_USERNAME}?start=login_${t}`, "_blank");

      // Poll every 2 seconds
      pollRef.current = setInterval(async () => {
        try {
          const res = await pollLoginToken({ data: { token: t } });
          if (res.verified) {
            clearInterval(pollRef.current!);
            await finishLogin(t);
          }
        } catch {
          // Token expired or error
          clearInterval(pollRef.current!);
          toast.error("Login expired. Please try again.");
          setStep("idle");
          setToken(null);
        }
      }, 2000);
    } catch (err) {
      toast.error("Failed to start login. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const finishLogin = async (t: string) => {
    try {
      const { hashed_token } = await createSessionFromToken({ data: { token: t } });
      if (!hashed_token) throw new Error("No token");

      const { error } = await supabase.auth.verifyOtp({ type: "email", token_hash: hashed_token });
      if (error) throw error;

      setStep("done");
      toast.success("Welcome to Tena Specal! 🚀");
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
      toast.error(err instanceof Error ? err.message : "Login failed.");
      setStep("idle");
      setToken(null);
    }
  };

  const reset = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    setStep("idle");
    setToken(null);
  };

  return (
    <Card className="border-border shadow-card">
      <CardContent className="p-6">
        {/* Role selector */}
        <Tabs value={role} onValueChange={(v) => { setRole(v as Role); reset(); }}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="patient" className="gap-2"><HeartPulse className="h-4 w-4" /> Patient</TabsTrigger>
            <TabsTrigger value="doctor" className="gap-2"><Stethoscope className="h-4 w-4" /> Doctor</TabsTrigger>
          </TabsList>
          <TabsContent value="patient" className="mt-3">
            <p className="text-sm text-muted-foreground">Browse specialists, choose a plan and start chatting.</p>
          </TabsContent>
          <TabsContent value="doctor" className="mt-3">
            <p className="text-sm text-muted-foreground">Join as a doctor, complete your profile and get verified.</p>
          </TabsContent>
        </Tabs>

        {/* Login section */}
        <div className="mt-6 flex flex-col items-center gap-4 text-center">
          {step === "idle" && (
            <>
              <p className="text-sm font-semibold">Sign up or log in with Telegram</p>
              <p className="text-xs text-muted-foreground">
                Click below — your Telegram Bot will open and send you a login confirmation.
              </p>
              <Button
                variant="hero"
                size="lg"
                className="w-full gap-2"
                onClick={startLogin}
                disabled={busy}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Login via Telegram Bot
              </Button>
            </>
          )}

          {step === "waiting" && (
            <div className="flex w-full flex-col items-center gap-4">
              <div className="rounded-full bg-accent p-4">
                <Loader2 className="h-8 w-8 animate-spin text-accent-foreground" />
              </div>
              <div>
                <p className="text-sm font-semibold">Waiting for confirmation…</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Open the Telegram bot that just opened and press <strong>Start</strong> or <strong>Confirm</strong>.
                </p>
              </div>
              <Button variant="outline" size="sm" className="gap-2" onClick={reset}>
                <RefreshCw className="h-3 w-3" /> Try again
              </Button>
              <button
                className="text-xs text-muted-foreground underline"
                onClick={() => window.open(`https://t.me/${BOT_USERNAME}?start=login_${token}`, "_blank")}
              >
                Bot didn't open? Click here
              </button>
            </div>
          )}

          {step === "done" && (
            <div className="flex flex-col items-center gap-2">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
              <p className="text-sm font-semibold">Signed in! Redirecting…</p>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          By continuing you agree that consultations are advisory and not a replacement for emergency care.
        </p>
      </CardContent>
    </Card>
  );
}
