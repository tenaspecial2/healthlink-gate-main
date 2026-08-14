import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Loader2,
  ExternalLink,
  MessageSquare,
  Users,
  FileCheck2,
  Wallet,
  Send,
} from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { planById } from "@/lib/tena";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin Panel — Tena Specal" },
      {
        name: "description",
        content: "Review doctor verifications, confirm patient payments and manage Tena Specal users.",
      },
      { property: "og:title", content: "Admin Panel — Tena Specal" },
      { property: "og:description", content: "Internal review and management console." },
    ],
  }),
  component: AdminPage,
});

type DoctorApp = {
  id: string;
  doctor_id: string;
  full_name: string;
  email: string;
  phone: string;
  specialty: string;
  license_number: string;
  city: string | null;
  experience_years: number | null;
  education: string | null;
  workplace: string | null;
  bio: string | null;
  certificate_path: string | null;
  status: "pending" | "approved" | "declined";
  admin_note: string | null;
  created_at: string;
};

type Consult = {
  id: string;
  patient_id: string;
  doctor_id: string;
  plan: string;
  amount: number;
  payment_method: string | null;
  payer_name: string | null;
  transaction_ref: string | null;
  screenshot_path: string | null;
  reason: string | null;
  status: "pending" | "approved" | "declined";
  admin_note: string | null;
  created_at: string;
};

type Payout = {
  id: string;
  doctor_id: string;
  amount: number;
  telegram_username: string;
  status: "pending" | "approved" | "declined";
  admin_note: string | null;
  created_at: string;
};

type Prof = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  account_type: string;
  created_at: string;
};

function AdminPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [apps, setApps] = useState<DoctorApp[]>([]);
  const [consults, setConsults] = useState<Consult[]>([]);
  const [profiles, setProfiles] = useState<Prof[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");

  const load = async () => {
    const [{ data: a }, { data: c }, { data: p }, { data: w }] = await Promise.all([
      supabase.from("doctor_applications").select("*").order("created_at", { ascending: false }),
      supabase.from("consultations").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("id, full_name, email, phone, account_type, created_at").order("created_at", { ascending: false }),
      supabase.from("payout_requests").select("*").order("created_at", { ascending: false }),
    ]);
    setApps((a as DoctorApp[]) ?? []);
    setConsults((c as Consult[]) ?? []);
    setProfiles((p as Prof[]) ?? []);
    setPayouts((w as Payout[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    if (!authLoading && isAdmin) void load();
    else if (!authLoading) setLoading(false);
  }, [authLoading, isAdmin]);

  const openFile = async (bucket: string, path: string | null) => {
    if (!path) return;
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 300);
    if (error || !data) {
      toast.error("Could not open file.");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  const decide = async (
    table: "doctor_applications" | "consultations" | "payout_requests",
    id: string,
    status: "approved" | "declined",
  ) => {
    const { error } = await supabase
      .from(table)
      .update({
        status,
        admin_note: notes[id]?.trim() || null,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(status === "approved" ? "Approved." : "Declined.");
    await load();
  };

  if (!authLoading && !isAdmin) {
    return (
      <AppShell homeTo="/">
        <div className="mx-auto max-w-md px-4 py-24 text-center">
          <h1 className="text-2xl font-bold">Restricted area</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This panel is only available to the Tena Specal administrator account.
          </p>
        </div>
      </AppShell>
    );
  }

  const nameOf = (id: string) => {
    const p = profiles.find((x) => x.id === id);
    return p?.full_name || p?.email || id.slice(0, 8);
  };

  const filteredProfiles = profiles.filter((p) => {
    const q = search.trim().toLowerCase();
    return (
      !q ||
      (p.full_name ?? "").toLowerCase().includes(q) ||
      (p.email ?? "").toLowerCase().includes(q) ||
      (p.phone ?? "").toLowerCase().includes(q)
    );
  });

  const pendingApps = apps.filter((a) => a.status === "pending").length;
  const pendingPays = consults.filter((c) => c.status === "pending").length;
  const pendingWithdrawals = payouts.filter((w) => w.status === "pending").length;

  return (
    <AppShell homeTo="/admin">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="text-3xl font-bold">Admin panel</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Verify doctors, confirm payments and keep an eye on every account.
        </p>

        {loading ? (
          <div className="mt-12 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs defaultValue="doctors" className="mt-8">
            <TabsList>
              <TabsTrigger value="doctors" className="gap-1.5">
                <FileCheck2 className="h-4 w-4" /> Doctors
                {pendingApps > 0 && <Badge className="ml-1">{pendingApps}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="payments" className="gap-1.5">
                <Wallet className="h-4 w-4" /> Payments
                {pendingPays > 0 && <Badge className="ml-1">{pendingPays}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="withdrawals" className="gap-1.5">
                <Send className="h-4 w-4" /> Withdrawals
                {pendingWithdrawals > 0 && <Badge className="ml-1">{pendingWithdrawals}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="users" className="gap-1.5">
                <Users className="h-4 w-4" /> Users
              </TabsTrigger>
            </TabsList>

            <TabsContent value="doctors" className="mt-6 space-y-4">
              {apps.length === 0 && <Empty text="No doctor applications yet." />}
              {apps.map((a) => (
                <Card key={a.id}>
                  <CardHeader className="pb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle className="text-lg">{a.full_name}</CardTitle>
                      <StatusBadge status={a.status} />
                    </div>
                    <CardDescription>
                      {a.specialty} · License {a.license_number} · {a.email} · {a.phone}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="grid gap-1 text-muted-foreground sm:grid-cols-2">
                      {a.city && <div>City: {a.city}</div>}
                      {a.experience_years ? <div>Experience: {a.experience_years} years</div> : null}
                      {a.education && <div>Education: {a.education}</div>}
                      {a.workplace && <div>Workplace: {a.workplace}</div>}
                    </div>
                    {a.bio && <p className="rounded-md bg-muted p-3">{a.bio}</p>}
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void openFile("certificates", a.certificate_path)}
                        disabled={!a.certificate_path}
                      >
                        <ExternalLink className="mr-1.5 h-4 w-4" /> View certificate
                      </Button>
                    </div>
                    <Decision
                      id={a.id}
                      notes={notes}
                      setNotes={setNotes}
                      status={a.status}
                      onDecide={(s) => void decide("doctor_applications", a.id, s)}
                    />
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="payments" className="mt-6 space-y-4">
              {consults.length === 0 && <Empty text="No consultation requests yet." />}
              {consults.map((c) => (
                <Card key={c.id}>
                  <CardHeader className="pb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle className="text-lg">
                        {nameOf(c.patient_id)} → {nameOf(c.doctor_id)}
                      </CardTitle>
                      <StatusBadge status={c.status} />
                    </div>
                    <CardDescription>
                      {planById(c.plan)?.name ?? c.plan} · {c.amount} ETB · {c.payment_method} ·{" "}
                      {new Date(c.created_at).toLocaleString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="grid gap-1 text-muted-foreground sm:grid-cols-2">
                      {c.payer_name && <div>Paid by: {c.payer_name}</div>}
                      {c.transaction_ref && <div>Reference: {c.transaction_ref}</div>}
                    </div>
                    {c.reason && <p className="rounded-md bg-muted p-3">{c.reason}</p>}
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void openFile("payment-proofs", c.screenshot_path)}
                        disabled={!c.screenshot_path}
                      >
                        <ExternalLink className="mr-1.5 h-4 w-4" /> View payment proof
                      </Button>
                      {c.status === "approved" && (
                        <Button asChild variant="soft" size="sm">
                          <Link to="/chat/$consultationId" params={{ consultationId: c.id }}>
                            <MessageSquare className="mr-1.5 h-4 w-4" /> View chat
                          </Link>
                        </Button>
                      )}
                    </div>
                    <Decision
                      id={c.id}
                      notes={notes}
                      setNotes={setNotes}
                      status={c.status}
                      onDecide={(s) => void decide("consultations", c.id, s)}
                    />
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="withdrawals" className="mt-6 space-y-4">
              {payouts.length === 0 && <Empty text="No withdrawal requests yet." />}
              {payouts.map((w) => (
                <Card key={w.id}>
                  <CardHeader className="pb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle className="text-lg">
                        {nameOf(w.doctor_id)} · {w.amount} ETB
                      </CardTitle>
                      <StatusBadge status={w.status} />
                    </div>
                    <CardDescription>
                      Send on Telegram to {w.telegram_username} ·{" "}
                      {new Date(w.created_at).toLocaleString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <Decision
                      id={w.id}
                      notes={notes}
                      setNotes={setNotes}
                      status={w.status}
                      onDecide={(s) => void decide("payout_requests", w.id, s)}
                    />
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="users" className="mt-6">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search users by name, email or phone"
                maxLength={80}
              />
              <div className="mt-4 divide-y divide-border rounded-xl border border-border bg-card">
                {filteredProfiles.map((p) => (
                  <div key={p.id} className="flex flex-wrap items-center gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">{p.full_name || "Unnamed"}</div>
                      <div className="text-xs text-muted-foreground">
                        {p.email} {p.phone ? `· ${p.phone}` : ""}
                      </div>
                    </div>
                    <Badge variant="secondary" className="capitalize">
                      {p.account_type}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(p.created_at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
                {filteredProfiles.length === 0 && (
                  <div className="p-6 text-center text-sm text-muted-foreground">
                    No users match your search.
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </AppShell>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}

function StatusBadge({ status }: { status: "pending" | "approved" | "declined" }) {
  return (
    <Badge
      variant={status === "approved" ? "default" : status === "declined" ? "destructive" : "secondary"}
      className="capitalize"
    >
      {status}
    </Badge>
  );
}

function Decision({
  id,
  notes,
  setNotes,
  status,
  onDecide,
}: {
  id: string;
  notes: Record<string, string>;
  setNotes: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  status: "pending" | "approved" | "declined";
  onDecide: (status: "approved" | "declined") => void;
}) {
  return (
    <div className="flex flex-col gap-2 border-t border-border pt-3 sm:flex-row sm:items-center">
      <Input
        value={notes[id] ?? ""}
        onChange={(e) => setNotes((n) => ({ ...n, [id]: e.target.value }))}
        placeholder="Optional note for the user"
        maxLength={300}
        className="sm:flex-1"
      />
      <div className="flex gap-2">
        <Button variant="success" size="sm" onClick={() => onDecide("approved")}>
          Approve
        </Button>
        <Button variant="destructive" size="sm" onClick={() => onDecide("declined")}>
          Decline
        </Button>
      </div>
      {status !== "pending" && (
        <span className="text-xs text-muted-foreground">Current: {status}</span>
      )}
    </div>
  );
}
