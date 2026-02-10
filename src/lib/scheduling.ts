import { addDays, addHours, setHours, setMinutes, isBefore, getDay } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";

export interface SendingSchedule {
  startHour: number; // 0-23
  endHour: number; // 0-23
  days: number[]; // 0=Sun, 1=Mon … 6=Sat
  timezone: string; // IANA timezone
}

const DEFAULT_SCHEDULE: SendingSchedule = {
  startHour: 9,
  endHour: 17,
  days: [1, 2, 3, 4, 5], // Mon-Fri
  timezone: "UTC",
};

/**
 * Parse the JSON sendingSchedule stored on a Campaign into a typed object.
 */
export function parseSchedule(
  raw: unknown
): SendingSchedule {
  if (!raw || typeof raw !== "object") return DEFAULT_SCHEDULE;
  const obj = raw as Record<string, unknown>;

  return {
    startHour:
      typeof obj.startHour === "number" ? obj.startHour : DEFAULT_SCHEDULE.startHour,
    endHour:
      typeof obj.endHour === "number" ? obj.endHour : DEFAULT_SCHEDULE.endHour,
    days: Array.isArray(obj.days)
      ? (obj.days as number[])
      : DEFAULT_SCHEDULE.days,
    timezone:
      typeof obj.timezone === "string"
        ? obj.timezone
        : DEFAULT_SCHEDULE.timezone,
  };
}

/**
 * Calculate the next valid send time given:
 *  - A base time (now or previous step completion)
 *  - A delay (days + hours from sequence step)
 *  - A sending schedule (business hours, allowed days, timezone)
 */
export function calculateNextSendTime(
  baseTime: Date,
  delayDays: number,
  delayHours: number,
  schedule: SendingSchedule
): Date {
  // 1. Apply the raw delay
  const target = addHours(addDays(baseTime, delayDays), delayHours);

  // 2. Convert to campaign timezone
  let zonedTarget = toZonedTime(target, schedule.timezone);

  // 3. Ensure the time falls within the allowed window
  // Try up to 14 days to find a valid slot (avoids infinite loop)
  for (let attempt = 0; attempt < 14; attempt++) {
    const dayOfWeek = getDay(zonedTarget); // 0-6

    if (schedule.days.includes(dayOfWeek)) {
      const startOfWindow = setMinutes(
        setHours(zonedTarget, schedule.startHour),
        0
      );
      const endOfWindow = setMinutes(
        setHours(zonedTarget, schedule.endHour),
        0
      );

      // If before the start window on an allowed day, snap to start
      if (isBefore(zonedTarget, startOfWindow)) {
        zonedTarget = startOfWindow;
        // Add some random jitter (0-30 min) to look more natural
        const jitterMinutes = Math.floor(Math.random() * 30);
        zonedTarget = addMinutes(zonedTarget, jitterMinutes);
        break;
      }

      // If within the window, use as-is
      if (isBefore(zonedTarget, endOfWindow)) {
        break;
      }
    }

    // Move to next day at the start of the sending window
    zonedTarget = setMinutes(
      setHours(addDays(zonedTarget, 1), schedule.startHour),
      0
    );
  }

  // 4. Convert back to UTC
  return fromZonedTime(zonedTarget, schedule.timezone);
}

/**
 * Check if the current moment is within the campaign's sending window.
 */
export function isWithinSendingWindow(schedule: SendingSchedule): boolean {
  const now = toZonedTime(new Date(), schedule.timezone);
  const dayOfWeek = getDay(now);

  if (!schedule.days.includes(dayOfWeek)) return false;

  const hour = now.getHours();
  return hour >= schedule.startHour && hour < schedule.endHour;
}

/**
 * Utility — add minutes (date-fns doesn't export this in all versions).
 */
function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

/**
 * Calculate delay in milliseconds from now for a BullMQ delayed job.
 */
export function delayFromNow(sendAt: Date): number {
  const ms = sendAt.getTime() - Date.now();
  return Math.max(0, ms);
}
