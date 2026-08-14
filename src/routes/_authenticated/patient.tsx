import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Home,
  Sparkles,
  CreditCard,
  MessageSquare,
  Loader2,
  Upload,
  Stethoscope,
  ShieldCheck,
  Clock,
  CheckCircle2,
  XCircle,
  Copy,
} from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PLANS, PAYMENT_DETAILS, SPECIALTIES, planById } from "@/lib/tena";

export const Route = createFileRoute("/_authenticated/patient")({
  head: () => ({
    meta: [
      { title: "Patient Portal — Tena Specal" },
      {
        name: "description",
        content:
          "Find verified specialist doctors, pick a care plan and chat privately once your payment is approved.",
      },
      { property: "og:title", content: "Patient Portal — Tena Specal" },
      {
        property: "og:description",
        content: "Search specialists, choose a plan and start your consultation.",
      },
    ],
  }),
  component: PatientPage,
});

type Doctor = {
  id: string;
  doctor_id: string;
  full_name: string;
  specialty: string;
  city: string | null;
  experience_years: number | null;
  bio: string | null;
  languages: string | null;
  workplace: string | null;
};

type Consultation = {
  id: string;
  doctor_id: string;
  plan: string;
  amount: number;
  status: "pending" | "approved" | "declined";
  admin_note: string | null;
  created_at: string;
};

type Section = "home" | "services" | "plans" | "search";

