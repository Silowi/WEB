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

const DUMMY_VERBONDSBLADEN = [
    { title: "Verbondsblad Nr. 1599", date: "17 februari 2026", url: "https://www.perkez.be/website/wp-content/uploads/Nr-1599.pdf" },
    { title: "Verbondsblad Nr. 1598", date: "10 februari 2026", url: "https://www.perkez.be/website/wp-content/uploads/Nr-1598.pdf" },
    { title: "Verbondsblad Nr. 1597", date: "3 februari 2026", url: "https://www.perkez.be/website/wp-content/uploads/Nr-1597.pdf" }
];

const MAX_VERBONDSBLADEN = 3;

function getAssetPrefix() {
    return window.location.pathname.toLowerCase().includes("/pages/") ? "../" : "";
}

function renderSharedFooter() {
    const footer = document.querySelector("footer.footer");
    if (!footer) return;

    const assetPrefix = getAssetPrefix();
    const email = "drukkerij.devlieghere@skynet.be";

    footer.innerHTML = `
        <div class="sponsors">
            <h2>Onze Sponsors</h2>
            <div class="sponsor-grid">
                <a href="#" class="sponsor"><img src="${assetPrefix}img/Sponser2.jpg" alt="Sponsor 1"></a>
                <a href="#" class="sponsor"><img src="${assetPrefix}img/Sponser4.png" alt="Sponsor 2"></a>
                <a href="#" class="sponsor"><img src="${assetPrefix}img/Sponser5.JPG" alt="Sponsor 3"></a>
                <a href="#" class="sponsor"><img src="${assetPrefix}img/Sponser6.jpg" alt="Sponsor 4"></a>
            </div>
        </div>
        <div class="footer-contact">
            <div class="footer-brand">
                <img src="${assetPrefix}img/favicon.png" alt="KVK Ettelgem logo" class="footer-logo">
                <h3>KVK Ettelgem</h3>
            </div>
            <p>Locatie:<br>Vijfwegstraat 34-35<br>8460 Ettelgem (Oudenburg)</p>
            <a class="contact-mail" href="mailto:${email}">${email}</a>
        </div>
        <div class="footer-socials-col">
            <h3>Volg ons</h3>
            <div class="footer-socials" aria-label="Social media links">
                <a href="#" aria-label="Facebook"><i class="fab fa-facebook-f"></i></a>
                <a href="#" aria-label="Instagram"><i class="fab fa-instagram"></i></a>
                <a href="mailto:${email}" aria-label="E-mail"><i class="fas fa-envelope"></i></a>
            </div>
        </div>
        <div class="footer-bottom">
            <p>&copy; 2026 KVK Ettelgem - Alle rechten voorbehouden</p>
        </div>
    `;
}

function initMobileMenu() {
    const menuBtn = document.querySelector("#menu-btn");
    const navbar = document.querySelector(".navbar");
    if (!menuBtn || !navbar) return;

    const closeMobileMenu = () => {
        navbar.classList.remove("active");
        menuBtn.classList.remove("fa-xmark", "is-open");
        menuBtn.classList.add("fa-bars");
    };

    menuBtn.addEventListener("click", () => {
        navbar.classList.toggle("active");
        menuBtn.classList.toggle("fa-bars");
        menuBtn.classList.toggle("fa-xmark");
        menuBtn.classList.toggle("is-open");
    });

    document.querySelectorAll(".navbar .nav-link").forEach((link) => {
        link.addEventListener("click", () => {
            if (window.innerWidth <= 768) closeMobileMenu();
        });
    });

    window.addEventListener("resize", () => {
        if (window.innerWidth > 768) closeMobileMenu();
    });
}

function setActiveNavLink() {
    const navLinks = document.querySelectorAll(".header .nav-link[data-page]");
    if (!navLinks.length) return;

    const path = window.location.pathname.toLowerCase();
    const pageMap = [
        { segment: "/pages/kalender.html", page: "kalender" },
        { segment: "/pages/uitslagen.html", page: "uitslagen" },
        { segment: "/pages/evenementen.html", page: "evenementen" }
    ];

    const currentPage = pageMap.find((entry) => path.includes(entry.segment))?.page || "home";

    navLinks.forEach((link) => {
        const isActive = link.dataset.page === currentPage;
        link.classList.toggle("active", isActive);
        link.classList.toggle("nav-cta", isActive);
        if (isActive) link.setAttribute("aria-current", "page");
        else link.removeAttribute("aria-current");
    });
}

function initHeroSlideshow() {
    const heroSlides = document.querySelectorAll(".hero-slide");
    if (!heroSlides.length) return;

    let heroIndex = 0;

    const showHeroSlide = (index) => {
        heroSlides.forEach((slide, i) => slide.classList.toggle("active", i === index));
    };

    showHeroSlide(heroIndex);

    if (heroSlides.length > 1) {
        setInterval(() => {
            heroIndex = (heroIndex + 1) % heroSlides.length;
            showHeroSlide(heroIndex);
        }, 10000);
    }
}

function createResultCard(item) {
    const card = document.createElement("div");
    card.className = "result-card";
    card.innerHTML = `
        <div class="date">${item.date}</div>
        <div class="title">${item.title}</div>
        <a href="${item.url}" target="_blank">PDF Downloaden</a>
    `;
    return card;
}

