import { useEffect, useState } from "react";
import { Camera, Loader2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { WEEKDAYS } from "@/lib/tena";

export type DaySlot = { off: boolean; from: string; to: string };
export type Schedule = Record<string, DaySlot>;

export const defaultSchedule: Schedule = Object.fromEntries(
  WEEKDAYS.map((d) => [
    d,
    { off: d === "Sunday", from: "09:00", to: "17:00" } satisfies DaySlot,
  ]),
);

export function parseSchedule(raw: string | null | undefined): Schedule {
  if (!raw) return defaultSchedule;
  try {
    const parsed = JSON.parse(raw) as Schedule;
    return { ...defaultSchedule, ...parsed };
  } catch {
    return defaultSchedule;
  }
}

export function scheduleSummary(raw: string | null | undefined): string[] {
  const s = parseSchedule(raw);
  return WEEKDAYS.filter((d) => !s[d]?.off).map((d) => `${d} ${s[d]!.from}–${s[d]!.to}`);
}

export function ScheduleEditor({
  value,
  onChange,
}: {
  value: Schedule;
  onChange: (v: Schedule) => void;
}) {
  const set = (day: string, patch: Partial<DaySlot>) =>
    onChange({ ...value, [day]: { ...value[day]!, ...patch } });

  return (
    <div className="space-y-2">
      <Label>Weekly availability</Label>
      <p className="text-xs text-muted-foreground">
        Patients see these hours on your profile, so they know when to expect a reply.
      </p>
      <div className="mt-2 space-y-2">
        {WEEKDAYS.map((day) => {
          const slot = value[day] ?? { off: true, from: "09:00", to: "17:00" };
          return (
            <div
              key={day}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3"
            >
              <span className="w-24 text-sm font-medium">{day}</span>
              <Switch
                checked={!slot.off}
                onCheckedChange={(checked) => set(day, { off: !checked })}
                aria-label={`Available on ${day}`}
              />
              {slot.off ? (
                <span className="text-xs text-muted-foreground">Not available</span>
              ) : (
                <div className="flex items-center gap-2">
                  <Input
                    type="time"
                    value={slot.from}
                    onChange={(e) => set(day, { from: e.target.value })}
                    className="w-32"
                  />
                  <span className="text-muted-foreground">–</span>
                  <Input
                    type="time"
                    value={slot.to}
                    onChange={(e) => set(day, { to: e.target.value })}
                    className="w-32"
                  />
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
    if (!path) {
      setUrl(null);
      return;
    }
    let active = true;
    void supabase.storage
      .from("avatars")
      .createSignedUrl(path, 60 * 60)
      .then(({ data }) => {
        if (active) setUrl(data?.signedUrl ?? null);
      });
    return () => {
      active = false;
    };
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
