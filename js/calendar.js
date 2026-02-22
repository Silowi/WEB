import { addClickListener } from "./utils.js";

const MONTH_MAP = {
    Jan: 0,
    Feb: 1,
    Mar: 2,
    Apr: 3,
    May: 4,
    Jun: 5,
    Jul: 6,
    Aug: 7,
    Sep: 8,
    Oct: 9,
    Nov: 10,
    Dec: 11
};

const INITIAL_VISIBLE_MATCHES = 3;
const LOAD_MORE_STEP = 3;
const visibleMatchesPerTeam = new Map();

const DUMMY_VERBONDSBLADEN = [
    { title: "Verbondsblad Nr. 1599", date: "17 februari 2026", url: "https://www.perkez.be/website/wp-content/uploads/Nr-1599.pdf" }
];

const MAX_VERBONDSBLADEN = 1;

const SELECTORS = {
    container: "#results-container",
    loading: "#results-loading",
    error: "#results-error",
    retry: "#results-retry"
};
const PROXY_ENDPOINTS = [
    "/.netlify/functions/perkez-proxy",
    "/api/perkez-proxy.php",
    "../api/perkez-proxy.php"
];

const PERKEZ_URL = "https://www.perkez.be/verbondsbladen/";
const UNKNOWN_DATE_TEXT = "Datum onbekend";

function getTodayContext() {
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    const noonToday = new Date(today);
    noonToday.setHours(12, 0, 0, 0);

    return {
        now,
        today,
        isAfterNoon: now >= noonToday
    };
}

/**
 * Maakt een result card element veilig aan (XSS-beschermd)
 * Gebruikt textContent i.p.v. innerHTML om script injectie te voorkomen
 */
function createResultCard(item) {
    const card = document.createElement("div");
    card.className = "result-card card";

    const dateDiv = document.createElement("div");
    dateDiv.className = "date";
    dateDiv.textContent = item.date;

    const titleDiv = document.createElement("div");
    titleDiv.className = "title";
    titleDiv.textContent = item.title;

    const link = document.createElement("a");
    link.href = item.url; // Browsers saneren href automatisch
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = "PDF Downloaden";

    card.appendChild(dateDiv);
    card.appendChild(titleDiv);
    card.appendChild(link);

    return card;
}

function renderResultCards(container, items) {
    container.innerHTML = "";
    const fragment = document.createDocumentFragment();
    items.forEach((item) => fragment.appendChild(createResultCard(item)));
    container.appendChild(fragment);
}

function parseVerbondsbladenFromHtml(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const headers = doc.querySelectorAll("h3");
    const parsed = [];

    headers.forEach((header) => {
        const title = header.textContent.trim();
        if (!title.includes("Verbondsblad")) return;

        const parent = header.parentElement;
        const contentArea = header.closest('[class*="article"], [class*="post"], div');

        let date = UNKNOWN_DATE_TEXT;
        let pdfUrl = null;

        if (contentArea) {
            const dateEl = contentArea.querySelector("time");
            const extractedDate = contentArea.textContent.match(/\d{1,2}\s*\w+\s*\d{4}/);
            if (dateEl?.textContent) {
                date = dateEl.textContent.trim();
            } else if (extractedDate) {
                date = extractedDate[0];
            }
        }

        const directPdfLink = header.closest("div")?.querySelector('a[href*=".pdf"]')
            || parent?.querySelector('a[href*=".pdf"]');
        if (directPdfLink) pdfUrl = directPdfLink.href;

        if (!pdfUrl) {
            const fallbackLink = header.closest("a") || parent?.querySelector("a");
            if (fallbackLink) pdfUrl = fallbackLink.href;
        }

        if (pdfUrl) parsed.push({ title, date, url: pdfUrl });
    });

    return parsed.slice(0, MAX_VERBONDSBLADEN);
}

async function fetchViaProxy() {
    for (const endpoint of PROXY_ENDPOINTS) {
        try {
            const response = await fetch(endpoint, { cache: "no-store" });
            if (!response.ok) {
                continue;
            }

            const json = await response.json();
            if (Array.isArray(json) && json.length) {
                return json.slice(0, MAX_VERBONDSBLADEN);
            }
        } catch {
            // Try next proxy endpoint
        }
    }

    throw new Error("Proxy niet beschikbaar");
}

