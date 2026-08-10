export function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function formatDate(date: string, options?: Intl.DateTimeFormatOptions) {
  const formatterOptions: Intl.DateTimeFormatOptions =
    options && Object.keys(options).length > 0
      ? options
      : { dateStyle: "medium" };

  return new Intl.DateTimeFormat("es-CL", formatterOptions).format(new Date(date));
}

export function formatTime(date: string) {
  return new Intl.DateTimeFormat("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function formatTimeRange(start: string, durationMinutes: number) {
  const startDate = new Date(start);
  const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);
  return `${formatTime(startDate.toISOString())} - ${formatTime(endDate.toISOString())}`;
}

export function getWeekStart(baseDate: Date) {
  const date = new Date(baseDate);
  const day = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - day);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function addDays(baseDate: Date, days: number) {
  const date = new Date(baseDate);
  date.setDate(date.getDate() + days);
  return date;
}

export function getMonthStart(baseDate: Date) {
  const date = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function getMonthEnd(baseDate: Date) {
  const date = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0);
  date.setHours(23, 59, 59, 999);
  return date;
}

export function toIsoDateTime(date: Date, hours: number, minutes: number) {
  const next = new Date(date);
  next.setHours(hours, minutes, 0, 0);
  return next.toISOString();
}
