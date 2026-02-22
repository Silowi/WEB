import { addClickListener } from "./utils.js";

/**
 * Laad en toon klassement data uit JSON bestand
 * Gebruikt lokale data die handmatig wordt geüpdatet
 */

const KLASSEMENT_DATA_PATH = "../data/klassement.json";

/**
 * Maak een tabel rij voor één team aan
 */
function createTableRow(teamData, isOwnTeam = false) {
    const row = document.createElement("tr");
    if (isOwnTeam) row.classList.add("highlight");

    const goalDiff = teamData.goalsFor - teamData.goalsAgainst;
    const goalDiffClass = goalDiff > 0 ? "positive" : goalDiff < 0 ? "negative" : "";

    row.innerHTML = `
        <td class="position center">${teamData.position}</td>
        <td class="team">${teamData.team}</td>
        <td class="center">${teamData.played}</td>
        <td class="center hide-mobile">${teamData.won}</td>
        <td class="center hide-mobile">${teamData.draw}</td>
        <td class="center hide-mobile">${teamData.lost}</td>
        <td class="center hide-mobile">${teamData.goalsFor}</td>
        <td class="center hide-mobile">${teamData.goalsAgainst}</td>
        <td class="center goal-diff ${goalDiffClass}">${goalDiff > 0 ? '+' : ''}${goalDiff}</td>
        <td class="center points">${teamData.points}</td>
    `;

    return row;
}

/**
 * Render klassement tabel voor specifieke reeks
 * Reeks 1 = 78 & 82 (zelfde competitie)
 * Reeks 2 = 68 (aparte competitie)
 */
function renderKlassementTable(standings, reeksId) {
    const wrapper = document.querySelector(`#klassement-reeks-${reeksId}`);
    if (!wrapper) return;

    const tbody = wrapper.querySelector("tbody");
    if (!tbody) return;

    tbody.innerHTML = "";

    standings.forEach((teamData) => {
        const isOwnTeam = teamData.team.includes("Ettelgem") || 
                          teamData.team.includes("KVK");
        const row = createTableRow(teamData, isOwnTeam);
        tbody.appendChild(row);
    });
}

/**
 * Wissel tussen verschillende klassement tabs (reeksen)
 */
function switchKlassementTab(reeksId, tabButtons, tableWrappers) {
    tabButtons.forEach((button) => 
        button.classList.toggle("active", button.dataset.reeks === reeksId)
    );
    tableWrappers.forEach((wrapper) => 
        wrapper.classList.toggle("active", wrapper.id === `klassement-reeks-${reeksId}`)
    );
}

/**
 * Update de "laatst bijgewerkt" datum
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
    } catch (error) {
        element.textContent = `Laatst bijgewerkt: ${dateString}`;
    }
}

/**
 * Laad klassement data en initialiseer tabs
 */
export async function loadKlassement() {
    const section = document.querySelector(".klassement-section");
    if (!section) return;

    try {
        const response = await fetch(KLASSEMENT_DATA_PATH);
        if (!response.ok) throw new Error("Klassement data niet beschikbaar");

        const data = await response.json();

        // Update laatste wijzigingsdatum
        if (data.lastUpdated) {
            updateLastUpdatedDate(data.lastUpdated);
        }

        // Render klassementen
        // Reeks 1: teams 78 & 82 spelen in dezelfde competitie
        // Reeks 2: team 68 speelt in een aparte competitie
        renderKlassementTable(data.teams["78"], "1"); // 78 en 82 hebben zelfde klassement
        renderKlassementTable(data.teams["68"], "2");

        // Initialiseer tab switching
        const tabButtons = document.querySelectorAll(".klassement-tab-btn");
        const tableWrappers = document.querySelectorAll(".klassement-table-wrapper");

        addClickListener(".klassement-tab-btn", (event) => {
            event.preventDefault();
            const button = event.currentTarget;
            if (!button) return;
            switchKlassementTab(button.dataset.reeks, tabButtons, tableWrappers);
        });

    } catch (error) {
        console.error("Fout bij laden klassement:", error);
        // Toon vriendelijke foutmelding
        const section = document.querySelector(".klassement-section");
        if (section) {
            const errorDiv = document.createElement("div");
            errorDiv.className = "results-error";
            errorDiv.innerHTML = `
                <p>Klassement tijdelijk niet beschikbaar. Probeer later opnieuw.</p>
            `;
            section.appendChild(errorDiv);
        }
    }
}
