// script.js
(() => {
  const { DateTime } = luxon;
  const baseTzSelect = document.getElementById("base-tz");
  const targetTzSelect = document.getElementById("target-tz");
  const timezoneSearch = document.getElementById("timezone-search");
  const tzSelectedFeedback = document.getElementById("target-tz-selected");
  const dateInput = document.getElementById("date");
  const timeInput = document.getElementById("time");
  const endDateInput = document.getElementById("end-date");
  const endTimeInput = document.getElementById("end-time");
  const eventNameInput = document.getElementById("event-name");
  const eventLocationInput = document.getElementById("event-location");
  const eventDetailsInput = document.getElementById("event-details");
  const eventDurationSelect = document.getElementById("event-duration");
  const customDurationGroup = document.getElementById("custom-duration-group");
  const customDurationInput = document.getElementById("custom-duration");
  const inviteesContainer = document.getElementById("invitees-container");
  const addInviteeButton = document.getElementById("add-invitee");
  const generateButton = document.getElementById("generate");
  const allDayCheckbox = document.getElementById("all-day-event");
  const timedEventFields = document.getElementById("timed-event-fields");
  const durationFields = document.getElementById("duration-fields");
  const endtimeFields = document.getElementById("endtime-fields");
  const endTypeRadios = document.getElementsByName("end-type");
  const baseTzSearch = document.getElementById("base-tz-search");
  const tzTableContainer = document.getElementById("tz-table-container");
  const tzTable = document.getElementById("tz-table");
  const tzTableBody = tzTable ? tzTable.querySelector("tbody") : null;
  const originTzHeader = document.getElementById("origin-tz-header");
  const targetTzHeader = document.getElementById("target-tz-header");

  // Set default date to today
  dateInput.valueAsDate = new Date();
  if (endDateInput) endDateInput.valueAsDate = new Date();

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

  // Format timezone option text with GMT offset and pretty city name
  function formatTimezoneOption(timezone) {
    const offset = getGMTOffset(timezone);
    // Replace underscores with spaces for display
    const prettyTz = timezone.replace(/_/g, " ");
    return `${prettyTz} (${offset})`;
  }

  // Detect user's timezone with fallbacks
  function detectUserTimezone() {
    try {
      const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (browserTz) return browserTz;
    } catch (e) {
      console.warn("Browser timezone detection failed:", e);
    }
    try {
      const date = new Date();
      const offset = -date.getTimezoneOffset();
      const hours = Math.floor(Math.abs(offset) / 60);
      const minutes = Math.abs(offset) % 60;
      const sign = offset >= 0 ? "+" : "-";
      const gmtOffset = `GMT${sign}${hours
        .toString()
        .padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
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
    return "America/New_York";
  }

  // Populate time zones
  function populateTimeZones() {
    let timeZones = [];
    try {
      timeZones = Intl.supportedValuesOf("timeZone");
    } catch (e) {
      console.warn("Failed to get supported timezones:", e);
      timeZones = commonCityTimezones;
    }
    timeZones = [...new Set([...commonCityTimezones, ...timeZones])];
    timeZones.sort();
    const userTimezone = detectUserTimezone();
    // Populate both selects
    timeZones.forEach((tz) => {
      const baseOption = document.createElement("option");
      const targetOption = document.createElement("option");
      baseOption.value = targetOption.value = tz;
      baseOption.textContent = targetOption.textContent =
        formatTimezoneOption(tz);
      // Store searchable text for each option (with and without underscores)
      baseOption.setAttribute(
        "data-search",
        `${tz.toLowerCase()} ${tz.replace(/_/g, " ").toLowerCase()}`
      );
      targetOption.setAttribute(
        "data-search",
        `${tz.toLowerCase()} ${tz.replace(/_/g, " ").toLowerCase()}`
      );
      baseTzSelect.appendChild(baseOption);
      targetTzSelect.appendChild(targetOption);
    });
    baseTzSelect.value = userTimezone;
    targetTzSelect.value = "UTC";
    updateTzSelectedFeedback();
    generateTzTable();
  }

  // --- Target Time Zone Selection Feedback ---
  function updateTzSelectedFeedback() {
    const selected = targetTzSelect.options[targetTzSelect.selectedIndex];
    if (selected) {
      tzSelectedFeedback.textContent = `Selected: ${selected.textContent}`;
    } else {
      tzSelectedFeedback.textContent = "";
    }
  }

  // When user clicks or changes selection in the target time zone
  targetTzSelect.addEventListener("change", updateTzSelectedFeedback);
  targetTzSelect.addEventListener("click", function (e) {
    updateTzSelectedFeedback();
    targetTzSelect.blur(); // visually closes the select on click
  });
  // Also allow keyboard selection
  targetTzSelect.addEventListener("keyup", updateTzSelectedFeedback);

  // When user types in the search, filter and auto-select first visible
  timezoneSearch.addEventListener("input", (e) => {
    filterTimezones(e.target.value);
    // Auto-select first visible option
    const firstVisible = Array.from(targetTzSelect.options).find(
      (opt) => opt.style.display !== "none"
    );
    if (firstVisible) {
      targetTzSelect.value = firstVisible.value;
      updateTzSelectedFeedback();
    }
  });

  function filterTimezones(searchTerm) {
    const options = targetTzSelect.options;
    searchTerm = searchTerm.toLowerCase().replace(/ /g, "_");
    for (let i = 0; i < options.length; i++) {
      const option = options[i];
      // Search both the original and pretty version
      const searchAttr = option.getAttribute("data-search");
      const prettyText = option.textContent.toLowerCase();
      // Allow search by either underscores or spaces
      const searchMatch =
        searchAttr.includes(searchTerm.replace(/_/g, " ")) ||
        searchAttr.includes(searchTerm) ||
        prettyText.includes(searchTerm.replace(/_/g, " ")) ||
        prettyText.includes(searchTerm);
      option.style.display = searchMatch ? "" : "none";
    }
  }

  // --- All Day Event Logic ---
  allDayCheckbox.addEventListener("change", function () {
    if (allDayCheckbox.checked) {
      timedEventFields.setAttribute("hidden", "");
    } else {
      timedEventFields.removeAttribute("hidden");
    }
  });

  // --- Duration vs End Time Toggle ---
  function updateEndTypeFields() {
    const endType = Array.from(endTypeRadios).find((r) => r.checked).value;
    if (endType === "duration") {
      durationFields.removeAttribute("hidden");
      endtimeFields.setAttribute("hidden", "");
    } else {
      durationFields.setAttribute("hidden", "");
      endtimeFields.removeAttribute("hidden");
      // Always set end date to start date if not set
      if (
        dateInput.value &&
        (!endDateInput.value || endDateInput.value < dateInput.value)
      ) {
        endDateInput.value = dateInput.value;
      }
    }
  }
  endTypeRadios.forEach((radio) =>
    radio.addEventListener("change", updateEndTypeFields)
  );
  // Ensure correct fields are shown on page load
  updateEndTypeFields();

  // --- End Date Auto-Update Logic ---
  function updateEndDateIfNeeded() {
    if (!dateInput.value || !timeInput.value) return;
    if (!endTimeInput.value) return;
    const start = DateTime.fromFormat(
      `${dateInput.value} ${timeInput.value}`,
      "yyyy-MM-dd HH:mm"
    );
    const end = DateTime.fromFormat(
      `${endDateInput.value} ${endTimeInput.value}`,
      "yyyy-MM-dd HH:mm"
    );
    if (end < start) {
      // If end is before start, set end date to next day
      const nextDay = start.plus({ days: 1 }).toFormat("yyyy-MM-dd");
      endDateInput.value = nextDay;
    }
  }
  if (endTimeInput && endDateInput) {
    timeInput.addEventListener("change", updateEndDateIfNeeded);
    dateInput.addEventListener("change", function () {
      endDateInput.value = dateInput.value;
      updateEndDateIfNeeded();
    });
    endTimeInput.addEventListener("change", updateEndDateIfNeeded);
  }

  eventDurationSelect.addEventListener("change", () => {
    customDurationGroup.style.display =
      eventDurationSelect.value === "custom" ? "block" : "none";
  });

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

  function generateICS() {
    // All Day Event
    if (allDayCheckbox.checked) {
      const eventName = eventNameInput.value;
      const eventLocation = eventLocationInput.value;
      const eventDetails = eventDetailsInput.value;
      const baseTz = baseTzSelect.value;
      const targetTz = targetTzSelect.value;
      const date = dateInput.value;
      const invitees = Array.from(document.querySelectorAll(".invitee-email"))
        .map((input) => input.value)
        .filter((email) => email.trim() !== "");
      // All day event: DTSTART/DTEND as DATE only
      const icsContent = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//TimeSync//EN",
        "CALSCALE:GREGORIAN",
        "BEGIN:VEVENT",
        `DTSTART;VALUE=DATE:${date.replace(/-/g, "")}`,
        `DTEND;VALUE=DATE:${date.replace(/-/g, "")}`,
        `SUMMARY:${eventName}`,
        `LOCATION:${eventLocation}`,
        `DESCRIPTION:${eventDetails}`,
        ...invitees.map(
          (email) => `ATTENDEE;RSVP=TRUE;ROLE=REQ-PARTICIPANT:mailto:${email}`
        ),
        "END:VEVENT",
        "END:VCALENDAR",
      ].join("\r\n");
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
      return;
    }
    // Timed Event
    const eventName = eventNameInput.value;
    const eventLocation = eventLocationInput.value;
    const eventDetails = eventDetailsInput.value;
    const baseTz = baseTzSelect.value;
    const targetTz = targetTzSelect.value;
    const date = dateInput.value;
    const time = timeInput.value;
    let startTime = DateTime.fromFormat(`${date} ${time}`, "yyyy-MM-dd HH:mm", {
      zone: baseTz,
    });
    let endTime;
    let endDate;
    // Duration or End Time
    const endType = Array.from(endTypeRadios).find((r) => r.checked).value;
    if (endType === "duration") {
      let durationMinutes = parseInt(eventDurationSelect.value);
      if (eventDurationSelect.value === "custom") {
        durationMinutes = parseInt(customDurationInput.value);
      }
      endTime = startTime.plus({ minutes: durationMinutes });
      endDate = endTime.toFormat("yyyy-MM-dd");
    } else {
      // End time and end date
      const endDateVal = endDateInput.value || date;
      const endTimeVal = endTimeInput.value || time;
      endTime = DateTime.fromFormat(
        `${endDateVal} ${endTimeVal}`,
        "yyyy-MM-dd HH:mm",
        { zone: baseTz }
      );
      endDate = endDateVal;
      // If end is before start, auto-increment end date
      if (endTime < startTime) {
        endTime = startTime.plus({ days: 1 });
        endDate = endTime.toFormat("yyyy-MM-dd");
      }
    }
    // Convert to target timezone
    const targetStartTime = startTime.setZone(targetTz);
    const targetEndTime = endTime.setZone(targetTz);
    const invitees = Array.from(document.querySelectorAll(".invitee-email"))
      .map((input) => input.value)
      .filter((email) => email.trim() !== "");
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

  populateTimeZones();
  generateButton.addEventListener("click", generateICS);
  updateEndTypeFields();

  // --- Base Time Zone Search ---
  function filterBaseTimezones(searchTerm) {
    const options = baseTzSelect.options;
    searchTerm = searchTerm.toLowerCase().replace(/ /g, "_");
    for (let i = 0; i < options.length; i++) {
      const option = options[i];
      const searchAttr = option.getAttribute("data-search");
      const prettyText = option.textContent.toLowerCase();
      const searchMatch =
        searchAttr.includes(searchTerm.replace(/_/g, " ")) ||
        searchAttr.includes(searchTerm) ||
        prettyText.includes(searchTerm.replace(/_/g, " ")) ||
        prettyText.includes(searchTerm);
      option.style.display = searchMatch ? "" : "none";
    }
  }
  baseTzSearch.addEventListener("input", (e) => {
    filterBaseTimezones(e.target.value);
    // Auto-select first visible option
    const firstVisible = Array.from(baseTzSelect.options).find(
      (opt) => opt.style.display !== "none"
    );
    if (firstVisible) {
      baseTzSelect.value = firstVisible.value;
    }
  });
  // Close search bar on selection
  baseTzSelect.addEventListener("change", function () {
    baseTzSearch.value = "";
    baseTzSearch.blur();
  });
  baseTzSelect.addEventListener("click", function () {
    baseTzSearch.value = "";
    baseTzSearch.blur();
  });
  baseTzSelect.addEventListener("keyup", function (e) {
    if (e.key === "Enter" || e.key === "Tab") {
      baseTzSearch.value = "";
      baseTzSearch.blur();
    }
  });

  // Helper to collapse/expand target select
  function showTargetSelect(expand) {
    if (expand) {
      targetTzSelect.size = 5;
      targetTzSelect.style.display = "";
    } else {
      targetTzSelect.size = 1;
      targetTzSelect.style.display = "";
    }
  }

  // Expand list when searching
  timezoneSearch.addEventListener("focus", () => showTargetSelect(true));
  timezoneSearch.addEventListener("input", () => showTargetSelect(true));
  // Collapse list when a timezone is chosen
  function collapseTargetList() {
    showTargetSelect(false);
    timezoneSearch.value = "";
    timezoneSearch.blur();
  }
  targetTzSelect.addEventListener("change", () => {
    collapseTargetList();
    updateTzSelectedFeedback();
    generateTzTable();
  });
  targetTzSelect.addEventListener("click", () => {
    collapseTargetList();
    updateTzSelectedFeedback();
  });

  // --- Time Zone Comparison Table ---
  function generateTzTable() {
    if (!tzTableBody) return;
    tzTableBody.innerHTML = "";
    const originTz = baseTzSelect.value;
    const targetTz = targetTzSelect.value;
    let date = dateInput.value;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      date = DateTime.now().toFormat("yyyy-MM-dd");
    }
    // Update headers
    originTzHeader.textContent = formatTimezoneOption(originTz);
    targetTzHeader.textContent = formatTimezoneOption(targetTz);

    // Starting point: midnight in origin tz
    let startOfDay = DateTime.fromFormat(`${date} 00:00`, "yyyy-MM-dd HH:mm", {
      zone: originTz,
    });
    if (!startOfDay.isValid) {
      startOfDay = DateTime.now().setZone(originTz).startOf("day");
    }

    // Determine selected row index for highlighting
    let selectedRowIndex = -1;
    if (timeInput.value) {
      const selectedTime = DateTime.fromFormat(
        `${date} ${timeInput.value}`,
        "yyyy-MM-dd HH:mm",
        { zone: originTz }
      );
      if (selectedTime.isValid) {
        const diffMinutes = selectedTime.diff(startOfDay, "minutes").minutes;
        selectedRowIndex = Math.round(diffMinutes / 15);
      }
    }

    const rowsFragment = document.createDocumentFragment();
    for (let i = 0; i < 96; i++) {
      // 96 * 15-minute slots
      const originTime = startOfDay.plus({ minutes: 15 * i });
      const targetTime = originTime.setZone(targetTz);
      const tr = document.createElement("tr");
      tr.dataset.index = i;
      const inSelectedRange = selectedRowIndex !== -1 && i === selectedRowIndex;
      if (inSelectedRange) tr.classList.add("selected");
      const tdOrigin = document.createElement("td");
      tdOrigin.textContent = originTime.toFormat("HH:mm");
      const tdTarget = document.createElement("td");
      tdTarget.textContent = targetTime.toFormat("HH:mm");
      tr.appendChild(tdOrigin);
      tr.appendChild(tdTarget);
      const clickHandler = () => {
        // Treat as single-slot selection
        selectedStartIndex = i;
        selectedEndIndex = i;
        // Update form fields
        timeInput.value = originTime.toFormat("HH:mm");
        dateInput.value = originTime.toFormat("yyyy-MM-dd");
        // Switch to Duration 15 minutes default or endtime next slot
        const nextTime = originTime.plus({ minutes: 15 });
        endTimeInput.value = nextTime.toFormat("HH:mm");
        endDateInput.value = nextTime.toFormat("yyyy-MM-dd");
        document.querySelector(
          'input[name="end-type"][value="endtime"]'
        ).checked = true;
        updateEndTypeFields();
        generateTzTable();
      };
      tr.addEventListener("click", clickHandler);
      rowsFragment.appendChild(tr);
    }
    tzTableBody.appendChild(rowsFragment);
  }

  // Regenerate table on relevant changes
  [baseTzSelect, targetTzSelect, dateInput].forEach((el) => {
    if (el) el.addEventListener("change", generateTzTable);
  });
  if (timeInput) timeInput.addEventListener("change", generateTzTable);

  // Also regenerate on search selection
  baseTzSelect.addEventListener("change", generateTzTable);
  targetTzSelect.addEventListener("change", generateTzTable);
  dateInput.addEventListener("change", generateTzTable);

  // Variables for drag selection
  let dragStartIndex = null;
  let dragCurrentIndex = null;
  let isDragging = false;
  let selectedStartIndex = null;
  let selectedEndIndex = null;

  function updateRangeHighlight() {
    Array.from(tzTableBody.children).forEach((row) => {
      const idx = parseInt(row.dataset.index, 10);
      const inDragRange =
        isDragging &&
        dragStartIndex !== null &&
        dragCurrentIndex !== null &&
        idx >= Math.min(dragStartIndex, dragCurrentIndex) &&
        idx <= Math.max(dragStartIndex, dragCurrentIndex);
      const inSelectedRange =
        selectedStartIndex !== null &&
        selectedEndIndex !== null &&
        idx >= selectedStartIndex &&
        idx <= selectedEndIndex;
      row.classList.toggle("range-selected", inDragRange || inSelectedRange);
    });
  }

  function finalizeSelection() {
    if (dragStartIndex === null || dragCurrentIndex === null) return;
    selectedStartIndex = Math.min(dragStartIndex, dragCurrentIndex);
    selectedEndIndex = Math.max(dragStartIndex, dragCurrentIndex);

    const originTz = baseTzSelect.value;
    let date = dateInput.value;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      date = DateTime.now().toFormat("yyyy-MM-dd");
    }
    let startOfDay = DateTime.fromFormat(`${date} 00:00`, "yyyy-MM-dd HH:mm", {
      zone: originTz,
    });
    if (!startOfDay.isValid)
      startOfDay = DateTime.now().setZone(originTz).startOf("day");

    const startTime = startOfDay.plus({ minutes: 15 * selectedStartIndex });
    const endTime = startOfDay.plus({ minutes: 15 * (selectedEndIndex + 1) });

    // Update form fields
    timeInput.value = startTime.toFormat("HH:mm");
    dateInput.value = startTime.toFormat("yyyy-MM-dd");
    endTimeInput.value = endTime.toFormat("HH:mm");
    endDateInput.value = endTime.toFormat("yyyy-MM-dd");

    // Switch to End Time mode
    document.querySelector(
      'input[name="end-type"][value="endtime"]'
    ).checked = true;
    updateEndTypeFields();

    generateTzTable(); // refresh highlights
  }

  // Event delegation for drag selection
  tzTableBody.addEventListener("mousedown", (e) => {
    const tr = e.target.closest("tr");
    if (!tr) return;
    isDragging = true;
    dragStartIndex = parseInt(tr.dataset.index, 10);
    dragCurrentIndex = dragStartIndex;
    updateRangeHighlight();
  });

  tzTableBody.addEventListener("mouseover", (e) => {
    if (!isDragging) return;
    const tr = e.target.closest("tr");
    if (!tr) return;
    dragCurrentIndex = parseInt(tr.dataset.index, 10);
    updateRangeHighlight();
  });

  document.addEventListener("mouseup", () => {
    if (!isDragging) return;
    isDragging = false;
    finalizeSelection();
    dragStartIndex = dragCurrentIndex = null;
  });
})();
