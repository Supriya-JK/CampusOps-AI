
const $ = (id) => document.getElementById(id);

const logActivity = (text) => {
    const log = $("activity-log");
    if (!log) return;

    const item = document.createElement("p");
    item.textContent = `${new Date().toLocaleTimeString()} — ${text}`;
    log.prepend(item);
};

async function checkBackend() {
    const status = $("backendStatus");
    const label = $("connection-label");
    const dot = document.querySelector(".status-dot");

    try {
        const response = await fetch("/api/health");
        const data = await response.json();

        if (!response.ok || !data.success || data.status !== "healthy") {
            throw new Error("Health check failed");
        }

        if (status) status.textContent = "Backend connected";
        if (label) label.textContent = "FastAPI connected";
        if (dot) dot.style.backgroundColor = "#22c55e";
    } catch (error) {
        if (status) status.textContent = "Backend not connected";
        if (label) label.textContent = "Backend unavailable";
        if (dot) dot.style.backgroundColor = "#ef4444";
        console.error("Backend health check failed:", error);
    }
}

// Demo planner: creates a local checklist, not an AI-generated plan.

const planForm = $("plan-form");

if (planForm) {
    planForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const request = $("event-request").value.trim();
        const message = $("form-message");
        const list = $("task-list");
        const submitButton = planForm.querySelector(
            'button[type="submit"], input[type="submit"]'
        );

        if (!request) {
            message.textContent = "Please describe your event.";
            return;
        }

        try {
            if (submitButton) submitButton.disabled = true;

            message.textContent = "Generating your AI plan...";
            list.replaceChildren();

            const response = await fetch("/api/plan", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ request })
            });

            const data = await response.json();

            if (!response.ok || !data.success || !data.plan) {
                const detail = typeof data.detail === "string"
                    ? data.detail
                    : "Could not generate a valid plan.";

                throw new Error(detail);
            }

            const plan = data.plan;
            const tasks = plan.tasks || [];

            list.replaceChildren();

            tasks.forEach((task) => {
                const item = document.createElement("label");
                item.className = "task-item";

                const checkbox = document.createElement("input");
                checkbox.type = "checkbox";

                const text = document.createElement("span");
                
                const title = document.createElement("strong");
title.textContent = task.title;

const description = document.createElement("small");
description.textContent =
    task.inputs?.description || "No description available.";

const priority = document.createElement("span");
priority.className = `task-priority priority-${task.priority}`;
priority.textContent = `${task.priority.toUpperCase()} PRIORITY`;

const details = document.createElement("div");
details.className = "task-details";
details.append(title, description, priority);

if (task.depends_on && task.depends_on.length > 0) {
    const dependency = document.createElement("small");
    dependency.textContent =
        `Depends on: ${task.depends_on.join(", ")}`;
    dependency.className = "task-dependency";
    details.appendChild(dependency);
}

                checkbox.addEventListener("change", updateTaskCounts);

                item.append(checkbox, details);
                list.appendChild(item);
            });

            $("task-tag").textContent = `${tasks.length} TASKS`;
            $("task-count").textContent = tasks.length;
            $("completed-count").textContent = "0";
            $("attention-count").textContent = "0";
            $("workflow-status").textContent = "AI plan ready";
            $("approval-area").hidden = true;

            message.textContent =
                `AI plan generated: ${plan.goal} Review the tasks before taking action.`;

            logActivity(`Generated AI plan: ${plan.goal}`);
            updateTaskCounts();

        } catch (error) {
            message.textContent =
                `Could not generate AI plan: ${error.message}`;

            $("workflow-status").textContent = "Plan generation failed";

            logActivity("AI plan generation failed.");
            console.error("AI plan generation failed:", error);

        } finally {
            if (submitButton) submitButton.disabled = false;
        }
    });
}

function updateTaskCounts() {
    const checkboxes = document.querySelectorAll("#task-list input[type='checkbox']");
    const completed = [...checkboxes].filter((box) => box.checked).length;

    $("completed-count").textContent = completed;
    $("task-count").textContent = checkboxes.length;
    $("workflow-status").textContent =
        completed === checkboxes.length && checkboxes.length > 0
            ? "All tasks completed"
            : completed > 0
                ? "In progress"
                : checkboxes.length > 0
                    ? "AI plan ready"
                    : "Not started";
}

