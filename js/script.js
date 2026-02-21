const menuBtn = document.querySelector("#menu-btn");
const navbar = document.querySelector(".navbar");

menuBtn.onclick = () => {
    navbar.classList.toggle("active");
};

function setActiveNavLink() {
    const navLinks = document.querySelectorAll('.header .nav-link[data-page]');
    if (!navLinks.length) return;

    const path = window.location.pathname.toLowerCase();
    let currentPage = 'home';

    if (path.includes('/pages/kalender.html')) {
        currentPage = 'kalender';
    } else if (path.includes('/pages/uitslagen.html')) {
        currentPage = 'uitslagen';
    }

    navLinks.forEach((link) => {
        const isActive = link.dataset.page === currentPage;
        link.classList.toggle('active', isActive);
        link.classList.toggle('nav-cta', isActive);

        if (isActive) {
            link.setAttribute('aria-current', 'page');
        } else {
            link.removeAttribute('aria-current');
        }
    });
}

setActiveNavLink();

// hero background slideshow
const heroSlides = document.querySelectorAll('.hero-slide');
let heroIndex = 0;

function showHeroSlide(n) {
    heroSlides.forEach((slide, i) => {
        slide.classList.toggle('active', i === n);
    });
}

function nextHeroSlide() {
    heroIndex = (heroIndex + 1) % heroSlides.length;
    showHeroSlide(heroIndex);
}

if (heroSlides.length) {
    showHeroSlide(heroIndex);
    setInterval(nextHeroSlide, 10000); // wissel om de 5 seconden
}

// Load recent verbondsbladen from PERKEZ
async function loadVerbondsbladen() {
    const container = document.getElementById('results-container');
    const loadingEl = document.getElementById('results-loading');
    const errorEl = document.getElementById('results-error');
    const errorText = document.getElementById('results-error-text');
    const retryBtn = document.getElementById('results-retry');
    if (!container) return;

    // UI reset
    container.innerHTML = '';
    if (errorEl) errorEl.style.display = 'none';
    if (loadingEl) { loadingEl.style.display = 'flex'; loadingEl.setAttribute('aria-hidden', 'false'); }

    // Attach retry handler
    if (retryBtn) {
        retryBtn.onclick = (e) => {
            e.preventDefault();
            loadVerbondsbladen();
        };
    }

    try {
        // Try local proxy first
        try {
            const proxyResp = await fetch('/perkez-proxy.php', { cache: 'no-store' });
            if (proxyResp.ok) {
                const json = await proxyResp.json();
                if (json && json.length) {
                    json.forEach((item) => {
                        const card = document.createElement('div');
                        card.className = 'result-card';
                        card.innerHTML = `
                            <div class="date">${item.date}</div>
                            <div class="title">${item.title}</div>
                            <a href="${item.url}" target="_blank">PDF Downloaden</a>
                        `;
                        container.appendChild(card);
                    });
                    if (loadingEl) { loadingEl.style.display = 'none'; loadingEl.setAttribute('aria-hidden', 'true'); }
                    console.log('✓ Verbondsbladen geladen via lokale proxy:', json.length);
                    return;
                }
            }
        } catch (e) {
            console.log('Lokale proxy niet beschikbaar, fallback gebruiken.');
        }

        // Fallback: AllOrigins
        const response = await fetch('https://api.allorigins.win/raw?url=' + encodeURIComponent('https://www.perkez.be/verbondsbladen/'));
        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // Parse verbondsbladen items (laatste 3)
        const items = doc.querySelectorAll('h3');
        const verbondsbladen = [];

        items.forEach((item) => {
            const text = item.textContent.trim();
            if (text.includes('Verbondsblad')) {
                let parent = item.parentElement;
                let date = 'Datum onbekend';
                let pdfUrl = null;

                const contentArea = item.closest('[class*="article"], [class*="post"], div');
                if (contentArea) {
                    const dateEl = contentArea.querySelector('time') || contentArea.textContent.match(/\d{1,2}\s*\w+\s*\d{4}/);
                    if (dateEl) date = dateEl.textContent || dateEl[0];
                }

                const pdfLink = item.closest('div')?.querySelector('a[href*=".pdf"]') || parent.querySelector('a[href*=".pdf"]');
                if (pdfLink) pdfUrl = pdfLink.href;
                if (!pdfUrl) {
                    const link = item.closest('a') || parent.querySelector('a');
                    if (link) pdfUrl = link.href;
                }

                if (pdfUrl) verbondsbladen.push({ title: text, date: date, url: pdfUrl });
            }
        });

        const toShow = verbondsbladen.slice(0, 3);
        if (toShow.length === 0) {
            throw new Error('Geen verbondsbladen gevonden');
        }

        toShow.forEach((item) => {
            const card = document.createElement('div');
            card.className = 'result-card';
            card.innerHTML = `
                <div class="date">${item.date}</div>
                <div class="title">${item.title}</div>
                <a href="${item.url}" target="_blank">PDF Downloaden</a>
            `;
            container.appendChild(card);
        });

        if (loadingEl) { loadingEl.style.display = 'none'; loadingEl.setAttribute('aria-hidden', 'true'); }
    } catch (error) {
        if (loadingEl) { loadingEl.style.display = 'none'; loadingEl.setAttribute('aria-hidden', 'true'); }
        
        // Fallback: dummy-data voor lokaal testen
        console.log('Proxy en AllOrigins niet beschikbaar. Dummy-data wordt geladen voor preview.');
        const dummyData = [
            { title: 'Verbondsblad Nr. 1599', date: '17 februari 2026', url: 'https://www.perkez.be/website/wp-content/uploads/Nr-1599.pdf' },
            { title: 'Verbondsblad Nr. 1598', date: '10 februari 2026', url: 'https://www.perkez.be/website/wp-content/uploads/Nr-1598.pdf' },
            { title: 'Verbondsblad Nr. 1597', date: '3 februari 2026', url: 'https://www.perkez.be/website/wp-content/uploads/Nr-1597.pdf' }
        ];
        
        dummyData.forEach((item) => {
            const card = document.createElement('div');
            card.className = 'result-card';
            card.innerHTML = `
                <div class="date">${item.date}</div>
                <div class="title">${item.title}</div>
                <a href="${item.url}" target="_blank">PDF Downloaden</a>
            `;
            container.appendChild(card);
        });
        
        // Toon optionele fout-info in console
        console.error('Verbondsbladen laden faalde (proxy/AllOrigins niet beschikbaar). Dummy-data getoond.');
    }
}

