import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Send,
  Loader2,
  Paperclip,
  Mic,
  Square,
  Star,
  Play,
  FileText,
} from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { StarRating } from "@/components/StarRating";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { planById } from "@/lib/tena";

export const Route = createFileRoute("/_authenticated/chat/$consultationId")({
  head: () => ({
    meta: [
      { title: "Consultation Chat — Tena Specal" },
      {
        name: "description",
        content: "Private, secure messaging between patient and verified doctor on Tena Specal.",
      },
      { property: "og:title", content: "Consultation Chat — Tena Specal" },
      { property: "og:description", content: "Your private consultation chat." },
    ],
  }),
  component: ChatPage,
});

type Message = {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  attachment_path: string | null;
  attachment_type: string | null;
  attachment_name: string | null;
};

const MSG_COLS = "id, sender_id, content, created_at, attachment_path, attachment_type, attachment_name";
const MAX_UPLOAD = 25 * 1024 * 1024;

function kindFor(file: File): "image" | "video" | "audio" | "file" {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  return "file";
}

function ChatPage() {
  const { consultationId } = useParams({ from: "/_authenticated/chat/$consultationId" });
  const { user, profile, isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [partner, setPartner] = useState("Consultation");
  const [planLabel, setPlanLabel] = useState("");
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [isPatient, setIsPatient] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [rateOpen, setRateOpen] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    void (async () => {
      const { data: consult } = await supabase
        .from("consultations")
        .select("id, patient_id, doctor_id, plan, status")
        .eq("id", consultationId)
        .maybeSingle();

      if (cancelled) return;
      if (!consult || (consult.status !== "approved" && !isAdmin)) {
        setAllowed(false);
        setLoading(false);
        return;
      }
      setAllowed(true);
      setPlanLabel(planById(consult.plan)?.name ?? consult.plan);
      setDoctorId(consult.doctor_id);
      setIsPatient(consult.patient_id === user.id);

      const otherId = consult.patient_id === user.id ? consult.doctor_id : consult.patient_id;
      const [{ data: prof }, { data: docApp }] = await Promise.all([
        supabase.from("profiles").select("full_name, email").eq("id", otherId).maybeSingle(),
        supabase
          .from("public_doctor_profiles")
          .select("full_name, specialty")
          .eq("doctor_id", otherId)
          .maybeSingle(),
      ]);
      setPartner(docApp?.full_name || prof?.full_name || prof?.email || "Consultation");

      const { data: msgs } = await supabase
        .from("messages")
        .select(MSG_COLS)
        .eq("consultation_id", consultationId)
        .order("created_at", { ascending: true });
      if (!cancelled) {
        setMessages((msgs as Message[]) ?? []);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consultationId, user?.id, isAdmin]);

  useEffect(() => {
    if (!allowed) return;
    const channel = supabase
      .channel(`messages-${consultationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `consultation_id=eq.${consultationId}`,
        },
        (payload) => {
          const m = payload.new as Message;
          setMessages((prev) => (prev.some((p) => p.id === m.id) ? prev : [...prev, m]));
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [allowed, consultationId]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const pushMessage = (m: Message) =>
    setMessages((prev) => (prev.some((p) => p.id === m.id) ? prev : [...prev, m]));

  const insertMessage = async (payload: {
    content: string;
    attachment_path?: string | null;
    attachment_type?: string | null;
    attachment_name?: string | null;
  }) => {
    if (!user) return;
    const { data, error } = await supabase
      .from("messages")
      .insert({
        consultation_id: consultationId,
        sender_id: user.id,
        content: payload.content,
        attachment_path: payload.attachment_path ?? null,
        attachment_type: payload.attachment_type ?? null,
        attachment_name: payload.attachment_name ?? null,
      })
      .select(MSG_COLS)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (data) pushMessage(data as Message);
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = draft.trim();
    if (!content || !user) return;
    setSending(true);
    try {
      await insertMessage({ content });
      setDraft("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send message.");
    } finally {
      setSending(false);
    }
  };

  const uploadAndSend = async (file: File, kind: "image" | "video" | "audio" | "file") => {
    if (!user) return;
    if (file.size > MAX_UPLOAD) {
      toast.error("File is larger than 25MB.");
      return;
    }
    setSending(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || (kind === "audio" ? "webm" : "bin");
      const path = `${consultationId}/${user.id}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("chat-media")
        .upload(path, file, { upsert: false, contentType: file.type || "application/octet-stream" });
      if (upErr) throw upErr;
      await insertMessage({
        content: draft.trim(),
        attachment_path: path,
        attachment_type: kind,
        attachment_name: file.name,
      });
      setDraft("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send the attachment.");
    } finally {
      setSending(false);
    }
  };

  const backTo = isAdmin ? "/admin" : profile?.account_type === "doctor" ? "/doctor" : "/patient";

  return (
    <AppShell homeTo={backTo}>
      <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-3xl flex-col px-4">
        <div className="flex items-center gap-3 border-b border-border py-4">
          <Button asChild variant="ghost" size="icon">
            <Link to={backTo}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="min-w-0">
            <div className="truncate font-semibold">{partner}</div>
            {planLabel && <div className="text-xs text-muted-foreground">{planLabel}</div>}
          </div>
          <div className="ml-auto flex items-center gap-2">
            {allowed && isPatient && (
              <Button variant="soft" size="sm" onClick={() => setRateOpen(true)}>
                <Star className="mr-1.5 h-4 w-4" /> Rate doctor
              </Button>
            )}
            {allowed && <Badge variant="secondary">Secure chat</Badge>}
          </div>
        </div>

        {loading ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !allowed ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <p className="max-w-sm text-sm text-muted-foreground">
              This chat isn't available yet. It unlocks after the admin verifies the payment for this
              consultation.
            </p>
            <Button asChild variant="soft">
              <Link to={backTo}>Go back</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="flex-1 space-y-3 overflow-y-auto py-5">
              {messages.length === 0 && (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  No messages yet — say hello and describe how you feel.
                </p>
              )}
              {messages.map((m) => {
                const mine = m.sender_id === user?.id;
                return (
                  <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm shadow-soft ${
                        mine
                          ? "rounded-br-md bg-primary text-primary-foreground"
                          : "rounded-bl-md bg-card text-card-foreground"
                      }`}
                    >
                      {m.attachment_path && (
                        <Attachment
                          path={m.attachment_path}
                          type={m.attachment_type}
                          name={m.attachment_name}
                        />
                      )}
                      {m.content && (
                        <p className="whitespace-pre-wrap break-words">{m.content}</p>
                      )}
                      <div
                        className={`mt-1 text-[10px] ${mine ? "opacity-70" : "text-muted-foreground"}`}
                      >
                        {new Date(m.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={bottom} />
            </div>

            <form onSubmit={send} className="flex items-center gap-2 border-t border-border py-4">
              <input
                ref={fileInput}
                type="file"
                accept="image/*,video/*,audio/*,application/pdf"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f) void uploadAndSend(f, kindFor(f));
                }}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Attach photo, video or file"
                disabled={sending}
                onClick={() => fileInput.current?.click()}
              >
                <Paperclip className="h-4 w-4" />
              </Button>
              <VoiceRecorder
                disabled={sending}
                onRecorded={(file) => void uploadAndSend(file, "audio")}
              />
              <Input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Write a message…"
                maxLength={2000}
              />
              <Button type="submit" variant="hero" size="icon" disabled={sending || !draft.trim()}>
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </form>
          </>
        )}
      </div>

      {doctorId && isPatient && (
        <RatingDialog
          open={rateOpen}
          onOpenChange={setRateOpen}
          consultationId={consultationId}
          doctorId={doctorId}
          doctorName={partner}
        />
      )}
    </AppShell>
  );
}

function Attachment({
  path,
  type,
  name,
}: {
  path: string;
  type: string | null;
  name: string | null;
}) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void supabase.storage
      .from("chat-media")
      .createSignedUrl(path, 60 * 60)
      .then(({ data }) => {
        if (active) setUrl(data?.signedUrl ?? null);
      });
    return () => {
      active = false;
    };
  }, [path]);

  if (!url) {
    return (
      <div className="mb-2 flex h-24 w-56 items-center justify-center rounded-lg bg-muted/40">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (type === "image") {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="mb-2 block">
        <img
          src={url}
          alt={name ?? "Shared photo"}
          loading="lazy"
          className="max-h-64 w-full rounded-lg object-cover"
        />
      </a>
    );
  }
  if (type === "video") {
    return <video src={url} controls className="mb-2 max-h-64 w-full rounded-lg" />;
  }
  if (type === "audio") {
    return (
      <div className="mb-2 flex items-center gap-2">
        <Play className="h-4 w-4 shrink-0 opacity-70" />
        <audio src={url} controls className="h-9 w-56 max-w-full" />
      </div>
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="mb-2 flex items-center gap-2 underline underline-offset-2"
    >
      <FileText className="h-4 w-4" />
      {name ?? "Attachment"}
    </a>
  );
}

function VoiceRecorder({
  disabled,
  onRecorded,
}: {
  disabled?: boolean;
  onRecorded: (file: File) => void;
}) {
  const [recording, setRecording] = useState(false);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  const stop = () => {
    recorder.current?.stop();
    setRecording(false);
  };

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunks.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data);
      };
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks.current, { type: rec.mimeType || "audio/webm" });
        if (blob.size === 0) return;
        onRecorded(
          new File([blob], `voice-${Date.now()}.webm`, { type: blob.type || "audio/webm" }),
        );
      };
      recorder.current = rec;
      rec.start();
      setRecording(true);
    } catch {
      toast.error("Microphone access is needed to record a voice note.");
    }
  };

  return (
    <Button
      type="button"
      variant={recording ? "destructive" : "ghost"}
      size="icon"
      disabled={disabled}
      aria-label={recording ? "Stop recording" : "Record a voice note"}
      onClick={() => (recording ? stop() : void start())}
    >
      {recording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
    </Button>
  );
}

function RatingDialog({
  open,
  onOpenChange,
  consultationId,
  doctorId,
  doctorName,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  consultationId: string;
  doctorId: string;
  doctorName: string;
}) {
  const { user } = useAuth();
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    void supabase
      .from("doctor_ratings")
      .select("stars, comment")
      .eq("consultation_id", consultationId)
      .eq("patient_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setStars(data.stars);
          setComment(data.comment ?? "");
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user?.id, consultationId]);

  const submit = async () => {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("doctor_ratings").upsert(
      {
        consultation_id: consultationId,
        patient_id: user.id,
        doctor_id: doctorId,
        stars,
        comment: comment.trim() || null,
      },
      { onConflict: "consultation_id,patient_id" },
    );
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Thank you for your rating!");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rate {doctorName}</DialogTitle>
          <DialogDescription>
            Your rating helps other patients choose the right specialist.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <StarRating value={stars} onChange={setStars} size={28} />
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
            maxLength={1000}
            placeholder="Write a short comment about your experience (optional)"
          />
        </div>
        <DialogFooter>
          <Button variant="hero" onClick={() => void submit()} disabled={busy}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit rating
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
