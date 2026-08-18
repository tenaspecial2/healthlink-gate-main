import { useEffect, useState } from "react";
import { Camera, Loader2, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { WEEKDAYS } from "@/lib/tena";

// ── Types ──────────────────────────────────────────────────────────
export type TimeRange = { from: string; to: string };
export type DaySlot   = { off: boolean; slots: TimeRange[] };
export type Schedule  = Record<string, DaySlot>;

const DEFAULT_SLOT: TimeRange = { from: "09:00", to: "17:00" };

export const defaultSchedule: Schedule = Object.fromEntries(
  WEEKDAYS.map((d) => [
    d,
    { off: d === "Sunday", slots: [{ ...DEFAULT_SLOT }] } satisfies DaySlot,
  ]),
);

/** Parse schedule — handles both old single-slot format and new multi-slot format */
export function parseSchedule(raw: string | null | undefined): Schedule {
  if (!raw) return defaultSchedule;
  try {
    const parsed = JSON.parse(raw) as Record<string, any>;
    const result: Schedule = {};
    for (const d of WEEKDAYS) {
      const v = parsed[d] ?? defaultSchedule[d]!;
      if (Array.isArray(v.slots)) {
        result[d] = { off: Boolean(v.off), slots: v.slots };
      } else {
        // Legacy single-slot format: { off, from, to }
        result[d] = {
          off: Boolean(v.off),
          slots: [{ from: v.from ?? "09:00", to: v.to ?? "17:00" }],
        };
      }
    }
    return result;
  } catch {
    return defaultSchedule;
  }
}

export function scheduleSummary(raw: string | null | undefined): string[] {
  const s = parseSchedule(raw);
  const lines: string[] = [];
  for (const d of WEEKDAYS) {
    const day = s[d];
    if (!day || day.off) continue;
    const times = day.slots.map((sl) => `${sl.from}–${sl.to}`).join(", ");
    lines.push(`${d}: ${times}`);
  }
  return lines;
}

// ── ScheduleEditor ─────────────────────────────────────────────────
export function ScheduleEditor({
  value,
  onChange,
}: {
  value: Schedule;
  onChange: (v: Schedule) => void;
}) {
  const setDay = (day: string, patch: Partial<DaySlot>) =>
    onChange({ ...value, [day]: { ...value[day]!, ...patch } });

  const addSlot = (day: string) => {
    const existing = value[day]!.slots;
    onChange({
      ...value,
      [day]: { ...value[day]!, slots: [...existing, { from: "09:00", to: "17:00" }] },
    });
  };

  const removeSlot = (day: string, idx: number) => {
    const slots = value[day]!.slots.filter((_, i) => i !== idx);
    onChange({ ...value, [day]: { ...value[day]!, slots: slots.length ? slots : [{ ...DEFAULT_SLOT }] } });
  };

  const patchSlot = (day: string, idx: number, patch: Partial<TimeRange>) => {
    const slots = value[day]!.slots.map((s, i) => (i === idx ? { ...s, ...patch } : s));
    onChange({ ...value, [day]: { ...value[day]!, slots } });
  };

  return (
    <div className="space-y-2">
      <Label>Weekly availability</Label>
      <p className="text-xs text-muted-foreground">
        Add one or more time slots per day. Patients see these hours on your profile.
      </p>
      <div className="mt-2 space-y-2">
        {WEEKDAYS.map((day) => {
          const dayData = value[day] ?? { off: true, slots: [{ ...DEFAULT_SLOT }] };
          return (
            <div key={day} className="rounded-lg border border-border p-3 space-y-2">
              {/* Day header */}
              <div className="flex items-center gap-3">
                <span className="w-24 text-sm font-medium">{day}</span>
                <Switch
                  checked={!dayData.off}
                  onCheckedChange={(checked) => setDay(day, { off: !checked })}
                  aria-label={`Available on ${day}`}
                />
                {dayData.off && (
                  <span className="text-xs text-muted-foreground">Not available</span>
                )}
                {!dayData.off && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="ml-auto h-7 gap-1 text-xs"
                    onClick={() => addSlot(day)}
                  >
                    <Plus className="h-3 w-3" /> Add slot
                  </Button>
                )}
              </div>

              {/* Time slots */}
              {!dayData.off && (
                <div className="space-y-1.5 pl-2">
                  {dayData.slots.map((slot, idx) => (
                    <div key={idx} className="flex flex-wrap items-center gap-2">
                      <Input
                        type="time"
                        value={slot.from}
                        onChange={(e) => patchSlot(day, idx, { from: e.target.value })}
                        className="w-32"
                      />
                      <span className="text-muted-foreground text-sm">–</span>
                      <Input
                        type="time"
                        value={slot.to}
                        onChange={(e) => patchSlot(day, idx, { to: e.target.value })}
                        className="w-32"
                      />
                      {dayData.slots.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => removeSlot(day, idx)}
                          aria-label="Remove slot"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Signed URL for a private avatar path. */
export function useAvatarUrl(path: string | null | undefined) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!path) { setUrl(null); return; }
    let active = true;
    void supabase.storage
      .from("avatars")
      .createSignedUrl(path, 60 * 60)
      .then(({ data }) => {
        if (active) setUrl(data?.signedUrl ?? null);
      });
    return () => { active = false; };
  }, [path]);
  return url;
}

export function AvatarPicker({
  file,
  existingPath,
  onPick,
}: {
  file: File | null;
  existingPath?: string | null;
  onPick: (f: File | null) => void;
}) {
  const existingUrl = useAvatarUrl(existingPath);
  const preview = file ? URL.createObjectURL(file) : existingUrl;

  return (
    <div className="space-y-1.5">
      <Label>Profile picture</Label>
      <label className="flex cursor-pointer items-center gap-4 rounded-lg border border-dashed border-border bg-muted/40 p-4 transition-colors hover:bg-muted">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent text-accent-foreground">
          {preview ? (
            <img src={preview} alt="Profile preview" className="h-full w-full object-cover" />
          ) : (
            <Camera className="h-6 w-6" />
          )}
        </span>
        <span className="text-sm text-muted-foreground">
          {file ? file.name : "Upload a clear photo of yourself (max 5MB)"}
        </span>
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => onPick(e.target.files?.[0] ?? null)}
        />
      </label>
    </div>
  );
}

export function uploadingSpinner() {
  return <Loader2 className="h-4 w-4 animate-spin" />;
}