const resetButton = $("reset-plan");

if (resetButton) {
    resetButton.addEventListener("click", () => {
        $("task-list").replaceChildren();

        const empty = document.createElement("div");
        empty.className = "empty-state";

        const title = document.createElement("strong");
        title.textContent = "Your plan will appear here";

        const description = document.createElement("p");
       description.textContent = "Submit an event request to generate an AI plan.";
        empty.append(title, description);
        $("task-list").appendChild(empty);

        $("approval-area").hidden = true;
        $("task-tag").textContent = "0 TASKS";
        $("task-count").textContent = "0";
        $("completed-count").textContent = "0";
        $("attention-count").textContent = "0";
        $("workflow-status").textContent = "Not started";
        $("form-message").textContent = "Planner reset.";

        logActivity("Reset the demo checklist.");
    });
}

// Backend-connected venue booking requests
const bookingForm = $("venue-booking-form");
const bookingList = $("booking-list");
const venueMessage = $("venue-message");
let bookings = [];

async function loadVenues() {
    const venueSelect = $("venue-select");
    if (!venueSelect) return;

    try {
        const response = await fetch("/venues");
        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.detail?.error || "Could not load venues.");
        }

        venueSelect.replaceChildren();

        data.venues.forEach((venue) => {
            const option = document.createElement("option");
            option.value = venue.venue_id;
            option.textContent =
                `${venue.name} (${venue.capacity} capacity)`;
            venueSelect.appendChild(option);
        });

        if (data.venues.length === 0) {
            venueMessage.textContent = "No venues are available in the backend.";
        }
    } catch (error) {
        venueMessage.textContent = "Could not load venues from the backend.";
        console.error("Loading venues failed:", error);
    }
}


function renderBookings() {
    if (!bookingList) return;

    bookingList.replaceChildren();

    const count = $("booking-count");
    if (count) {
        count.textContent = `${bookings.length} REQUESTS`;
    }

    if (bookings.length === 0) {
        const empty = document.createElement("div");
        empty.className = "empty-state";

        const title = document.createElement("strong");
        title.textContent = "No booking requests yet";

        const description = document.createElement("p");
        description.textContent =
            "Your saved booking requests will appear here.";

        empty.append(title, description);
        bookingList.appendChild(empty);
        return;
    }

    bookings.forEach((booking) => {
        const card = document.createElement("article");
        card.className = "booking-item";

        const title = document.createElement("h4");
        title.textContent =
            `${booking.event_name || "Untitled event"} — ` +
            `${booking.venue_name || booking.venue_id || "Unknown venue"}`;

        const id = document.createElement("p");
        id.textContent = `Booking ID: ${booking.booking_id || "—"}`;

        const details = document.createElement("p");
        details.textContent =
            `${booking.event_date || "Date not set"} · ` +
            `${booking.start_time || "—"}–${booking.end_time || "—"}`;

        const attendance = document.createElement("p");
        attendance.textContent =
            `Expected attendees: ${booking.attendance ?? "—"}`;

        const organizer = document.createElement("p");
        organizer.textContent =
            `Requested by: ${booking.organizer || "—"}`;

        const badge = document.createElement("span");
        badge.className = "tag";

        const status = (booking.status || "unknown")
            .replaceAll("_", " ")
            .toUpperCase();

        badge.textContent = status;

        const note = document.createElement("p");

        if (booking.status === "pending_approval") {
            note.textContent =
                "Awaiting approval. This venue is not yet confirmed.";
        } else if (booking.status === "approved") {
            note.textContent = "This booking has been approved.";
        } else if (booking.status === "rejected") {
            note.textContent = "This booking has been rejected.";
        } else {
            note.textContent = "Check the status for the latest update.";
        }

        card.append(title, id, details, attendance, organizer, badge, note);
        bookingList.appendChild(card);
    });
}

    bookings.forEach((booking) => {
        const card = document.createElement("article");
        card.className = "booking-item";

        const title = document.createElement("h4");
        title.textContent =
            `${booking.venue_name || booking.venue_id} — ${booking.booking_id}`;

        const details = document.createElement("p");
        details.textContent =
            `${booking.event_date}, ${booking.start_time}–${booking.end_time} · ` +
            `${booking.attendance} attendees`;

        const purpose = document.createElement("p");
        purpose.textContent =
            `${booking.event_name} · Requested by ${booking.organizer}`;

        const badge = document.createElement("span");
        badge.className = "tag";
        badge.textContent = (booking.status || "pending_approval")
            .replaceAll("_", " ")
            .toUpperCase();

        card.append(title, details, purpose, badge);
        bookingList.appendChild(card);
    });


