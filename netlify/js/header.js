import { getAssetPrefix } from "./utils.js";

const NAV_ITEMS = [
    { page: "home", label: "Home", href: "index.html" },
    { page: "kalender", label: "Kalender", href: "pages/kalender.html" },
    { page: "uitslagen", label: "Rangschikking", href: "pages/uitslagen.html" },
    { page: "evenementen", label: "Evenementen", href: "pages/evenementen.html" },
    { page: "gallerij", label: "Foto's", href: "pages/gallerij.html" },
    { page: "contact", label: "Contact", href: "pages/contact.html" }
];

export function renderSharedHeader() {
    const header = document.querySelector("header.header");
    if (!header) return;

    const assetPrefix = getAssetPrefix();

    const navLinks = NAV_ITEMS.map(({ page, label, href }) => `
        <a href="${assetPrefix}${href}" class="header__link" data-page="${page}">${label}</a>
    `).join("");

    header.innerHTML = `
        <a href="${assetPrefix}index.html" class="header__logo" aria-label="Ga naar home">
            <i class="fa fa-futbol-o" aria-hidden="true"></i> KVK Ettelgem
        </a>

        <nav class="header__nav" aria-label="Hoofdnavigatie">
            ${navLinks}
        </nav>

        <button class="header__menu-toggle fas fa-bars" type="button" aria-label="Open menu"></button>
    `;
}
