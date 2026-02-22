const EMAIL_ADDRESS = "drukkerij.devlieghere@skynet.be";

const SPONSOR_IMAGES = [
    "img/Sponser2.jpg",
    "img/Sponser4.png",
    "img/Sponser5.JPG",
    "img/Sponser6.jpg"
];

const getAssetPrefix = () =>
    window.location.pathname.toLowerCase().includes("/pages/") ? "../" : "";

export function renderSharedFooter() {
    const footer = document.querySelector("footer.footer");
    if (!footer) return;

    const assetPrefix = getAssetPrefix();
    footer.innerHTML = `
        <div class="sponsors">
            <h2>Onze Sponsors</h2>
            <div class="sponsor-grid">
                ${SPONSOR_IMAGES.map((src, index) => `<a class="sponsor" href="#"><img src="${assetPrefix}${src}" alt="Sponsor ${index + 1}"></a>`).join("")}
            </div>
        </div>
        <div class="footer-contact">
            <div class="footer-brand">
                <img src="${assetPrefix}img/favicon.png" alt="KVK Ettelgem logo" class="footer-logo">
                <h3>KVK Ettelgem</h3>
            </div>
            <p>
                Locatie:<br>
                Vijfwegstraat 34-35<br>
                8460 Ettelgem (Oudenburg)
            </p>
            <a class="contact-mail" href="mailto:${EMAIL_ADDRESS}">${EMAIL_ADDRESS}</a>
        </div>
        <div class="footer-socials-col">
            <h3>Volg ons</h3>
            <div class="footer-socials" aria-label="Social media links">
                <a href="#" aria-label="Facebook"><i class="fab fa-facebook-f"></i></a>
                <a href="#" aria-label="Instagram"><i class="fab fa-instagram"></i></a>
                <a href="mailto:${EMAIL_ADDRESS}" aria-label="E-mail"><i class="fas fa-envelope"></i></a>
            </div>
        </div>
        <div class="footer-bottom">
            <p>&copy; 2026 KVK Ettelgem - Alle rechten voorbehouden</p>
        </div>
    `;
}
