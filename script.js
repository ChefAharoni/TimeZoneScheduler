// script.js
(() => {
  const { DateTime } = luxon;
  const baseTzSelect = document.getElementById("base-tz");
  const targetTzSelect = document.getElementById("target-tz");
  const timezoneSearch = document.getElementById("timezone-search");
  const dateInput = document.getElementById("date");
  const timeInput = document.getElementById("time");
  const eventNameInput = document.getElementById("event-name");
  const eventLocationInput = document.getElementById("event-location");
  const eventDetailsInput = document.getElementById("event-details");
  const eventDurationSelect = document.getElementById("event-duration");
  const customDurationGroup = document.getElementById("custom-duration-group");
  const customDurationInput = document.getElementById("custom-duration");
  const inviteesContainer = document.getElementById("invitees-container");
  const addInviteeButton = document.getElementById("add-invitee");
  const generateButton = document.getElementById("generate");

  // Set default date to today
  dateInput.valueAsDate = new Date();

  // Common city timezones to ensure they're included
  const commonCityTimezones = [
    "Asia/Tel_Aviv",
    "Asia/Jerusalem",
    "America/New_York",
    "America/Los_Angeles",
    "America/Chicago",
    "Europe/London",
    "Europe/Paris",
    "Europe/Berlin",
    "Asia/Tokyo",
    "Asia/Shanghai",
    "Asia/Singapore",
    "Australia/Sydney",
    "Pacific/Auckland",
    "Asia/Dubai",
    "Asia/Kolkata",
    "Europe/Moscow",
    "America/Sao_Paulo",
    "Africa/Johannesburg",
    "Asia/Bangkok",
    "Asia/Seoul",
  ];

  // Get GMT offset for a timezone
  function getGMTOffset(timezone) {
    try {
      const now = DateTime.now().setZone(timezone);
      const offset = now.toFormat("ZZZZ");
      return offset;
    } catch (e) {
      return "Unknown";
    }
  }

  // Format timezone option text with GMT offset
  function formatTimezoneOption(timezone) {
    const offset = getGMTOffset(timezone);
    return `${timezone} (${offset})`;
  }

  // Detect user's timezone with fallbacks
  function detectUserTimezone() {
    // Try browser's timezone detection
    try {
      const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (browserTz) return browserTz;
    } catch (e) {
      console.warn("Browser timezone detection failed:", e);
    }

    // Fallback to system time
    try {
      const date = new Date();
      const offset = -date.getTimezoneOffset();
      const hours = Math.floor(Math.abs(offset) / 60);
      const minutes = Math.abs(offset) % 60;
      const sign = offset >= 0 ? "+" : "-";
      const gmtOffset = `GMT${sign}${hours
        .toString()
        .padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;

      // Try to find a matching timezone from our list
      const matchingTz = commonCityTimezones.find((tz) => {
        try {
          return DateTime.now().setZone(tz).toFormat("ZZZZ") === gmtOffset;
        } catch (e) {
          return false;
        }
      });

      if (matchingTz) return matchingTz;
    } catch (e) {
      console.warn("System time fallback failed:", e);
    }

    // Final fallback to New York
    return "America/New_York";
  }

  // Populate time zones
  function populateTimeZones() {
    // Get all available timezones
    let timeZones = [];
    try {
      timeZones = Intl.supportedValuesOf("timeZone");
    } catch (e) {
      console.warn("Failed to get supported timezones:", e);
      timeZones = commonCityTimezones;
    }

    // Ensure common cities are included
    timeZones = [...new Set([...commonCityTimezones, ...timeZones])];
    timeZones.sort();

    // Set user's timezone
    const userTimezone = detectUserTimezone();

    // Populate both selects
    timeZones.forEach((tz) => {
      const baseOption = document.createElement("option");
      const targetOption = document.createElement("option");

      baseOption.value = targetOption.value = tz;
      baseOption.textContent = targetOption.textContent =
        formatTimezoneOption(tz);

      baseTzSelect.appendChild(baseOption);
      targetTzSelect.appendChild(targetOption);
    });

    // Set detected timezone
    baseTzSelect.value = userTimezone;
    targetTzSelect.value = "UTC";
  }

  // Handle timezone search
  function filterTimezones(searchTerm) {
    const options = targetTzSelect.options;
    searchTerm = searchTerm.toLowerCase();

    for (let i = 0; i < options.length; i++) {
      const option = options[i];
      const text = option.textContent.toLowerCase();
      option.style.display = text.includes(searchTerm) ? "" : "none";
    }
  }

  timezoneSearch.addEventListener("input", (e) => {
    filterTimezones(e.target.value);
  });

  // Handle event duration selection
  eventDurationSelect.addEventListener("change", () => {
    customDurationGroup.style.display =
      eventDurationSelect.value === "custom" ? "block" : "none";
  });

  // Handle invitees
  function addInviteeRow() {
    const row = document.createElement("div");
    row.className = "invitee-row";

    const emailInput = document.createElement("input");
    emailInput.type = "email";
    emailInput.className = "invitee-email";
    emailInput.placeholder = "email@example.com";

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "remove-invitee";
    removeButton.textContent = "×";
    removeButton.style.display = "block";

    removeButton.addEventListener("click", () => {
      row.remove();
      updateRemoveButtons();
    });

    row.appendChild(emailInput);
    row.appendChild(removeButton);
    inviteesContainer.appendChild(row);

    updateRemoveButtons();
  }

  function updateRemoveButtons() {
    const rows = inviteesContainer.querySelectorAll(".invitee-row");
    rows.forEach((row) => {
      const removeButton = row.querySelector(".remove-invitee");
      removeButton.style.display = rows.length > 1 ? "block" : "none";
    });
  }

  addInviteeButton.addEventListener("click", addInviteeRow);

  // Generate ICS file
  function generateICS() {
    const eventName = eventNameInput.value;
    const eventLocation = eventLocationInput.value;
    const eventDetails = eventDetailsInput.value;
    const baseTz = baseTzSelect.value;
    const targetTz = targetTzSelect.value;
    const date = dateInput.value;
    const time = timeInput.value;

    // Calculate duration in minutes
    let durationMinutes = parseInt(eventDurationSelect.value);
    if (eventDurationSelect.value === "custom") {
      durationMinutes = parseInt(customDurationInput.value);
    }

    // Create start and end times
    const startTime = DateTime.fromFormat(
      `${date} ${time}`,
      "yyyy-MM-dd HH:mm",
      { zone: baseTz }
    );

    const endTime = startTime.plus({ minutes: durationMinutes });

    // Convert to target timezone
    const targetStartTime = startTime.setZone(targetTz);
    const targetEndTime = endTime.setZone(targetTz);

    // Get all invitee emails
    const invitees = Array.from(document.querySelectorAll(".invitee-email"))
      .map((input) => input.value)
      .filter((email) => email.trim() !== "");

    // Create ICS content
    const icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//TimeSync//EN",
      "CALSCALE:GREGORIAN",
      "BEGIN:VEVENT",
      `DTSTART:${targetStartTime.toFormat("yyyyMMdd'T'HHmmss")}`,
      `DTEND:${targetEndTime.toFormat("yyyyMMdd'T'HHmmss")}`,
      `SUMMARY:${eventName}`,
      `LOCATION:${eventLocation}`,
      `DESCRIPTION:${eventDetails}`,
      ...invitees.map(
        (email) => `ATTENDEE;RSVP=TRUE;ROLE=REQ-PARTICIPANT:mailto:${email}`
      ),
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    // Create and download file
    const blob = new Blob([icsContent], {
      type: "text/calendar;charset=utf-8",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${eventName
      .replace(/[^a-z0-9]/gi, "_")
      .toLowerCase()}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Initialize
  populateTimeZones();
  generateButton.addEventListener("click", generateICS);
})();
