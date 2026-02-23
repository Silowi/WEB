import { addClickListener } from "./utils.js";

/**
 * Laad en toon klassement data uit JSON bestand.
 * Gebruikt lokale data die handmatig wordt geupdatet.
 */
const KLASSEMENT_DATA_PATH = "../data/klassement.json";
const OWN_TEAM_MATCHERS = ["Ettelgem", "KVK"];
const POSITION_ICON_UP = "&#9650;";
const POSITION_ICON_DOWN = "&#9660;";

function getPositionChange(teamData) {
    if (typeof teamData.previousPosition !== "number") return 0;
    return teamData.previousPosition - teamData.position;
}

/**
 * Maak een tabelrij voor een team aan.
 */
function createTableRow(teamData, isOwnTeam = false) {
    const row = document.createElement("tr");
    if (isOwnTeam) row.classList.add("highlight");

    const goalDiff = teamData.goalsFor - teamData.goalsAgainst;
    const goalDiffClass = goalDiff > 0 ? "positive" : goalDiff < 0 ? "negative" : "";
    const positionChange = getPositionChange(teamData);
    const positionChangeMarkup = positionChange > 0
        ? `<span class="position-change up" title="Stijger (+${positionChange})" aria-label="Stijger ${positionChange} plaats${positionChange > 1 ? "en" : ""}">${POSITION_ICON_UP}</span>`
        : positionChange < 0
            ? `<span class="position-change down" title="Zakker (${positionChange})" aria-label="Zakker ${Math.abs(positionChange)} plaats${Math.abs(positionChange) > 1 ? "en" : ""}">${POSITION_ICON_DOWN}</span>`
            : "";

    row.innerHTML = `
        <td class="position center"><span class="position-wrap">${teamData.position}${positionChangeMarkup}</span></td>
        <td class="team">${teamData.team}</td>
        <td class="center">${teamData.played}</td>
        <td class="center hide-mobile">${teamData.won}</td>
        <td class="center hide-mobile">${teamData.draw}</td>
        <td class="center hide-mobile">${teamData.lost}</td>
        <td class="center hide-mobile">${teamData.goalsFor}</td>
        <td class="center hide-mobile">${teamData.goalsAgainst}</td>
        <td class="center goal-diff ${goalDiffClass}">${goalDiff > 0 ? "+" : ""}${goalDiff}</td>
        <td class="center points">${teamData.points}</td>
    `;

    return row;
}

/**
 * Render klassement tabel voor specifieke reeks.
 * Reeks 1 = 78 & 82 (zelfde competitie)
 * Reeks 2 = 68 (aparte competitie)
 */
function renderKlassementTable(standings, reeksId) {
    const wrapper = document.querySelector(`#klassement-reeks-${reeksId}`);
    if (!wrapper || !Array.isArray(standings)) return;

    const tbody = wrapper.querySelector("tbody");
    if (!tbody) return;

    tbody.innerHTML = "";

    standings.forEach((teamData) => {
        const isOwnTeam = OWN_TEAM_MATCHERS.some((matcher) => teamData.team.includes(matcher));
        const row = createTableRow(teamData, isOwnTeam);
        tbody.appendChild(row);
    });
}

/**
 * Wissel tussen verschillende klassement tabs (reeksen).
 */
function switchKlassementTab(reeksId, tabButtons, tableWrappers) {
    tabButtons.forEach((button) =>
        button.classList.toggle("active", button.dataset.reeks === reeksId)
    );
    tableWrappers.forEach((wrapper) => {
        const isActive = wrapper.id === `klassement-reeks-${reeksId}`;
        wrapper.classList.toggle("active", isActive);
        wrapper.hidden = !isActive;
    });
}

function mapTeamToReeks(teamId) {
    if (teamId === "68") return "2";
    if (teamId === "78" || teamId === "82") return "1";
    return null;
}

/**
 * Update de "laatst bijgewerkt" datum.
 */
function updateLastUpdatedDate(dateString) {
    const element = document.querySelector(".klassement-last-updated");
    if (!element) return;

    try {
        const date = new Date(dateString);
        const formatted = date.toLocaleDateString("nl-BE", {
            day: "numeric",
            month: "long",
            year: "numeric"
        });
        element.textContent = `Laatst bijgewerkt: ${formatted}`;
    } catch {
        element.textContent = `Laatst bijgewerkt: ${dateString}`;
    }
}

/**
 * Laad klassement data en initialiseer tabs.
 */
export async function loadKlassement() {
    const section = document.querySelector(".klassement-section");
    if (!section) return;

    try {
        const response = await fetch(KLASSEMENT_DATA_PATH);
        if (!response.ok) throw new Error("Klassement data niet beschikbaar");

        const data = await response.json();

        if (data.lastUpdated) {
            updateLastUpdatedDate(data.lastUpdated);
        }

        // Reeks 1: teams 78 & 82 spelen in dezelfde competitie.
        // Reeks 2: team 68 speelt in een aparte competitie.
        renderKlassementTable(data.teams["78"], "1");
        renderKlassementTable(data.teams["68"], "2");

        const tabButtons = document.querySelectorAll(".klassement-tab-btn");
        const tableWrappers = document.querySelectorAll(".klassement-table-wrapper");

        addClickListener(".klassement-tab-btn", (event) => {
            event.preventDefault();
            const button = event.currentTarget;
            if (!button) return;
            switchKlassementTab(button.dataset.reeks, tabButtons, tableWrappers);
        });

        const initialActiveButton = Array.from(tabButtons).find((button) => button.classList.contains("active"))
            || tabButtons[0];
        const teamParam = new URLSearchParams(window.location.search).get("team");
        const reeksFromTeam = mapTeamToReeks(teamParam);
        const initialReeks = reeksFromTeam || initialActiveButton?.dataset.reeks;

        if (initialReeks) {
            switchKlassementTab(initialReeks, tabButtons, tableWrappers);
        }
    } catch (error) {
        console.error("Fout bij laden klassement:", error);

        const errorDiv = document.createElement("div");
        errorDiv.className = "results-error";
        errorDiv.innerHTML = `
            <p>Klassement tijdelijk niet beschikbaar. Probeer later opnieuw.</p>
        `;
        section.appendChild(errorDiv);
    }
}