function renderResultCards(container, items) {
    container.innerHTML = "";
    items.forEach((item) => container.appendChild(createResultCard(item)));
}

function parseVerbondsbladenFromHtml(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const items = doc.querySelectorAll("h3");
    const parsed = [];

    items.forEach((item) => {
        const title = item.textContent.trim();
        if (!title.includes("Verbondsblad")) return;

        const parent = item.parentElement;
        const contentArea = item.closest('[class*="article"], [class*="post"], div');

        let date = "Datum onbekend";
        let pdfUrl = null;

        if (contentArea) {
            const dateEl = contentArea.querySelector("time");
            const dateMatch = contentArea.textContent.match(/\d{1,2}\s*\w+\s*\d{4}/);
            if (dateEl?.textContent) date = dateEl.textContent;
            else if (dateMatch) date = dateMatch[0];
        }

        const directPdfLink = item.closest("div")?.querySelector('a[href*=".pdf"]')
            || parent?.querySelector('a[href*=".pdf"]');
        if (directPdfLink) pdfUrl = directPdfLink.href;

        if (!pdfUrl) {
            const fallbackLink = item.closest("a") || parent?.querySelector("a");
            if (fallbackLink) pdfUrl = fallbackLink.href;
        }

        if (pdfUrl) parsed.push({ title, date, url: pdfUrl });
    });

    return parsed.slice(0, MAX_VERBONDSBLADEN);
}

async function loadVerbondsbladen() {
    const container = document.getElementById("results-container");
    const loadingEl = document.getElementById("results-loading");
    const errorEl = document.getElementById("results-error");
    const retryBtn = document.getElementById("results-retry");
    if (!container) return;

    if (errorEl) errorEl.style.display = "none";
    if (loadingEl) {
        loadingEl.style.display = "flex";
        loadingEl.setAttribute("aria-hidden", "false");
    }

    if (retryBtn) {
        retryBtn.onclick = (e) => {
            e.preventDefault();
            loadVerbondsbladen();
        };
    }

    try {
        try {
            const proxyResp = await fetch("/perkez-proxy.php", { cache: "no-store" });
            if (proxyResp.ok) {
                const json = await proxyResp.json();
                if (Array.isArray(json) && json.length) {
                    renderResultCards(container, json);
                    return;
                }
            }
        } catch (error) {
            console.log("Lokale proxy niet beschikbaar, fallback gebruiken.", error);
        }

        const response = await fetch(
            "https://api.allorigins.win/raw?url=" + encodeURIComponent("https://www.perkez.be/verbondsbladen/")
        );
        const html = await response.text();
        const verbondsbladen = parseVerbondsbladenFromHtml(html);

        if (!verbondsbladen.length) throw new Error("Geen verbondsbladen gevonden");

        renderResultCards(container, verbondsbladen);
    } catch (error) {
        console.error("Verbondsbladen laden faalde, dummy-data getoond.", error);
        renderResultCards(container, DUMMY_VERBONDSBLADEN);
    } finally {
        if (loadingEl) {
            loadingEl.style.display = "none";
            loadingEl.setAttribute("aria-hidden", "true");
        }
    }
}

function filterUpcomingMatches() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    document.querySelectorAll(".calendar-team").forEach((team) => {
        const upcomingEvents = [];
        const pastEvents = [];

        team.querySelectorAll(".calendar-event").forEach((event) => {
            const dayEl = event.querySelector(".cal-day");
            const monthEl = event.querySelector(".cal-month");
            if (!dayEl || !monthEl) return;

            const day = parseInt(dayEl.textContent, 10);
            const month = MONTH_MAP[monthEl.textContent.trim()];
            if (Number.isNaN(day) || month === undefined) return;

            let year = today.getFullYear();
            if (month < today.getMonth()) year += 1;

            const eventDate = new Date(year, month, day);
            eventDate.setHours(0, 0, 0, 0);

            if (eventDate >= today) upcomingEvents.push({ date: eventDate, element: event });
            else pastEvents.push(event);
        });

        upcomingEvents.sort((a, b) => a.date - b.date);
        upcomingEvents.forEach((item, index) => {
            item.element.style.display = index < 3 ? "" : "none";
        });
        pastEvents.forEach((event) => {
            event.style.display = "none";
        });
    });
}

function initCalendarTabs() {
    const tabButtons = document.querySelectorAll(".tab-btn");
    const calendarTeams = document.querySelectorAll(".calendar-team");
    if (!tabButtons.length || !calendarTeams.length) return;

    tabButtons.forEach((btn) => {
        btn.addEventListener("click", (e) => {
            e.preventDefault();
            const teamId = btn.dataset.team;

            tabButtons.forEach((button) => button.classList.remove("active"));
            calendarTeams.forEach((team) => team.classList.remove("active"));

            btn.classList.add("active");
            document.getElementById(`calendar-${teamId}`)?.classList.add("active");
        });
    });

    const teamParam = new URLSearchParams(window.location.search).get("team");
    if (teamParam) document.querySelector(`[data-team="${teamParam}"]`)?.click();

    filterUpcomingMatches();
}

function initApp() {
    renderSharedFooter();
    initMobileMenu();
    setActiveNavLink();
    initHeroSlideshow();
    loadVerbondsbladen();
    initCalendarTabs();
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initApp);
} else {
    initApp();
}
