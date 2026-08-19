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
  Settings,
  BookOpen,
  Plus,
  Trash2,
  Edit2,
  Save,
  CheckCircle2,
  XCircle,
  Clock,
  Shield,
  TrendingUp,
  CreditCard,
  Phone,
  Globe,
  Radio,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { planById } from "@/lib/tena";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin Management Console — Tena Specal" },
      {
        name: "description",
        content: "Master control panel to manage bot settings, payment accounts, doctor verifications, digital store products, and user accounts.",
      },
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
  telegram_username?: string | null;
  telegram_id?: string | null;
  created_at: string;
};

type BotSetting = {
  key: string;
  value: string;
  label: string;
  category: string;
  description: string;
};

type BotProduct = {
  id: string;
  title: string;
  specialty: string;
  file_type: string;
  price: number;
  description: string;
  download_url: string;
  is_active: boolean;
  created_at: string;
};

type BotTransaction = {
  id: string;
  doctor_telegram_id: number | null;
  doctor_name: string | null;
  item_type: string;
  item_title: string;
  price: number;
  commission: number;
  net_amount: number;
  user_id: number;
  status: string;
  created_at: string;
};

function AdminPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);

  // Core Data
  const [apps, setApps] = useState<DoctorApp[]>([]);
  const [consults, setConsults] = useState<Consult[]>([]);
  const [profiles, setProfiles] = useState<Prof[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [products, setProducts] = useState<BotProduct[]>([]);
  const [botTransactions, setBotTransactions] = useState<BotTransaction[]>([]);

  const [notes, setNotes] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");

  // Product Dialog State
  const [prodOpen, setProdOpen] = useState(false);
  const [prodForm, setProdForm] = useState<{
    id?: string;
    title: string;
    specialty: string;
    file_type: string;
    price: string;
    description: string;
    download_url: string;
    is_active: boolean;
  }>({
    title: "",
    specialty: "internal",
    file_type: "pdf",
    price: "200",
    description: "",
    download_url: "",
    is_active: true,
  });

  const load = async () => {
    try {
      const [
        { data: a },
        { data: c },
        { data: p },
        { data: w },
        { data: s },
        { data: prods },
        { data: txs },
      ] = await Promise.all([
        supabase.from("doctor_applications").select("*").order("created_at", { ascending: false }),
        supabase.from("consultations").select("*").order("created_at", { ascending: false }),
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("payout_requests").select("*").order("created_at", { ascending: false }),
        supabase.from("bot_settings").select("*"),
        supabase.from("bot_products").select("*").order("created_at", { ascending: false }),
        supabase.from("bot_transactions").select("*").order("created_at", { ascending: false }).limit(50),
      ]);

      setApps((a as DoctorApp[]) ?? []);
      setConsults((c as Consult[]) ?? []);
      setProfiles((p as Prof[]) ?? []);
      setPayouts((w as Payout[]) ?? []);

      if (s) {
        const sMap: Record<string, string> = {};
        s.forEach((row: any) => {
          sMap[row.key] = row.value;
        });
        setSettings(sMap);
      }

      setProducts((prods as BotProduct[]) ?? []);
      setBotTransactions((txs as BotTransaction[]) ?? []);
    } catch (err: any) {
      toast.error("Failed to load admin data: " + err.message);
    } finally {
      setLoading(false);
    }
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
    toast.success(status === "approved" ? "Application Approved." : "Application Declined.");
    await load();
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      const updates = Object.entries(settings).map(([key, value]) => ({
        key,
        value,
        updated_at: new Date().toISOString(),
      }));

      for (const item of updates) {
        await supabase
          .from("bot_settings")
          .upsert(item, { onConflict: "key" });
      }

      toast.success("Bot & Payment settings saved successfully!");
    } catch (err: any) {
      toast.error("Error saving settings: " + err.message);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSaveProduct = async () => {
    const priceNum = parseFloat(prodForm.price);
    if (!prodForm.title.trim()) {
      toast.error("Product title is required.");
      return;
    }
    if (isNaN(priceNum) || priceNum <= 0) {
      toast.error("Please enter a valid price.");
      return;
    }

    try {
      if (prodForm.id) {
        // Update
        const { error } = await supabase
          .from("bot_products")
          .update({
            title: prodForm.title.trim(),
            specialty: prodForm.specialty,
            file_type: prodForm.file_type,
            price: priceNum,
            description: prodForm.description.trim(),
            download_url: prodForm.download_url.trim(),
            is_active: prodForm.is_active,
          })
          .eq("id", prodForm.id);
        if (error) throw error;
        toast.success("Product updated successfully.");
      } else {
        // Insert
        const { error } = await supabase
          .from("bot_products")
          .insert({
            title: prodForm.title.trim(),
            specialty: prodForm.specialty,
            file_type: prodForm.file_type,
            price: priceNum,
            description: prodForm.description.trim(),
            download_url: prodForm.download_url.trim(),
            is_active: prodForm.is_active,
          });
        if (error) throw error;
        toast.success("Product created successfully.");
      }
      setProdOpen(false);
      setProdForm({
        title: "",
        specialty: "internal",
        file_type: "pdf",
        price: "200",
        description: "",
        download_url: "",
        is_active: true,
      });
      await load();
    } catch (err: any) {
      toast.error(err.message || "Failed to save product.");
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    const { error } = await supabase.from("bot_products").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Product deleted.");
    await load();
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    setProfiles((prev) =>
      prev.map((p) => (p.id === userId ? { ...p, account_type: newRole } : p))
    );
    const { error } = await supabase
      .from("profiles")
      .update({ account_type: newRole })
      .eq("id", userId);
    if (error) {
      toast.error(error.message);
      await load();
      return;
    }
    toast.success(`User role changed to ${newRole}.`);
  };

  if (!authLoading && !isAdmin) {
    return (
      <AppShell homeTo="/">
        <div className="mx-auto max-w-md px-4 py-24 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive mb-4">
            <Shield className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold">Restricted Area</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This management console is strictly reserved for Tena Specal system administrators.
          </p>
          <div className="mt-6">
            <Button asChild variant="outline">
              <Link to="/">Return to Homepage</Link>
            </Button>
          </div>
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
    if (!q) return true;
    return (
      (p.full_name ?? "").toLowerCase().includes(q) ||
      (p.email ?? "").toLowerCase().includes(q) ||
      (p.phone ?? "").toLowerCase().includes(q) ||
      (p.account_type ?? "").toLowerCase().includes(q) ||
      ((p as any).telegram_username ?? "").toLowerCase().includes(q) ||
      ((p as any).telegram_id ?? "").toString().toLowerCase().includes(q)
    );
  });

  const pendingApps = apps.filter((a) => a.status === "pending").length;
  const pendingPays = consults.filter((c) => c.status === "pending").length;
  const pendingWithdrawals = payouts.filter((w) => w.status === "pending").length;
  const approvedDocs = apps.filter((a) => a.status === "approved").length;

  const totalVolume =
    consults.filter((c) => c.status === "approved").reduce((sum, c) => sum + (c.amount || 0), 0) +
    botTransactions.reduce((sum, t) => sum + (t.price || 0), 0);

  const totalCommission =
    botTransactions.reduce((sum, t) => sum + (t.commission || 0), 0) +
    consults.filter((c) => c.status === "approved").reduce((sum, c) => sum + (c.amount ? c.amount * 0.1 : 0), 0);

  return (
    <AppShell homeTo="/admin">
      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Top Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                <Radio className="h-3 w-3 animate-pulse" /> Live Telemedicine Core
              </span>
            </div>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">Management Console</h1>
            <p className="text-sm text-muted-foreground">
              Configure bot pricing, live payment details, verify doctors, and manage platform assets.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh Data"}
            </Button>
          </div>
        </div>

        {/* Analytics & Metrics Overview */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-border/60 bg-card/70 backdrop-blur-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Total Transaction Volume</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <TrendingUp className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2 text-2xl font-bold">{totalVolume.toLocaleString()} ETB</div>
              <p className="mt-1 text-xs text-muted-foreground">Combined Web & Telegram payments</p>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/70 backdrop-blur-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Platform Revenue (10%)</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                  <Sparkles className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2 text-2xl font-bold text-emerald-600">{totalCommission.toLocaleString()} ETB</div>
              <p className="mt-1 text-xs text-muted-foreground">Net commission earned by platform</p>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/70 backdrop-blur-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Active Specialists</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
                  <FileCheck2 className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2 text-2xl font-bold">{approvedDocs} Doctors</div>
              <p className="mt-1 text-xs text-muted-foreground">{pendingApps} pending verification</p>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/70 backdrop-blur-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Pending Action Queue</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
                  <Clock className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2 text-2xl font-bold text-amber-600">{pendingApps + pendingPays + pendingWithdrawals} Tasks</div>
              <p className="mt-1 text-xs text-muted-foreground">Applications, receipts & payouts</p>
            </CardContent>
          </Card>
        </div>

        {loading ? (
          <div className="mt-16 flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs defaultValue="settings" className="mt-8">
            <TabsList className="grid h-auto w-full grid-cols-2 gap-1 bg-muted/60 p-1 md:grid-cols-6">
              <TabsTrigger value="settings" className="gap-1.5 py-2.5">
                <Settings className="h-4 w-4 text-primary" /> Bot Settings
              </TabsTrigger>
              <TabsTrigger value="products" className="gap-1.5 py-2.5">
                <BookOpen className="h-4 w-4 text-primary" /> Digital Store
              </TabsTrigger>
              <TabsTrigger value="doctors" className="gap-1.5 py-2.5">
                <FileCheck2 className="h-4 w-4" /> Doctors
                {pendingApps > 0 && <Badge variant="destructive" className="ml-1 px-1.5 text-[10px]">{pendingApps}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="payments" className="gap-1.5 py-2.5">
                <Wallet className="h-4 w-4" /> Payments
                {pendingPays > 0 && <Badge variant="destructive" className="ml-1 px-1.5 text-[10px]">{pendingPays}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="withdrawals" className="gap-1.5 py-2.5">
                <Send className="h-4 w-4" /> Payouts
                {pendingWithdrawals > 0 && <Badge variant="destructive" className="ml-1 px-1.5 text-[10px]">{pendingWithdrawals}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="users" className="gap-1.5 py-2.5">
                <Users className="h-4 w-4" /> User Roles
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: BOT & PAYMENT SETTINGS */}
            <TabsContent value="settings" className="mt-6 space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl">Zero-Hardcoding Live Settings</CardTitle>
                      <CardDescription>
                        All changes saved here take effect immediately in the Telegram Bot and Website without redeployment.
                      </CardDescription>
                    </div>
                    <Button onClick={handleSaveSettings} disabled={savingSettings} className="gap-2">
                      {savingSettings ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Save All Changes
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Category: Banking & Payments */}
                  <div>
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-primary">
                      <CreditCard className="h-4 w-4" /> Banking & Mobile Money Accounts
                    </h3>
                    <div className="mt-3 grid gap-4 sm:grid-cols-3">
                      <div>
                        <Label htmlFor="cbe_account">CBE Account Number</Label>
                        <Input
                          id="cbe_account"
                          value={settings.cbe_account ?? ""}
                          onChange={(e) => setSettings({ ...settings, cbe_account: e.target.value })}
                          placeholder="e.g. 1000255631865"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="telebirr_account">Telebirr Phone Number</Label>
                        <Input
                          id="telebirr_account"
                          value={settings.telebirr_account ?? ""}
                          onChange={(e) => setSettings({ ...settings, telebirr_account: e.target.value })}
                          placeholder="e.g. 0908343267"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="account_holder">Account Holder Full Name</Label>
                        <Input
                          id="account_holder"
                          value={settings.account_holder ?? ""}
                          onChange={(e) => setSettings({ ...settings, account_holder: e.target.value })}
                          placeholder="e.g. Tazebachew Wudie"
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-border pt-4">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-primary">
                      <Send className="h-4 w-4" /> Telegram Group & Channel Links
                    </h3>
                    <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <Label htmlFor="admin_group_id">Admin Group Chat ID</Label>
                        <Input
                          id="admin_group_id"
                          value={settings.admin_group_id ?? ""}
                          onChange={(e) => setSettings({ ...settings, admin_group_id: e.target.value })}
                          placeholder="e.g. -5373266757"
                          className="mt-1"
                        />
                        <p className="mt-1 text-[11px] text-muted-foreground">Receipts & applications forwarded here</p>
                      </div>
                      <div>
                        <Label htmlFor="free_channel">Free Health Channel</Label>
                        <Input
                          id="free_channel"
                          value={settings.free_channel ?? ""}
                          onChange={(e) => setSettings({ ...settings, free_channel: e.target.value })}
                          placeholder="https://t.me/tenachinfree"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="premium_channel">Premium Channel</Label>
                        <Input
                          id="premium_channel"
                          value={settings.premium_channel ?? ""}
                          onChange={(e) => setSettings({ ...settings, premium_channel: e.target.value })}
                          placeholder="https://t.me/tenachinpremium"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="free_group">Free Discussion Group</Label>
                        <Input
                          id="free_group"
                          value={settings.free_group ?? ""}
                          onChange={(e) => setSettings({ ...settings, free_group: e.target.value })}
                          placeholder="https://t.me/+UXHaDU3GIudlY2U0"
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-border pt-4">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-primary">
                      <Phone className="h-4 w-4" /> Support & Helpline Contacts
                    </h3>
                    <div className="mt-3 grid gap-4 sm:grid-cols-3">
                      <div>
                        <Label htmlFor="support_phone_1">Primary Support Phone</Label>
                        <Input
                          id="support_phone_1"
                          value={settings.support_phone_1 ?? ""}
                          onChange={(e) => setSettings({ ...settings, support_phone_1: e.target.value })}
                          placeholder="+251 90 834 3267"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="support_phone_2">Secondary Support Phone</Label>
                        <Input
                          id="support_phone_2"
                          value={settings.support_phone_2 ?? ""}
                          onChange={(e) => setSettings({ ...settings, support_phone_2: e.target.value })}
                          placeholder="0967449552"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="support_username">Support Telegram Handle</Label>
                        <Input
                          id="support_username"
                          value={settings.support_username ?? ""}
                          onChange={(e) => setSettings({ ...settings, support_username: e.target.value })}
                          placeholder="@tenachinbottelemedicine"
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-border pt-4">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-primary">
                      <Globe className="h-4 w-4" /> Pricing & Platform Commission
                    </h3>
                    <div className="mt-3 grid gap-4 sm:grid-cols-3">
                      <div>
                        <Label htmlFor="premium_price">Premium Channel Fee (ETB/mo)</Label>
                        <Input
                          id="premium_price"
                          type="number"
                          value={settings.premium_price ?? "24"}
                          onChange={(e) => setSettings({ ...settings, premium_price: e.target.value })}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="commission_pct">Platform Commission (%)</Label>
                        <Input
                          id="commission_pct"
                          type="number"
                          value={settings.commission_pct ?? "10"}
                          onChange={(e) => setSettings({ ...settings, commission_pct: e.target.value })}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="website_url">Portal Website Address</Label>
                        <Input
                          id="website_url"
                          value={settings.website_url ?? ""}
                          onChange={(e) => setSettings({ ...settings, website_url: e.target.value })}
                          placeholder="https://healthlink-gate-main-nine.vercel.app/"
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button onClick={handleSaveSettings} disabled={savingSettings} size="lg" className="gap-2">
                      {savingSettings ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Save Configuration
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 2: DIGITAL STORE & PRODUCTS */}
            <TabsContent value="products" className="mt-6 space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <CardTitle className="text-xl">Digital Health Education Store</CardTitle>
                      <CardDescription>
                        Create and manage books, lecture videos, and PDF guides. All items appear dynamically in the bot.
                      </CardDescription>
                    </div>
                    <Dialog open={prodOpen} onOpenChange={setProdOpen}>
                      <DialogTrigger asChild>
                        <Button
                          onClick={() => {
                            setProdForm({
                              title: "",
                              specialty: "internal",
                              file_type: "pdf",
                              price: "200",
                              description: "",
                              download_url: "",
                              is_active: true,
                            });
                          }}
                          className="gap-2"
                        >
                          <Plus className="h-4 w-4" /> Add Digital Product
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                          <DialogTitle>{prodForm.id ? "Edit Digital Product" : "New Digital Product"}</DialogTitle>
                          <DialogDescription>
                            Configure the title, price, specialty, and delivery link.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-3">
                          <div>
                            <Label htmlFor="p_title">Title (Amharic & English)</Label>
                            <Input
                              id="p_title"
                              value={prodForm.title}
                              onChange={(e) => setProdForm({ ...prodForm, title: e.target.value })}
                              placeholder="e.g. የደም ግፊት መከላከያ (Hypertension Guide)"
                              className="mt-1"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label>Department / Specialty</Label>
                              <Select
                                value={prodForm.specialty}
                                onValueChange={(val) => setProdForm({ ...prodForm, specialty: val })}
                              >
                                <SelectTrigger className="mt-1">
                                  <SelectValue placeholder="Select specialty" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="internal">Internal Medicine (የውስጥ ደዌ)</SelectItem>
                                  <SelectItem value="obgyn">OBGYN (የማህፀንና ፅንስ)</SelectItem>
                                  <SelectItem value="peds">Pediatrics (የሕፃናት ህክምና)</SelectItem>
                                  <SelectItem value="general">General Health</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label>Media / File Type</Label>
                              <Select
                                value={prodForm.file_type}
                                onValueChange={(val) => setProdForm({ ...prodForm, file_type: val })}
                              >
                                <SelectTrigger className="mt-1">
                                  <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pdf">PDF E-Book</SelectItem>
                                  <SelectItem value="video">Video Lecture</SelectItem>
                                  <SelectItem value="doc">Document Guide</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label htmlFor="p_price">Price (ETB)</Label>
                              <Input
                                id="p_price"
                                type="number"
                                value={prodForm.price}
                                onChange={(e) => setProdForm({ ...prodForm, price: e.target.value })}
                                placeholder="200"
                                className="mt-1"
                              />
                            </div>
                            <div className="flex items-center space-x-2 pt-6">
                              <Switch
                                id="p_active"
                                checked={prodForm.is_active}
                                onCheckedChange={(val) => setProdForm({ ...prodForm, is_active: val })}
                              />
                              <Label htmlFor="p_active">Available in Bot Store</Label>
                            </div>
                          </div>
                          <div>
                            <Label htmlFor="p_desc">Description / Overview</Label>
                            <Textarea
                              id="p_desc"
                              value={prodForm.description}
                              onChange={(e) => setProdForm({ ...prodForm, description: e.target.value })}
                              placeholder="Brief summary of what readers will learn..."
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label htmlFor="p_url">Telegram File ID or Download Link</Label>
                            <Input
                              id="p_url"
                              value={prodForm.download_url}
                              onChange={(e) => setProdForm({ ...prodForm, download_url: e.target.value })}
                              placeholder="e.g. BQACAgQAAxkBAA... or https://..."
                              className="mt-1"
                            />
                            <p className="mt-1.5 text-[11px] text-muted-foreground">
                              💡 <b>Automatic Delivery:</b> Upload your PDF book to the Telegram Bot with caption <code>/getfileid</code>, copy the File ID, and paste it here. When payment is approved, the bot instantly sends the book directly to the user!
                            </p>
                          </div>
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => setProdOpen(false)}>
                            Cancel
                          </Button>
                          <Button onClick={handleSaveProduct}>Save Product</Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent>
                  {products.length === 0 ? (
                    <Empty text="No digital products configured yet. Click 'Add Digital Product' to create one." />
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {products.map((p) => (
                        <Card key={p.id} className="relative border-border/80 bg-card">
                          <CardHeader className="pb-2">
                            <div className="flex items-start justify-between gap-2">
                              <CardTitle className="text-base font-semibold">{p.title}</CardTitle>
                              <Badge variant={p.is_active ? "default" : "secondary"}>
                                {p.is_active ? "Active" : "Disabled"}
                              </Badge>
                            </div>
                            <CardDescription className="text-xs">
                              {p.specialty.toUpperCase()} · {p.file_type.toUpperCase()}
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-3 text-sm">
                            <div className="text-xl font-bold text-primary">{p.price} ETB</div>
                            {p.description && <p className="text-xs text-muted-foreground line-clamp-2">{p.description}</p>}
                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setProdForm({
                                    id: p.id,
                                    title: p.title,
                                    specialty: p.specialty,
                                    file_type: p.file_type,
                                    price: p.price.toString(),
                                    description: p.description || "",
                                    download_url: p.download_url || "",
                                    is_active: p.is_active,
                                  });
                                  setProdOpen(true);
                                }}
                              >
                                <Edit2 className="mr-1 h-3.5 w-3.5" /> Edit
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => void handleDeleteProduct(p.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 3: DOCTORS */}
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
                        <ExternalLink className="mr-1.5 h-4 w-4" /> View Medical License
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

            {/* TAB 4: PAYMENTS */}
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
                        <ExternalLink className="mr-1.5 h-4 w-4" /> View Payment Screenshot
                      </Button>
                      {c.status === "approved" && (
                        <Button asChild variant="soft" size="sm">
                          <Link to="/chat/$consultationId" params={{ consultationId: c.id }}>
                            <MessageSquare className="mr-1.5 h-4 w-4" /> Open Chat Room
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

            {/* TAB 5: WITHDRAWALS */}
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
                      Telegram: {w.telegram_username} · {new Date(w.created_at).toLocaleString()}
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

            {/* TAB 6: USERS & ROLES */}
            <TabsContent value="users" className="mt-6">
              <div className="flex items-center gap-3">
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search user accounts by name, email, or phone number..."
                  maxLength={80}
                  className="max-w-md"
                />
              </div>
              <div className="mt-4 divide-y divide-border rounded-xl border border-border bg-card">
                {filteredProfiles.map((p) => (
                  <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-foreground">{p.full_name || "Unnamed User"}</div>
                      <div className="text-xs text-muted-foreground">
                        {p.email || "No email"} {p.phone ? `· ${p.phone}` : ""}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Select
                        value={p.account_type}
                        onValueChange={(val) => void handleUpdateRole(p.id, val)}
                      >
                        <SelectTrigger className="h-8 w-32 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="patient">Patient</SelectItem>
                          <SelectItem value="doctor">Doctor</SelectItem>
                          <SelectItem value="admin">Administrator</SelectItem>
                        </SelectContent>
                      </Select>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(p.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
                {filteredProfiles.length === 0 && (
                  <div className="p-8 text-center text-sm text-muted-foreground">
                    No users match your search criteria.
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
          <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Approve
        </Button>
        <Button variant="destructive" size="sm" onClick={() => onDecide("declined")}>
          <XCircle className="mr-1 h-3.5 w-3.5" /> Decline
        </Button>
      </div>
      {status !== "pending" && (
        <span className="text-xs text-muted-foreground">Status: {status}</span>
      )}
    </div>
  );
}
