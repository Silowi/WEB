import { addClickListener } from "./utils.js";

const MOBILE_BREAKPOINT = 1024;
const PATH_PAGE_MAP = [
    ["/pages/kalender.html", "kalender"],
    ["/pages/uitslagen.html", "uitslagen"],
    ["/pages/evenementen.html", "evenementen"],
    ["/pages/gallerij.html", "gallerij"],
    ["/pages/contact.html", "contact"]
];

function resolveCurrentPage(pathname) {
    const path = pathname.toLowerCase();
    const entry = PATH_PAGE_MAP.find(([match]) => path.includes(match));
    return entry ? entry[1] : "home";
}

export function initMobileMenu() {
    const menuBtn = document.querySelector(".header__menu-toggle");
    const navbar = document.querySelector(".header__nav");
    if (!menuBtn || !navbar) return;

    menuBtn.setAttribute("aria-expanded", "false");

    const closeMobileMenu = () => {
        navbar.classList.remove("active");
        menuBtn.classList.remove("fa-xmark", "is-open");
        menuBtn.classList.add("fa-bars");
        menuBtn.setAttribute("aria-expanded", "false");
    };

    menuBtn.addEventListener("click", () => {
        navbar.classList.toggle("active");
        menuBtn.classList.toggle("fa-bars");
        menuBtn.classList.toggle("fa-xmark");
        menuBtn.classList.toggle("is-open");
        menuBtn.setAttribute("aria-expanded", String(navbar.classList.contains("active")));
    });

    addClickListener(".header__nav .header__link", () => {
        if (window.innerWidth <= MOBILE_BREAKPOINT) closeMobileMenu();
    });

    window.addEventListener("resize", () => {
        if (window.innerWidth > MOBILE_BREAKPOINT) closeMobileMenu();
    });
}

export function setActiveNavLink() {
    const navLinks = document.querySelectorAll(".header .header__link[data-page]");
    if (!navLinks.length) return;

    const currentPage = resolveCurrentPage(window.location.pathname);

    navLinks.forEach((link) => {
        const isActive = link.dataset.page === currentPage;
        link.classList.toggle("header__link--active", isActive);
        link.classList.toggle("header__link--cta", isActive);
        if (isActive) link.setAttribute("aria-current", "page");
        else link.removeAttribute("aria-current");
    });
}
