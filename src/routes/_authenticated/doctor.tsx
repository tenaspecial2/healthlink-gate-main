import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Loader2,
  Upload,
  CheckCircle2,
  XCircle,
  Clock,
  MessageSquare,
  FileText,
  Wallet,
  Send,
} from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AvatarPicker,
  ScheduleEditor,
  defaultSchedule,
  parseSchedule,
  scheduleSummary,
  useAvatarUrl,
  type Schedule,
} from "@/components/DoctorProfileFields";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PAYOUT_TELEGRAM, SPECIALTIES } from "@/lib/tena";


export const Route = createFileRoute("/_authenticated/doctor")({
  head: () => ({
    meta: [
      { title: "Doctor Portal — Tena Specal" },
      {
        name: "description",
        content:
          "Submit your medical credentials for verification and consult with patients on Tena Specal.",
      },
      { property: "og:title", content: "Doctor Portal — Tena Specal" },
      { property: "og:description", content: "Verification and consultations for Tena Specal doctors." },
    ],
  }),
  component: DoctorPage,
});

type Application = {
  id: string;
  status: "pending" | "approved" | "declined";
  admin_note: string | null;
  specialty: string;
  full_name: string;
  certificate_path: string | null;
  created_at: string;
  email: string | null;
  phone: string;
  gender: string | null;
  city: string | null;
  license_number: string;
  experience_years: number;
  education: string | null;
  workplace: string | null;
  languages: string | null;
  consultation_fee: string | null;
  bio: string | null;
  schedule: string | null;
  avatar_path: string | null;
};

const APP_COLS =
  "id, status, admin_note, specialty, full_name, certificate_path, created_at, email, phone, gender, city, license_number, experience_years, education, workplace, languages, consultation_fee, bio, schedule, avatar_path";


type Consultation = {
  id: string;
  patient_id: string;
  plan: string;
  status: string;
  reason: string | null;
  created_at: string;
};

