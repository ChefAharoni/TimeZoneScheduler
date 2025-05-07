// script.js
(() => {
  const { DateTime } = luxon;
  const baseTzEl = document.getElementById("base-tz");
  const targetTzEl = document.getElementById("target-tz");
  const dateEl = document.getElementById("date");
  const timeEl = document.getElementById("time");
  const emailEl = document.getElementById("email");
  const btn = document.getElementById("generate");

  // 1. Populate time-zone selectors (fallback to a short list if needed)
  let zones = [];
  if (Intl.supportedValuesOf) {
    zones = Intl.supportedValuesOf("timeZone");
  } else {
    zones = [
      "UTC",
      "America/New_York",
      "Europe/London",
      "Asia/Tokyo",
      "Australia/Sydney",
    ];
  }
  for (const sel of [baseTzEl, targetTzEl]) {
    zones.forEach((z) => {
      const opt = document.createElement("option");
      opt.value = z;
      opt.textContent = z;
      sel.appendChild(opt);
    });
  }

  // 2. Set sensible defaults
  const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  baseTzEl.value = zones.includes(localTz) ? localTz : "UTC";
  targetTzEl.value = "UTC";
  dateEl.value = DateTime.local().toISODate();
  timeEl.value = DateTime.local().toFormat("HH:mm");

  // 3. On click, generate and download ICS
  btn.addEventListener("click", () => {
    const baseTz = baseTzEl.value;
    const targetTz = targetTzEl.value;
    const date = dateEl.value;
    const time = timeEl.value;
    const email = emailEl.value.trim();

    if (!date || !time) {
      alert("Please select both date and time.");
      return;
    }

    // Create DateTime in base zone, convert to target zone
    const baseDt = DateTime.fromISO(`${date}T${time}`, { zone: baseTz });
    const tgtDt = baseDt.setZone(targetTz);
    const startStr = tgtDt.toFormat("yyyyLLdd'T'HHmmss");
    const endStr = tgtDt.plus({ hours: 1 }).toFormat("yyyyLLdd'T'HHmmss");
    const stamp = DateTime.utc().toFormat("yyyyLLdd'T'HHmmss'Z'");
    const uid = `${Date.now()}@timesync`;

    // Build ICS content
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//TimeSync//EN",
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${stamp}`,
      `DTSTART;TZID=${targetTz}:${startStr}`,
      `DTEND;TZID=${targetTz}:${endStr}`,
      "SUMMARY:Scheduled Meeting",
      "DESCRIPTION:Scheduled via TimeSync",
    ];
    if (email) {
      lines.push(`ORGANIZER:mailto:${email}`);
    }
    lines.push("END:VEVENT", "END:VCALENDAR");

    // Trigger download
    const blob = new Blob([lines.join("\r\n")], { type: "text/calendar" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "event.ics";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });
})();
