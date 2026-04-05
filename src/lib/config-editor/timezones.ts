/** Common IANA timezones grouped by region, for use in timezone selectors. */
export const TIMEZONE_GROUPS = [
  {
    label: "Americas",
    timezones: [
      "America/New_York",
      "America/Chicago",
      "America/Denver",
      "America/Los_Angeles",
      "America/Anchorage",
      "America/Toronto",
      "America/Vancouver",
      "America/Mexico_City",
      "America/Sao_Paulo",
      "America/Argentina/Buenos_Aires",
      "Pacific/Honolulu",
    ],
  },
  {
    label: "Europe",
    timezones: [
      "Europe/London",
      "Europe/Paris",
      "Europe/Berlin",
      "Europe/Amsterdam",
      "Europe/Rome",
      "Europe/Madrid",
      "Europe/Stockholm",
      "Europe/Helsinki",
      "Europe/Warsaw",
      "Europe/Lisbon",
      "Europe/Athens",
      "Europe/Istanbul",
      "Europe/Moscow",
    ],
  },
  {
    label: "Asia & Pacific",
    timezones: [
      "Asia/Dubai",
      "Asia/Kolkata",
      "Asia/Bangkok",
      "Asia/Singapore",
      "Asia/Hong_Kong",
      "Asia/Shanghai",
      "Asia/Seoul",
      "Asia/Tokyo",
      "Australia/Sydney",
      "Australia/Melbourne",
      "Pacific/Auckland",
    ],
  },
  {
    label: "Africa",
    timezones: ["Africa/Cairo", "Africa/Lagos", "Africa/Johannesburg", "Africa/Nairobi"],
  },
] as const;

/** Flat list of all timezones. */
export const ALL_TIMEZONES = TIMEZONE_GROUPS.flatMap((g) => g.timezones);