function DoctorPage() {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [app, setApp] = useState<Application | null>(null);
  const [consults, setConsults] = useState<Consultation[]>([]);
  const [patients, setPatients] = useState<Record<string, string>>({});

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("doctor_applications")
      .select(APP_COLS)
      .eq("doctor_id", user.id)
      .maybeSingle();
    setApp((data as Application | null) ?? null);

    const { data: cons } = await supabase
      .from("consultations")
      .select("id, patient_id, plan, status, reason, created_at")
      .eq("doctor_id", user.id)
      .eq("status", "approved")
      .order("created_at", { ascending: false });
    const list = (cons as Consultation[]) ?? [];
    setConsults(list);

    if (list.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", list.map((c) => c.patient_id));
      const map: Record<string, string> = {};
      (profs ?? []).forEach((p) => {
        map[p.id] = p.full_name || p.email || "Patient";
      });
      setPatients(map);
    }
    setLoading(false);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  return (
    <AppShell homeTo="/doctor">
      <div className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-3xl font-bold">Doctor portal</h1>
        <p className="mt-2 text-muted-foreground">
          Welcome{profile?.full_name ? `, ${profile.full_name}` : ""}. Complete your professional
          profile so our team can verify you.
        </p>

        {loading ? (
          <div className="mt-10 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : app ? (
          <>
            <StatusCard app={app} />
            {app.status === "approved" && <EarningsCard />}
            <ProfileEditorCard app={app} onSaved={load} />
            <AccountSettingsCard />

            <Card className="mt-8">
              <CardHeader>
                <CardTitle className="text-lg">My patients</CardTitle>
                <CardDescription>
                  Approved consultations you can chat about right now.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {consults.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No approved consultations yet. Patients will appear here after the admin
                    confirms their payment.
                  </p>
                )}
                {consults.map((c) => (
                  <div
                    key={c.id}
                    className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">{patients[c.patient_id] ?? "Patient"}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {c.reason || "No reason provided"}
                      </div>
                    </div>
                    <Badge variant="secondary" className="capitalize">
                      {c.plan}
                    </Badge>
                    <Button asChild size="sm" variant="soft">
                      <Link to="/chat/$consultationId" params={{ consultationId: c.id }}>
                        <MessageSquare className="mr-1.5 h-4 w-4" /> Chat
                      </Link>
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </>
        ) : (
          <ApplicationForm onSubmitted={load} />
        )}
      </div>
    </AppShell>
  );
}

function StatusCard({ app }: { app: Application }) {
  const map = {
    pending: {
      icon: <Clock className="h-6 w-6" />,
      title: "Application under review",
      text: "Our admin team is checking your certificate. You'll get a notification and an email once a decision is made.",
      cls: "bg-accent text-accent-foreground",
    },
    approved: {
      icon: <CheckCircle2 className="h-6 w-6" />,
      title: "You're verified 🎉",
      text: "Your account is approved. Patients can now find you in search and start consultations.",
      cls: "bg-success/15 text-success",
    },
    declined: {
      icon: <XCircle className="h-6 w-6" />,
      title: "Application declined",
      text: "Unfortunately your application was not approved. See the admin note below.",
      cls: "bg-destructive/10 text-destructive",
    },
  }[app.status];

  return (
    <Card className="mt-8 overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${map.cls}`}>
            {map.icon}
          </div>
          <div>
            <h2 className="text-lg font-semibold">{map.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{map.text}</p>
            {app.admin_note && (
              <p className="mt-3 rounded-md bg-muted p-3 text-sm">
                <span className="font-medium">Admin note: </span>
                {app.admin_note}
              </p>
            )}
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
              <Badge variant="outline">{app.specialty}</Badge>
              <Badge variant="outline">
                Submitted {new Date(app.created_at).toLocaleDateString()}
              </Badge>
              {app.certificate_path && (
                <Badge variant="outline" className="gap-1">
                  <FileText className="h-3 w-3" /> Certificate uploaded
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const emptyForm = {
  full_name: "",
  telegram: "",
  phone: "",
  gender: "",
  city: "",
  specialty: "",
  license_number: "",
  experience_years: "",
  education: "",
  workplace: "",
  languages: "",
  consultation_fee: "",
  bio: "",
};

function ApplicationForm({ onSubmitted }: { onSubmitted: () => Promise<void> }) {
  const { user, profile } = useAuth();
  const [form, setForm] = useState(emptyForm);
  const [file, setFile] = useState<File | null>(null);
  const [avatar, setAvatar] = useState<File | null>(null);
  const [schedule, setSchedule] = useState<Schedule>(defaultSchedule);
  const [busy, setBusy] = useState(false);


  useEffect(() => {
    setForm((f) => ({
      ...f,
      full_name: f.full_name || profile?.full_name || "",
      telegram: f.telegram || (profile as any)?.telegram_username || "",
      phone: f.phone || profile?.phone || "",
    }));
  }, [profile]);

  const set = (k: keyof typeof emptyForm) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const valid = useMemo(
    () =>
      form.full_name.trim() &&
      form.phone.trim() &&
      form.specialty &&
      form.license_number.trim() &&
      file,
    [form, file],
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !file) return;
    setBusy(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "pdf";
      const path = `${user.id}/certificate-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("certificates")
        .upload(path, file, { upsert: true });
      if (upErr) throw upErr;

      let avatarPath: string | null = null;
      if (avatar) {
        const aExt = avatar.name.split(".").pop()?.toLowerCase() ?? "jpg";
        avatarPath = `${user.id}/avatar-${Date.now()}.${aExt}`;
        const { error: avErr } = await supabase.storage
          .from("avatars")
          .upload(avatarPath, avatar, { upsert: true });
        if (avErr) throw avErr;
      }

      const { error } = await supabase.from("doctor_applications").insert({
        doctor_id: user.id,
        full_name: form.full_name.trim(),
        email: form.telegram.trim() ? `@${form.telegram.trim().replace(/^@/, "")}` : null,
        phone: form.phone.trim(),
        gender: form.gender || null,
        city: form.city.trim() || null,
        specialty: form.specialty,
        license_number: form.license_number.trim(),
        experience_years: Number(form.experience_years) || 0,
        education: form.education.trim() || null,
        workplace: form.workplace.trim() || null,
        languages: form.languages.trim() || null,
        consultation_fee: form.consultation_fee.trim() || null,
        bio: form.bio.trim() || null,
        certificate_path: path,
        schedule: JSON.stringify(schedule),
        avatar_path: avatarPath,
      });
      if (error) throw error;


      await supabase
        .from("profiles")
        .update({
          account_type: "doctor",
          full_name: form.full_name.trim(),
          phone: form.phone.trim(),
        })
        .eq("id", user.id);

      toast.success("Application submitted for review.");
      await onSubmitted();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not submit application.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle>Doctor verification form</CardTitle>
        <CardDescription>
          All fields marked * are required. Your certificate is stored privately and only reviewed by
          our admin team.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name *">
              <Input value={form.full_name} onChange={(e) => set("full_name")(e.target.value)} maxLength={100} required />
            </Field>
            <Field label="Telegram username">
              <Input
                value={form.telegram}
                onChange={(e) => set("telegram")(e.target.value)}
                maxLength={100}
                placeholder="@yourusername"
              />
            </Field>
            <Field label="Phone *">
              <Input value={form.phone} onChange={(e) => set("phone")(e.target.value)} maxLength={20} required />
            </Field>
            <Field label="Gender">
              <Select value={form.gender} onValueChange={set("gender")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="City / Region">
              <Input value={form.city} onChange={(e) => set("city")(e.target.value)} maxLength={80} placeholder="Addis Ababa" />
            </Field>
            <Field label="Specialty *">
              <Select value={form.specialty} onValueChange={set("specialty")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select specialty" />
                </SelectTrigger>
                <SelectContent>
                  {SPECIALTIES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Medical license number *">
              <Input value={form.license_number} onChange={(e) => set("license_number")(e.target.value)} maxLength={60} required />
            </Field>
            <Field label="Years of experience">
              <Input
                type="number"
                min={0}
                max={70}
                value={form.experience_years}
                onChange={(e) => set("experience_years")(e.target.value)}
              />
            </Field>
            <Field label="Education / University">
              <Input value={form.education} onChange={(e) => set("education")(e.target.value)} maxLength={150} />
            </Field>
            <Field label="Current workplace">
              <Input value={form.workplace} onChange={(e) => set("workplace")(e.target.value)} maxLength={150} />
            </Field>
            <Field label="Languages spoken">
              <Input value={form.languages} onChange={(e) => set("languages")(e.target.value)} maxLength={120} placeholder="Amharic, English" />
            </Field>
            <Field label="Preferred consultation fee">
              <Input value={form.consultation_fee} onChange={(e) => set("consultation_fee")(e.target.value)} maxLength={60} placeholder="e.g. 500 ETB" />
            </Field>
          </div>

          <Field label="Short professional bio">
            <Textarea
              value={form.bio}
              onChange={(e) => set("bio")(e.target.value)}
              maxLength={1000}
              rows={4}
              placeholder="Tell patients about your experience and how you can help them."
            />
          </Field>

          <div className="space-y-1.5">
            <Label>Medical certificate / license document *</Label>
            <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-border bg-muted/40 p-4 text-sm transition-colors hover:bg-muted">
              <Upload className="h-5 w-5 text-muted-foreground" />
              <span className="text-muted-foreground">
                {file ? file.name : "Upload PDF or image (max 10MB)"}
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

          <AvatarPicker
            file={avatar}
            onPick={(f) => {
              if (f && f.size > 5 * 1024 * 1024) {
                toast.error("Profile picture is larger than 5MB.");
                return;
              }
              setAvatar(f);
            }}
          />

          <ScheduleEditor value={schedule} onChange={setSchedule} />


          <Button type="submit" variant="hero" size="lg" disabled={!valid || busy}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit for verification
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

type Payout = {
  id: string;
  amount: number;
  telegram_username: string;
  status: "pending" | "approved" | "declined";
  admin_note: string | null;
  created_at: string;
};

function EarningsCard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [earned, setEarned] = useState(0);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [handle, setHandle] = useState(PAYOUT_TELEGRAM);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!user) return;
    const [{ data: cons }, { data: reqs }] = await Promise.all([
      supabase
        .from("consultations")
        .select("amount")
        .eq("doctor_id", user.id)
        .eq("status", "approved"),
      supabase
        .from("payout_requests")
        .select("id, amount, telegram_username, status, admin_note, created_at")
        .eq("doctor_id", user.id)
        .order("created_at", { ascending: false }),
    ]);
    setEarned((cons ?? []).reduce((s, c) => s + (c.amount ?? 0), 0));
    setPayouts((reqs as Payout[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const locked = payouts
    .filter((p) => p.status !== "declined")
    .reduce((s, p) => s + p.amount, 0);
  const available = Math.max(earned - locked, 0);

  const submit = async () => {
    if (!user) return;
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      toast.error("Enter a valid amount.");
      return;
    }
    if (value > available) {
      toast.error("Amount is more than your available balance.");
      return;
    }
    if (!handle.trim()) {
      toast.error("Add the Telegram username to receive the money.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("payout_requests").insert({
      doctor_id: user.id,
      amount: Math.round(value),
      telegram_username: handle.trim(),
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Withdrawal request sent to the admin.");
    setOpen(false);
    setAmount("");
    await load();
  };

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Wallet className="h-5 w-5 text-primary" /> Balance & withdrawals
        </CardTitle>
        <CardDescription>
          Earnings from approved consultations. Withdrawals are sent via Telegram to{" "}
          <span className="font-medium text-foreground">{PAYOUT_TELEGRAM}</span>.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <Stat label="Total earned" value={`${earned} ETB`} />
              <Stat label="Requested / paid" value={`${locked} ETB`} />
              <Stat label="Available" value={`${available} ETB`} highlight />
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button variant="hero" disabled={available <= 0}>
                  <Send className="mr-2 h-4 w-4" /> Withdraw balance
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Withdraw balance</DialogTitle>
                  <DialogDescription>
                    The admin reviews your request and sends the money on Telegram.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <Field label={`Amount (max ${available} ETB)`}>
                    <Input
                      type="number"
                      min={1}
                      max={available}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder={String(available)}
                    />
                  </Field>
                  <Field label="Telegram username">
                    <Input
                      value={handle}
                      onChange={(e) => setHandle(e.target.value)}
                      maxLength={60}
                    />
                  </Field>
                </div>
                <DialogFooter>
                  <Button variant="hero" onClick={() => void submit()} disabled={busy}>
                    {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Send request
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {available <= 0 && (
              <p className="text-xs text-muted-foreground">
                You have nothing available to withdraw right now.
              </p>
            )}

            {payouts.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Withdrawal history</h3>
                {payouts.map((p) => (
                  <div
                    key={p.id}
                    className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3 text-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">{p.amount} ETB</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {p.telegram_username} · {new Date(p.created_at).toLocaleDateString()}
                        {p.admin_note ? ` · ${p.admin_note}` : ""}
                      </div>
                    </div>
                    <Badge
                      variant={p.status === "approved" ? "default" : "outline"}
                      className="capitalize"
                    >
                      {p.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border border-border p-4 ${highlight ? "bg-primary/10" : "bg-muted/40"}`}
    >
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-1 text-xl font-bold ${highlight ? "text-primary" : ""}`}>{value}</div>
    </div>
  );
}

const editableKeys = [
  "full_name",
  "phone",
  "city",
  "specialty",
  "experience_years",
  "education",
  "workplace",
  "languages",
  "consultation_fee",
  "bio",
] as const;

function ProfileEditorCard({ app, onSaved }: { app: Application; onSaved: () => Promise<void> }) {
  const { user, refresh } = useAuth();
  const [form, setForm] = useState({
    full_name: app.full_name,
    phone: app.phone,
    city: app.city ?? "",
    specialty: app.specialty,
    experience_years: String(app.experience_years ?? 0),
    education: app.education ?? "",
    workplace: app.workplace ?? "",
    languages: app.languages ?? "",
    consultation_fee: app.consultation_fee ?? "",
    bio: app.bio ?? "",
  });
  const [schedule, setSchedule] = useState<Schedule>(parseSchedule(app.schedule));
  const [avatar, setAvatar] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const currentAvatar = useAvatarUrl(app.avatar_path);
  const set = (k: (typeof editableKeys)[number]) => (v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!user) return;
    setBusy(true);
    try {
      let avatarPath = app.avatar_path;
      if (avatar) {
        const ext = avatar.name.split(".").pop()?.toLowerCase() ?? "jpg";
        avatarPath = `${user.id}/avatar-${Date.now()}.${ext}`;
        const { error: avErr } = await supabase.storage
          .from("avatars")
          .upload(avatarPath, avatar, { upsert: true });
        if (avErr) throw avErr;
      }
      const { error } = await supabase
        .from("doctor_applications")
        .update({
          full_name: form.full_name.trim(),
          phone: form.phone.trim(),
          city: form.city.trim() || null,
          specialty: form.specialty,
          experience_years: Number(form.experience_years) || 0,
          education: form.education.trim() || null,
          workplace: form.workplace.trim() || null,
          languages: form.languages.trim() || null,
          consultation_fee: form.consultation_fee.trim() || null,
          bio: form.bio.trim() || null,
          schedule: JSON.stringify(schedule),
          avatar_path: avatarPath,
        })
        .eq("id", app.id);
      if (error) throw error;

      await supabase
        .from("profiles")
        .update({ full_name: form.full_name.trim(), phone: form.phone.trim() })
        .eq("id", user.id);

      toast.success("Profile updated.");
      setAvatar(null);
      await refresh();
      await onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save your profile.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle className="text-lg">Edit my doctor profile</CardTitle>
        <CardDescription>
          Keep your photo, availability and details up to date — patients see this in search.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-accent text-sm font-semibold text-accent-foreground">
            {currentAvatar ? (
              <img src={currentAvatar} alt="Your profile photo" className="h-full w-full object-cover" />
            ) : (
              form.full_name.slice(0, 1).toUpperCase() || "D"
            )}
          </span>
          <div className="text-sm text-muted-foreground">
            {scheduleSummary(app.schedule).join(" · ") || "No availability set yet"}
          </div>
        </div>

        <AvatarPicker
          file={avatar}
          existingPath={app.avatar_path}
          onPick={(f) => {
            if (f && f.size > 5 * 1024 * 1024) {
              toast.error("Profile picture is larger than 5MB.");
              return;
            }
            setAvatar(f);
          }}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name">
            <Input value={form.full_name} onChange={(e) => set("full_name")(e.target.value)} maxLength={100} />
          </Field>
          <Field label="Phone">
            <Input value={form.phone} onChange={(e) => set("phone")(e.target.value)} maxLength={20} />
          </Field>
          <Field label="City / Region">
            <Input value={form.city} onChange={(e) => set("city")(e.target.value)} maxLength={80} />
          </Field>
          <Field label="Specialty">
            <Select value={form.specialty} onValueChange={set("specialty")}>
              <SelectTrigger>
                <SelectValue placeholder="Select specialty" />
              </SelectTrigger>
              <SelectContent>
                {SPECIALTIES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Years of experience">
            <Input
              type="number"
              min={0}
              max={70}
              value={form.experience_years}
              onChange={(e) => set("experience_years")(e.target.value)}
            />
          </Field>
          <Field label="Education / University">
            <Input value={form.education} onChange={(e) => set("education")(e.target.value)} maxLength={150} />
          </Field>
          <Field label="Current workplace">
            <Input value={form.workplace} onChange={(e) => set("workplace")(e.target.value)} maxLength={150} />
          </Field>
          <Field label="Languages spoken">
            <Input value={form.languages} onChange={(e) => set("languages")(e.target.value)} maxLength={120} />
          </Field>
          <Field label="Consultation fee">
            <Input
              value={form.consultation_fee}
              onChange={(e) => set("consultation_fee")(e.target.value)}
              maxLength={60}
            />
          </Field>
        </div>

        <Field label="Short professional bio">
          <Textarea value={form.bio} onChange={(e) => set("bio")(e.target.value)} rows={4} maxLength={1000} />
        </Field>

        <ScheduleEditor value={schedule} onChange={setSchedule} />

        <Button variant="hero" onClick={() => void save()} disabled={busy}>
          {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save profile
        </Button>
      </CardContent>
    </Card>
  );
}

function AccountSettingsCard() {
  const { profile, refresh } = useAuth();
  const [email, setEmail] = useState(profile?.email ?? "");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  const saveEmail = async () => {
    const next = email.trim();
    if (!next || next === profile?.email) return;
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ email: next });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Check your inbox to confirm the new email address.");
    await refresh();
  };

  const savePassword = async () => {
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords do not match.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setPassword("");
    setConfirm("");
    toast.success("Password updated.");
  };

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle className="text-lg">Account settings</CardTitle>
        <CardDescription>Change the email and password you use to sign in.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[240px] flex-1">
            <Field label="Sign-in email">
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={255} />
            </Field>
          </div>
          <Button variant="soft" onClick={() => void saveEmail()} disabled={busy}>
            Update email
          </Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="New password">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
            />
          </Field>
          <Field label="Confirm new password">
            <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </Field>
        </div>
        <Button variant="soft" onClick={() => void savePassword()} disabled={busy}>
          Update password
        </Button>
      </CardContent>
    </Card>
  );
}