function PatientPage() {
  const { user, profile } = useAuth();
  const [section, setSection] = useState<Section>("home");
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [consults, setConsults] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [specialty, setSpecialty] = useState("all");
  const [selected, setSelected] = useState<Doctor | null>(null);
  const [presetPlan, setPresetPlan] = useState<string>("standard");

  const load = async () => {
    const [{ data: docs }, { data: cons }] = await Promise.all([
      supabase
        .from("public_doctor_profiles")
        .select(
          "doctor_id, full_name, specialty, city, experience_years, bio, languages, workplace",
        )
        .order("created_at", { ascending: false }),
      user
        ? supabase
            .from("consultations")
            .select("id, doctor_id, plan, amount, status, admin_note, created_at")
            .eq("patient_id", user.id)
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [] as Consultation[] }),
    ]);
    setDoctors(
      ((docs as Omit<Doctor, "id">[]) ?? []).map((d) => ({ ...d, id: d.doctor_id })),
    );
    setConsults((cons as Consultation[]) ?? []);

    setLoading(false);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const doctorName = (id: string) =>
    doctors.find((d) => d.doctor_id === id)?.full_name ?? "Your doctor";

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return doctors.filter((d) => {
      const matchSpec = specialty === "all" || d.specialty === specialty;
      const matchQ =
        !q ||
        d.full_name.toLowerCase().includes(q) ||
        d.specialty.toLowerCase().includes(q) ||
        (d.city ?? "").toLowerCase().includes(q);
      return matchSpec && matchQ;
    });
  }, [doctors, query, specialty]);

  const nav = (
    <div className="hidden items-center gap-1 md:flex">
      {(
        [
          ["home", "Home", <Home key="i" className="h-4 w-4" />],
          ["services", "Services", <Sparkles key="i" className="h-4 w-4" />],
          ["plans", "Plans", <CreditCard key="i" className="h-4 w-4" />],
          ["search", "Search", <Search key="i" className="h-4 w-4" />],
        ] as [Section, string, React.ReactNode][]
      ).map(([key, label, icon]) => (
        <Button
          key={key}
          variant={section === key ? "soft" : "ghost"}
          size="sm"
          onClick={() => setSection(key)}
          className="gap-1.5"
        >
          {icon}
          {label}
        </Button>
      ))}
    </div>
  );

  return (
    <AppShell homeTo="/patient" nav={nav}>
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-8">
        <div className="mb-6 flex gap-1 overflow-x-auto md:hidden">
          {(["home", "services", "plans", "search"] as Section[]).map((k) => (
            <Button
              key={k}
              variant={section === k ? "soft" : "ghost"}
              size="sm"
              onClick={() => setSection(k)}
              className="capitalize"
            >
              {k}
            </Button>
          ))}
        </div>

        {consults.length > 0 && (
          <div className="mb-8 space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              My consultations
            </h2>
            {consults.map((c) => (
              <ConsultationRow key={c.id} c={c} doctorName={doctorName(c.doctor_id)} />
            ))}
          </div>
        )}

        {section === "home" && (
          <HomeSection
            name={profile?.full_name ?? null}
            doctorCount={doctors.length}
            onSearch={() => setSection("search")}
            onPlans={() => setSection("plans")}
          />
        )}
        {section === "services" && <ServicesSection />}
        {section === "plans" && (
          <PlansSection
            onChoose={(planId) => {
              setPresetPlan(planId);
              setSection("search");
              toast.info("Now pick the doctor you want to consult.");
            }}
          />
        )}
        {section === "search" && (
          <div>
            <h2 className="text-2xl font-bold">Find a specialist</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Every doctor here has been verified by our admin team.
            </p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by name, specialty or city"
                  className="pl-9"
                  maxLength={80}
                />
              </div>
              <Select value={specialty} onValueChange={setSpecialty}>
                <SelectTrigger className="sm:w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All specialties</SelectItem>
                  {SPECIALTIES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <div className="mt-12 flex justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="mt-12 text-center text-sm text-muted-foreground">
                No verified doctors match your search yet.
              </p>
            ) : (
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((d) => (
                  <DoctorCard key={d.id} doctor={d} onSelect={() => setSelected(d)} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <RequestDialog
        doctor={selected}
        presetPlan={presetPlan}
        onClose={() => setSelected(null)}
        onDone={load}
      />
    </AppShell>
  );
}

function ConsultationRow({ c, doctorName }: { c: Consultation; doctorName: string }) {
  const meta = {
    pending: { icon: <Clock className="h-4 w-4" />, label: "Awaiting payment approval", cls: "" },
    approved: { icon: <CheckCircle2 className="h-4 w-4" />, label: "Approved", cls: "" },
    declined: { icon: <XCircle className="h-4 w-4" />, label: "Declined", cls: "" },
  }[c.status];

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-soft">
      <div className="min-w-0 flex-1">
        <div className="font-semibold">{doctorName}</div>
        <div className="text-xs text-muted-foreground">
          {planById(c.plan)?.name ?? c.plan} · {c.amount} ETB ·{" "}
          {new Date(c.created_at).toLocaleDateString()}
        </div>
        {c.admin_note && (
          <div className="mt-1 text-xs text-muted-foreground">Note: {c.admin_note}</div>
        )}
      </div>
      <Badge
        variant={c.status === "approved" ? "default" : c.status === "declined" ? "destructive" : "secondary"}
        className="gap-1"
      >
        {meta.icon}
        {meta.label}
      </Badge>
      {c.status === "approved" && (
        <Button asChild size="sm" variant="hero">
          <Link to="/chat/$consultationId" params={{ consultationId: c.id }}>
            <MessageSquare className="mr-1.5 h-4 w-4" /> Open chat
          </Link>
        </Button>
      )}
    </div>
  );
}

function HomeSection({
  name,
  doctorCount,
  onSearch,
  onPlans,
}: {
  name: string | null;
  doctorCount: number;
  onSearch: () => void;
  onPlans: () => void;
}) {
  return (
    <div>
      <div className="rounded-2xl bg-gradient-brand p-8 text-primary-foreground shadow-card">
        <h1 className="text-3xl font-bold">Welcome{name ? `, ${name}` : ""} 👋</h1>
        <p className="mt-3 max-w-xl text-sm opacity-90">
          Tena Specal is your private doorway to Ethiopian specialist doctors. Pick a plan, choose
          the doctor you trust, upload your payment screenshot, and start chatting as soon as our
          team confirms it.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button variant="secondary" onClick={onSearch}>
            <Search className="mr-1.5 h-4 w-4" /> Find a doctor
          </Button>
          <Button variant="outline" onClick={onPlans}>
            See plans
          </Button>
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Stat value={`${doctorCount}`} label="Verified specialists" />
        <Stat value="300 ETB" label="Starting plan price" />
        <Stat value="24/7" label="Send messages anytime" />
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <Step n="1" title="Choose a plan & doctor" text="Browse verified specialists and pick the plan that fits your need." />
        <Step n="2" title="Pay & upload proof" text="Pay via CBE or Telebirr, then upload the payment screenshot." />
        <Step n="3" title="Chat with your doctor" text="Once admin confirms your payment, your private chat unlocks." />
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 text-center shadow-soft">
      <div className="text-2xl font-bold text-primary">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function Step({ n, title, text }: { n: string; title: string; text: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-sm font-bold text-accent-foreground">
        {n}
      </div>
      <div className="mt-3 font-semibold">{title}</div>
      <p className="mt-1 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

function ServicesSection() {
  const services = [
    {
      title: "Specialist consultations",
      text: "Describe your symptoms and get guidance from a verified specialist in the field you need — cardiology, dermatology, pediatrics, mental health and more.",
    },
    {
      title: "Lab & imaging review",
      text: "Upload your results in chat and have a doctor explain what the numbers mean and what to do next.",
    },
    {
      title: "Prescription & treatment advice",
      text: "Get clear advice on medication, dosage questions and follow-up care, written in plain language.",
    },
    {
      title: "Second opinions",
      text: "Already have a diagnosis? Confirm it with another verified specialist before making a big decision.",
    },
    {
      title: "Mental health support",
      text: "Private, judgement-free conversations with psychiatry and counselling professionals.",
    },
    {
      title: "Follow-up care",
      text: "Keep the same chat open for the length of your plan so your doctor can track your progress.",
    },
  ];
  return (
    <div>
      <h2 className="text-2xl font-bold">Our services</h2>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        Everything on Tena Specal happens through private, text-based consultations with doctors
        whose credentials we have checked ourselves.
      </p>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {services.map((s) => (
          <div key={s.title} className="rounded-xl border border-border bg-card p-5 shadow-soft">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <span className="font-semibold">{s.title}</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{s.text}</p>
          </div>
        ))}
      </div>
      <div className="mt-8 rounded-xl border border-destructive/30 bg-destructive/5 p-5 text-sm">
        <span className="font-semibold text-destructive">Important: </span>
        Tena Specal is not an emergency service. For accidents, chest pain, heavy bleeding or any
        life-threatening situation, go to the nearest hospital immediately.
      </div>
    </div>
  );
}

function PlansSection({ onChoose }: { onChoose: (planId: string) => void }) {
  return (
    <div>
      <h2 className="text-2xl font-bold">Care plans</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        One simple payment per consultation. No hidden fees.
      </p>
      <div className="mt-6 grid gap-5 md:grid-cols-3">
        {PLANS.map((p) => (
          <div
            key={p.id}
            className={`relative rounded-2xl border bg-card p-6 shadow-soft ${
              "popular" in p && p.popular ? "border-primary shadow-card" : "border-border"
            }`}
          >
            {"popular" in p && p.popular && (
              <Badge className="absolute -top-3 left-6">Most chosen</Badge>
            )}
            <div className="text-sm font-medium text-muted-foreground">{p.amharic}</div>
            <div className="mt-1 text-lg font-semibold">{p.name}</div>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-3xl font-extrabold">{p.price}</span>
              <span className="text-sm text-muted-foreground">ETB</span>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">{p.duration}</div>
            <ul className="mt-5 space-y-2 text-sm">
              {p.features.map((f) => (
                <li key={f} className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span className="text-muted-foreground">{f}</span>
                </li>
              ))}
            </ul>
            <Button
              variant={"popular" in p && p.popular ? "hero" : "soft"}
              className="mt-6 w-full"
              onClick={() => onChoose(p.id)}
            >
              Choose {p.name}
            </Button>
          </div>
        ))}
      </div>
      <PaymentInfo />
    </div>
  );
}

export function PaymentInfo() {
  return (
    <div className="mt-8 rounded-xl border border-border bg-card p-5 shadow-soft">
      <div className="font-semibold">Payment details</div>
      <p className="mt-1 text-xs text-muted-foreground">
        Send the plan amount to one of the accounts below, then upload your payment screenshot when
        you request a doctor.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {PAYMENT_DETAILS.map((d) => (
          <div key={d.method} className="rounded-lg bg-muted p-4">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {d.label}
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span className="font-mono text-base font-semibold">{d.account}</span>
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText(d.account);
                  toast.success("Account number copied.");
                }}
                className="text-muted-foreground transition-colors hover:text-foreground"
                aria-label={`Copy ${d.method} account number`}
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="text-xs text-muted-foreground">{d.holder}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DoctorCard({ doctor, onSelect }: { doctor: Doctor; onSelect: () => void }) {
  return (
    <div className="flex flex-col rounded-xl border border-border bg-card p-5 shadow-soft transition-shadow hover:shadow-card">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-accent text-accent-foreground">
          <Stethoscope className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="truncate font-semibold">{doctor.full_name}</div>
          <div className="truncate text-xs text-muted-foreground">{doctor.specialty}</div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {doctor.city && <Badge variant="outline">{doctor.city}</Badge>}
        {doctor.experience_years ? (
          <Badge variant="outline">{doctor.experience_years} yrs exp</Badge>
        ) : null}
        <Badge variant="secondary" className="gap-1">
          <ShieldCheck className="h-3 w-3" /> Verified
        </Badge>
      </div>
      {doctor.bio && (
        <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">{doctor.bio}</p>
      )}
      <Button variant="hero" className="mt-5 w-full" onClick={onSelect}>
        Request consultation
      </Button>
    </div>
  );
}

function RequestDialog({
  doctor,
  presetPlan,
  onClose,
  onDone,
}: {
  doctor: Doctor | null;
  presetPlan: string;
  onClose: () => void;
  onDone: () => Promise<void>;
}) {
  const { user, profile } = useAuth();
  const [plan, setPlan] = useState(presetPlan);
  const [method, setMethod] = useState("CBE");
  const [payer, setPayer] = useState("");
  const [ref, setRef] = useState("");
  const [reason, setReason] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setPlan(presetPlan);
    setPayer(profile?.full_name ?? "");
  }, [presetPlan, profile, doctor]);

  const amount = planById(plan)?.price ?? 300;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !doctor || !file) return;
    setBusy(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const path = `${user.id}/payment-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("payment-proofs")
        .upload(path, file, { upsert: true });
      if (upErr) throw upErr;

      const { error } = await supabase.from("consultations").insert({
        patient_id: user.id,
        doctor_id: doctor.doctor_id,
        plan,
        amount,
        payment_method: method,
        payer_name: payer.trim(),
        transaction_ref: ref.trim() || null,
        reason: reason.trim() || null,
        screenshot_path: path,
      });
      if (error) throw error;

      toast.success("Request submitted. We'll notify you once your payment is verified.");
      onClose();
      await onDone();
      setFile(null);
      setRef("");
      setReason("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not submit request.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={Boolean(doctor)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Request {doctor?.full_name}</DialogTitle>
          <DialogDescription>
            {doctor?.specialty} · Pay the plan amount, then upload your payment screenshot for
            review.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Plan</Label>
            <Select value={plan} onValueChange={setPlan}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PLANS.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} — {p.price} ETB ({p.duration})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg bg-muted p-4 text-sm">
            <div className="font-semibold">Send {amount} ETB to:</div>
            {PAYMENT_DETAILS.map((d) => (
              <div key={d.method} className="mt-2 text-xs">
                <span className="font-medium">{d.method}: </span>
                <span className="font-mono">{d.account}</span> — {d.holder}
              </div>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Paid with</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CBE">CBE</SelectItem>
                  <SelectItem value="Telebirr">Telebirr</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Name on payment</Label>
              <Input value={payer} onChange={(e) => setPayer(e.target.value)} maxLength={100} required />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Transaction / reference number</Label>
            <Input
              value={ref}
              onChange={(e) => setRef(e.target.value)}
              maxLength={60}
              placeholder="Optional but speeds up review"
            />
          </div>

          <div className="space-y-1.5">
            <Label>What do you need help with?</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              maxLength={1000}
              placeholder="Briefly describe your symptoms or question."
            />
          </div>

          <div className="space-y-1.5">
            <Label>Payment screenshot *</Label>
            <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-border bg-muted/40 p-4 text-sm transition-colors hover:bg-muted">
              <Upload className="h-5 w-5 text-muted-foreground" />
              <span className="text-muted-foreground">
                {file ? file.name : "Upload screenshot or receipt (max 10MB)"}
              </span>
              <input
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  if (f && f.size > 10 * 1024 * 1024) {
                    toast.error("File is larger than 10MB.");
                    return;
                  }
                  setFile(f);
                }}
              />
            </label>
          </div>

          <Button type="submit" variant="hero" size="lg" className="w-full" disabled={!file || busy}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit for review
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