async function loadBookings() {
    if (!bookingList) return;

    try {
        const response = await fetch("/bookings");
        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error("Could not load booking requests.");
        }

        bookings = (data.bookings || []).map((booking) => ({
            ...booking,
            venue_name: booking.venue_name || booking.venue_id
        }));

        renderBookings();
    } catch (error) {
        console.error("Loading bookings failed:", error);
        if (venueMessage) {
            venueMessage.textContent =
                "Could not load booking requests from the backend.";
        }
    }
}

if (bookingForm) {
    bookingForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const submitButton = bookingForm.querySelector(
            'button[type="submit"], input[type="submit"]'
        );

        const payload = {
            venue_id: $("venue-select").value,
            event_name: $("venue-purpose").value.trim(),
            description: "",
            event_date: $("venue-date").value,
            start_time: $("venue-start").value,
            end_time: $("venue-end").value,
            attendance: Number($("venue-attendees").value),
            organizer: $("venue-requester").value.trim()
        };

        if (!payload.venue_id || !payload.event_date ||
            !payload.event_name || !payload.organizer) {
            venueMessage.textContent = "Please complete all required fields.";
            return;
        }

        if (payload.start_time >= payload.end_time) {
            venueMessage.textContent = "End time must be after start time.";
            return;
        }

        try {
            if (submitButton) submitButton.disabled = true;
            venueMessage.textContent = "Checking venue availability...";

            const query = new URLSearchParams({
                venue_id: payload.venue_id,
                event_date: payload.event_date,
                start_time: payload.start_time,
                end_time: payload.end_time,
                attendance: String(payload.attendance)
            });

            const availabilityResponse = await fetch(
                `/venues/availability?${query.toString()}`
            );
            const availability = await availabilityResponse.json();

            if (!availabilityResponse.ok) {
                throw new Error(
                    availability.detail?.error ||
                    "Could not check venue availability."
                );
            }

            
if (!availability.available) {
    const reason = availability.reason ||
        "This venue is not available for the selected time.";

    const conflicts = availability.conflicts || [];

    const conflictDetails = conflicts.map((conflict) => {
        const name = conflict.event_name || "Existing booking";
        const time = conflict.start_time && conflict.end_time
            ? `${conflict.start_time}–${conflict.end_time}`
            : "time unavailable";
        const status = conflict.status
            ? conflict.status.replaceAll("_", " ")
            : "status unknown";

        return `${name} (${time}, ${status})`;
    });

    venueMessage.textContent = conflictDetails.length
        ? `${reason} Conflicting request(s): ${conflictDetails.join("; ")}.`
        : reason;

    logActivity("Venue availability check found a conflict.");
    return;
}


            venueMessage.textContent = "Submitting booking request...";

            const response = await fetch("/bookings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(
                    result.detail?.error ||
                    result.detail ||
                    "Booking request failed."
                );
            }
venueMessage.textContent =
    `Request submitted! ID: ${result.booking_id}. ` +
    "Status: pending approval; the venue is not confirmed.";

            bookingForm.reset();
            await loadBookings();
logActivity(
    `Submitted backend booking request ${result.booking_id}.`
);
        } catch (error) {
            venueMessage.textContent = error.message ||
                "Something went wrong submitting the booking.";
            console.error("Booking submission failed:", error);
        } finally {
            if (submitButton) submitButton.disabled = false;
        }
    });
}

loadVenues();
loadBookings();
const clearLog = $("clear-log");

if (clearLog) {
    clearLog.addEventListener("click", () => {
        $("activity-log").replaceChildren();
    });
}

checkBackend();