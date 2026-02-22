import { initHeroSlideshow } from "./hero.js";
import { initMobileMenu, setActiveNavLink } from "./menu.js";
import { loadVerbondsbladen, initCalendarTabs } from "./calendar.js";
import { loadKlassement } from "./klassement.js";
import { initContactForm } from "./contact.js";
import { initGallery } from "./gallery.js";
import { renderSharedFooter } from "./footer.js";

function initApp() {
    renderSharedFooter();
    initMobileMenu();
    setActiveNavLink();
    initHeroSlideshow();
    initCalendarTabs();
    loadVerbondsbladen();
    loadKlassement();
    initContactForm();
    initGallery();
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initApp);
} else {
    initApp();
}