async function fetchViaAllOrigins() {
    const response = await fetch(
        "https://api.allorigins.win/raw?url=" + encodeURIComponent(PERKEZ_URL)
    );
    if (!response.ok) throw new Error("Fallback niet bereikbaar");
    const html = await response.text();
    return parseVerbondsbladenFromHtml(html);
}

async function fetchVerbondsbladen() {
    try {
        return await fetchViaProxy();
    } catch {
        return fetchViaAllOrigins();
    }
}

export async function loadVerbondsbladen() {
    const container = document.querySelector(SELECTORS.container);
    if (!container) return;

    const loadingEl = document.querySelector(SELECTORS.loading);
    const errorEl = document.querySelector(SELECTORS.error);
    const errorTextEl = document.querySelector("#results-error-text");
    const retryBtn = document.querySelector(SELECTORS.retry);

    errorEl?.classList.add("is-hidden");
    if (loadingEl) {
        loadingEl.classList.remove("is-hidden");
        loadingEl.setAttribute("aria-hidden", "false");
    }

    if (retryBtn) {
        retryBtn.onclick = (event) => {
            event.preventDefault();
            loadVerbondsbladen();
        };
    }

    try {
        const verbondsbladen = await fetchVerbondsbladen();
        if (!verbondsbladen.length) throw new Error("Geen verbondsbladen gevonden");
        renderResultCards(container, verbondsbladen);
    } catch (error) {
        console.error("Verbondsbladen laden faalde, dummy-data getoond.", error);
        if (errorEl) errorEl.classList.remove("is-hidden");
        if (errorTextEl) {
            errorTextEl.textContent = "Live data tijdelijk niet beschikbaar. Tijdelijke gegevens worden getoond.";
        }
        renderResultCards(container, DUMMY_VERBONDSBLADEN);
    } finally {
        if (loadingEl) {
            loadingEl.classList.add("is-hidden");
            loadingEl.setAttribute("aria-hidden", "true");
        }
    }
}

/**
 * Parse evenement datum uit DOM elementen en bereken correct jaar
 * Handelt jaaroverschrijding af (Aug-Dec = huidig jaar, Jan-Jul = volgend jaar)
 */
function getSeasonBounds(referenceDate) {
    const currentYear = referenceDate.getFullYear();
    const currentMonth = referenceDate.getMonth();

    const seasonStartYear = currentMonth <= 6 ? currentYear - 1 : currentYear;
    const seasonEndYear = seasonStartYear + 1;
    const seasonEndDate = new Date(seasonEndYear, 6, 31);
    seasonEndDate.setHours(23, 59, 59, 999);

    return {
        seasonStartYear,
        seasonEndYear,
        seasonEndDate
    };
}

function getEventDate(event, referenceDate) {
    const dayEl = event.querySelector(".cal-day");
    const monthEl = event.querySelector(".cal-month");
    if (!dayEl || !monthEl) return null;

    const day = parseInt(dayEl.textContent, 10);
    const month = MONTH_MAP[monthEl.textContent.trim()];
    if (Number.isNaN(day) || month === undefined) return null;

    const { seasonStartYear, seasonEndYear } = getSeasonBounds(referenceDate);
    const year = month >= 7 ? seasonStartYear : seasonEndYear;

    const eventDate = new Date(year, month, day);
    eventDate.setHours(0, 0, 0, 0);
    return eventDate;
}

function getUpcomingEventsForTeam(teamElement, today, isAfterNoon) {
    const { seasonEndDate } = getSeasonBounds(today);

    const events = Array.from(teamElement.querySelectorAll(".calendar-event")).map((event) => ({
        element: event,
        date: getEventDate(event, today)
    }));

    const upcoming = events
        .filter(({ date }) => {
            if (!date) return false;
            if (today > seasonEndDate) return false;
            if (date > seasonEndDate) return false;
            if (date > today) return true;
            return date.getTime() === today.getTime() && !isAfterNoon;
        })
        .sort((a, b) => a.date - b.date);

    return { events, upcoming };
}

function getTeamIdFromElement(teamElement) {
    return teamElement.id.replace("calendar-", "");
}

function getActiveTeamElement(calendarTeams) {
    return Array.from(calendarTeams).find((team) => team.classList.contains("active")) || null;
}

