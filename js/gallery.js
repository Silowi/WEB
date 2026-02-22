import { addClickListener } from "./utils.js";

/**
 * Gallery lightbox en filtering functionaliteit
 * Handelt foto filtering en lightbox navigatie af
 */

let currentImageIndex = 0;
let visibleImages = [];

function getVisibleGalleryItems() {
    return Array.from(document.querySelectorAll(".gallery-item:not(.hidden)"));
}

/**
 * Filter galerij items op categorie
 */
function filterGallery(category) {
    const items = document.querySelectorAll(".gallery-item");
    const emptyState = document.querySelector(".gallery-empty");
    let hasVisibleItems = false;

    items.forEach((item) => {
        const itemCategory = item.dataset.category;
        
        if (category === "all" || itemCategory === category) {
            item.classList.remove("hidden");
            hasVisibleItems = true;
        } else {
            item.classList.add("hidden");
        }
    });

    if (emptyState) {
        emptyState.classList.toggle("hidden", hasVisibleItems);
    }

    updateVisibleImages();
}

/**
 * Update de lijst van zichtbare afbeeldingen
 */
function updateVisibleImages() {
    visibleImages = getVisibleGalleryItems()
        .map((item) => {
            const image = item.querySelector("img");
            if (!image) return null;

            return {
                src: image.src,
                alt: image.alt,
                caption: item.querySelector(".gallery-overlay p")?.textContent ?? ""
            };
        })
        .filter(Boolean);
}

/**
 * Open lightbox met specifieke afbeelding
 */
function openLightbox(index) {
    const lightbox = document.getElementById("lightbox");
    const lightboxImg = document.getElementById("lightbox-img");
    const lightboxCaption = document.getElementById("lightbox-caption");

    if (!lightbox || !lightboxImg || !lightboxCaption || !visibleImages.length) return;

    currentImageIndex = index;
    const image = visibleImages[currentImageIndex];

    lightboxImg.src = image.src;
    lightboxImg.alt = image.alt;
    lightboxCaption.textContent = image.caption;

    lightbox.classList.add("active");
    document.body.style.overflow = "hidden"; // Voorkom scrollen achter lightbox
}

/**
 * Sluit lightbox
 */
function closeLightbox() {
    const lightbox = document.getElementById("lightbox");
    if (!lightbox) return;

    lightbox.classList.remove("active");
    document.body.style.overflow = ""; // Herstel scrollen
}

/**
 * Toon vorige afbeelding in lightbox
 */
function showPreviousImage() {
    if (!visibleImages.length) return;
    currentImageIndex = (currentImageIndex - 1 + visibleImages.length) % visibleImages.length;
    openLightbox(currentImageIndex);
}

/**
 * Toon volgende afbeelding in lightbox
 */
function showNextImage() {
    if (!visibleImages.length) return;
    currentImageIndex = (currentImageIndex + 1) % visibleImages.length;
    openLightbox(currentImageIndex);
}

/**
 * Initialiseer galerij functionaliteit
 */
export function initGallery() {
    const gallerySection = document.querySelector(".gallery-section");
    if (!gallerySection) return;

    updateVisibleImages();

    const filterButtons = document.querySelectorAll(".filter-btn");
    filterButtons.forEach((button) => {
        button.addEventListener("click", () => {
            filterButtons.forEach((btn) => btn.classList.remove("active"));
            button.classList.add("active");

            filterGallery(button.dataset.filter || "all");
        });
    });

    addClickListener(".gallery-item", (event) => {
        const item = event.currentTarget;
        const index = getVisibleGalleryItems().indexOf(item);
        if (index !== -1) openLightbox(index);
    });

    const lightboxClose = document.querySelector(".lightbox-close");
    const lightboxPrev = document.querySelector(".lightbox-prev");
    const lightboxNext = document.querySelector(".lightbox-next");
    const lightbox = document.getElementById("lightbox");

    if (lightboxClose) {
        lightboxClose.addEventListener("click", closeLightbox);
    }

    if (lightboxPrev) {
        lightboxPrev.addEventListener("click", (e) => {
            e.stopPropagation();
            showPreviousImage();
        });
    }

    if (lightboxNext) {
        lightboxNext.addEventListener("click", (e) => {
            e.stopPropagation();
            showNextImage();
        });
    }

    if (lightbox) {
        lightbox.addEventListener("click", (event) => {
            if (event.target === lightbox) {
                closeLightbox();
            }
        });
    }

    document.addEventListener("keydown", (event) => {
        if (!lightbox || !lightbox.classList.contains("active")) return;

        switch (event.key) {
            case "Escape":
                closeLightbox();
                break;
            case "ArrowLeft":
                showPreviousImage();
                break;
            case "ArrowRight":
                showNextImage();
                break;
        }
    });
}
