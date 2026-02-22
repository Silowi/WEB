import { initHeroSlideshow } from "./hero.js";
import { initMobileMenu, setActiveNavLink } from "./menu.js";
import { loadVerbondsbladen, initCalendarTabs } from "./calendar.js";
import { renderSharedFooter } from "./footer.js";

function initApp() {
    renderSharedFooter();
    initMobileMenu();
    setActiveNavLink();
    initHeroSlideshow();
    initCalendarTabs();
    loadVerbondsbladen();
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initApp);
} else {
    initApp();
}
