export default function toRelative(date: Date): string {
  const secondsDiff = Math.round((date.getTime() - Date.now()) / 1000);

  const unitsInSec = [
    60,
    3600,
    86400,
    86400 * 7,
    86400 * 30,
    86400 * 365,
    Number.POSITIVE_INFINITY,
  ];

  const unitStrings = [
    "second",
    "minute",
    "hour",
    "day",
    "week",
    "month",
    "year",
  ];

  const unitIndex = unitsInSec.findIndex(
    (cutoff) => cutoff > Math.abs(secondsDiff),
  );

  const divisor = unitIndex ? unitsInSec[unitIndex - 1] : 1;

  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  const relativeTime = rtf.format(
    Math.floor(secondsDiff / divisor),
    unitStrings[unitIndex] as Intl.RelativeTimeFormatUnit,
  );

  return relativeTime;
}