function updateLoadMoreButtonState(activeTeamElement) {
    const loadMoreButton = document.querySelector("#calendar-load-more");
    if (!loadMoreButton || !activeTeamElement) return;

    const { today, isAfterNoon } = getTodayContext();

    const activeTeamId = getTeamIdFromElement(activeTeamElement);
    const visibleCount = visibleMatchesPerTeam.get(activeTeamId) || INITIAL_VISIBLE_MATCHES;
    const { upcoming } = getUpcomingEventsForTeam(activeTeamElement, today, isAfterNoon);

    loadMoreButton.hidden = visibleCount >= upcoming.length;
}

/*
 * Filtert en toont enkel komende wedstrijden (max 3 per team)
 * Verbergt voorbije wedstrijden en ongeldige datums
 */
function filterUpcomingMatches(calendarTeams) {
    const { today, isAfterNoon } = getTodayContext();

    calendarTeams.forEach((team) => {
        const { events, upcoming } = getUpcomingEventsForTeam(team, today, isAfterNoon);
        const teamId = getTeamIdFromElement(team);
        const visibleCount = visibleMatchesPerTeam.get(teamId) || INITIAL_VISIBLE_MATCHES;

        events.forEach(({ element, date }) => {
            element.style.display = date ? "" : "none";
        });

        const past = events.filter(({ date }) => {
            if (!date) return false;
            if (date < today) return true;
            return date.getTime() === today.getTime() && isAfterNoon;
        });

        upcoming.forEach(({ element }, index) => {
            element.style.display = index < visibleCount ? "" : "none";
        });
        past.forEach(({ element }) => {
            element.style.display = "none";
        });
    });

    updateLoadMoreButtonState(getActiveTeamElement(calendarTeams));
}

function switchTeam(teamId, tabButtons, calendarTeams) {
    tabButtons.forEach((button) => button.classList.toggle("active", button.dataset.team === teamId));
    calendarTeams.forEach((team) => {
        team.classList.toggle("active", team.id === `calendar-${teamId}`);
    });
}

function updateRankingLink(teamId) {
    const rankingLink = document.querySelector("#calendar-ranking-link");
    if (!rankingLink) return;
    rankingLink.href = `./uitslagen.html?team=${encodeURIComponent(teamId)}#klassement`;
}

export function initCalendarTabs() {
    const tabButtons = document.querySelectorAll(".tab-btn");
    const calendarTeams = document.querySelectorAll(".calendar-team");
    if (!tabButtons.length || !calendarTeams.length) return;

    calendarTeams.forEach((team) => {
        visibleMatchesPerTeam.set(getTeamIdFromElement(team), INITIAL_VISIBLE_MATCHES);
    });

    addClickListener(".tab-btn", (event) => {
        event.preventDefault();
        const button = event.currentTarget;
        if (!button) return;
        switchTeam(button.dataset.team, tabButtons, calendarTeams);
        updateRankingLink(button.dataset.team);
        filterUpcomingMatches(calendarTeams);
    });

    addClickListener("#calendar-load-more", () => {
        try {
            const activeTeam = getActiveTeamElement(calendarTeams);
            if (!activeTeam) return;

            const activeTeamId = getTeamIdFromElement(activeTeam);
            const currentVisible = visibleMatchesPerTeam.get(activeTeamId) || INITIAL_VISIBLE_MATCHES;
            visibleMatchesPerTeam.set(activeTeamId, currentVisible + LOAD_MORE_STEP);
            filterUpcomingMatches(calendarTeams);
        } catch (error) {
            console.error("Fout bij laden van extra wedstrijden:", error);
            const loadMoreButton = document.querySelector("#calendar-load-more");
            if (loadMoreButton) loadMoreButton.hidden = true;
        }
    });

    // Verwerk ?team=XX URL parameter (met validatie)
    const teamParam = new URLSearchParams(window.location.search).get("team");
    if (teamParam) {
        // Sta enkel geldige team ID's toe die bestaan in de DOM 
        const validTeams = Array.from(tabButtons).map((btn) => btn.dataset.team);
        if (validTeams.includes(teamParam)) {
            const targetButton = Array.from(tabButtons).find((button) => button.dataset.team === teamParam);
            if (targetButton) targetButton.click();
        }
    }

    const activeButton = Array.from(tabButtons).find((button) => button.classList.contains("active")) || tabButtons[0];
    if (activeButton) {
        updateRankingLink(activeButton.dataset.team);
    }

    filterUpcomingMatches(calendarTeams);
}