// Load on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadVerbondsbladen);
} else {
    loadVerbondsbladen();
}

// ===== Kalender Tab Switching & Filtering =====
document.addEventListener('DOMContentLoaded', () => {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const calendarTeams = document.querySelectorAll('.calendar-team');

    tabButtons.forEach((btn) => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const teamId = btn.dataset.team;

            // Verwijder active klasse van alle buttons en teams
            tabButtons.forEach((b) => b.classList.remove('active'));
            calendarTeams.forEach((team) => team.classList.remove('active'));

            // Voeg active klasse toe aan geselecteerde button en team
            btn.classList.add('active');
            const selectedTeam = document.getElementById(`calendar-${teamId}`);
            if (selectedTeam) {
                selectedTeam.classList.add('active');
            }
        });
    });
    
    // Check for team parameter in URL (e.g., ?team=68)
    const params = new URLSearchParams(window.location.search);
    const teamParam = params.get('team');
    if (teamParam) {
        const teamBtn = document.querySelector(`[data-team="${teamParam}"]`);
        if (teamBtn) {
            teamBtn.click(); // Trigger the click to select the team
        }
    }
    
    // Filter to show only next 3 upcoming matches per team
    filterUpcomingMatches();
});

// Filter to show only next 5 upcoming matches per team
function filterUpcomingMatches() {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to start of day
    
    const calendarTeams = document.querySelectorAll('.calendar-team');
    
    calendarTeams.forEach((team) => {
        const events = team.querySelectorAll('.calendar-event');
        const upcomingEvents = [];
        const pastEvents = [];
        
        events.forEach((event) => {
            // Extract date from calendar event
            const dayEl = event.querySelector('.cal-day');
            const monthEl = event.querySelector('.cal-month');
            
            if (dayEl && monthEl) {
                const day = parseInt(dayEl.textContent);
                const monthStr = monthEl.textContent.trim();
                
                // Map month abbreviation to number
                const monthMap = {
                    'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
                    'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
                };
                
                const month = monthMap[monthStr];
                let year = today.getFullYear();
                
                // If month is before current month, assume next year
                if (month < today.getMonth()) {
                    year++;
                }
                
                const eventDate = new Date(year, month, day);
                eventDate.setHours(0, 0, 0, 0);
                
                if (eventDate >= today) {
                    upcomingEvents.push({ date: eventDate, element: event });
                } else {
                    pastEvents.push(event);
                }
            }
        });
        
        // Sort upcoming events by date
        upcomingEvents.sort((a, b) => a.date - b.date);
        
        // Show only first 3 upcoming
        upcomingEvents.forEach((item, index) => {
            if (index < 3) {
                item.element.style.display = '';
            } else {
                item.element.style.display = 'none';
            }
        });
        
        // Hide all past events
        pastEvents.forEach((event) => {
            event.style.display = 'none';
        });
    });
}
