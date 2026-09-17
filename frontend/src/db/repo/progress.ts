import { apiClient } from "../../api/client";
import { activeProfile, db } from "../schema";
import { dayInTimezone, generateLocalReminders } from "../reminders";
import { isFakeOffline } from "../outbox";
export interface ProgressSummary {completed_today: number; points: number; streak_days: number; favourite_games: string[]; upcoming: Array<{id: string; title: string}>;}
export async function loadProgress(): Promise<ProgressSummary> {
 const profile = await activeProfile();
 if (!profile) throw new Error("Patient profile unavailable");
 await generateLocalReminders(profile.id);
 if (!isFakeOffline() && navigator.onLine) try {return await apiClient<ProgressSummary>(`/api/v1/patients/${profile.id}/progress-summary/`, {method: "GET"});} catch { /* Show locally saved progress. */ }
 const reminders = await db.reminders.where("patientId").equals(profile.id).toArray();
 const completeDays = new Set(reminders.filter((x) => x.status === "taken").map((x) => dayInTimezone(new Date(x.scheduled_at))));
 let streak = 0; const today = dayInTimezone(); const day = new Date(`${today}T12:00:00Z`);
 while (completeDays.has(dayInTimezone(day))) {streak++; day.setUTCDate(day.getUTCDate() - 1);}
 const completed = reminders.filter((x) => x.status === "taken" && dayInTimezone(new Date(x.scheduled_at)) === today).length;
 return {completed_today: completed, points: completed * 10, streak_days: streak, favourite_games: [], upcoming: reminders.filter((x) => ["pending", "later"].includes(x.status) && Date.parse(x.snoozed_until ?? x.scheduled_at) >= Date.now()).sort((a,b) => a.scheduled_at.localeCompare(b.scheduled_at)).slice(0,3)};
}
