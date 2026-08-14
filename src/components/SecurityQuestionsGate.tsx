import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, ShieldQuestion } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { useAuth } from "@/hooks/useAuth";
import { getMySecurityStatus, saveMySecurityQuestions } from "@/lib/security.functions";
import { SECURITY_QUESTION_OPTIONS } from "@/lib/tena";

/**
 * After sign-in, ask the user to set 4 private questions (only they know the
 * answers). The same questions are used to reset a forgotten password.
 */
export function SecurityQuestionsGate() {
  const { user, loading } = useAuth();
  const status = useServerFn(getMySecurityStatus);
  const save = useServerFn(saveMySecurityQuestions);

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState(
    [0, 1, 2, 3].map((i) => ({
      question: SECURITY_QUESTION_OPTIONS[i] ?? "",
      answer: "",
    })),
  );

  useEffect(() => {
    if (loading || !user) return;
    let active = true;
    void (async () => {
      try {
        const res = await status({});
        if (active && !res.configured) setOpen(true);
      } catch {
        /* ignore — never block the app on this */
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user?.id]);

  const submit = async () => {
    if (items.some((i) => !i.question.trim() || !i.answer.trim())) {
      toast.error("Please answer all four questions.");
      return;
    }
    const unique = new Set(items.map((i) => i.question));
    if (unique.size !== 4) {
      toast.error("Please choose four different questions.");
      return;
    }
    setBusy(true);
    try {
      await save({ data: { items } });
      toast.success("Security questions saved.");
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save your answers.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => undefined}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldQuestion className="h-5 w-5 text-primary" /> Secure your account
          </DialogTitle>
          <DialogDescription>
            Answer four questions only you know. If you ever forget your password, these answers let
            you set a new one.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {items.map((item, idx) => (
            <div key={idx} className="space-y-1.5 rounded-lg border border-border p-3">
              <Label>Question {idx + 1}</Label>
              <Select
                value={item.question}
                onValueChange={(v) =>
                  setItems((prev) => prev.map((p, i) => (i === idx ? { ...p, question: v } : p)))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a question" />
                </SelectTrigger>
                <SelectContent>
                  {SECURITY_QUESTION_OPTIONS.map((q) => (
                    <SelectItem key={q} value={q}>
                      {q}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                value={item.answer}
                onChange={(e) =>
                  setItems((prev) =>
                    prev.map((p, i) => (i === idx ? { ...p, answer: e.target.value } : p)),
                  )
                }
                placeholder="Your answer"
                maxLength={120}
              />
            </div>
          ))}
          <p className="text-xs text-muted-foreground">
            Answers are stored encrypted — nobody, including our team, can read them.
          </p>
        </div>

        <DialogFooter>
          <Button variant="hero" onClick={() => void submit()} disabled={busy}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save answers
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
