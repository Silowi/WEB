const HERO_INTERVAL_MS = 8000;

export function initHeroSlideshow() {
    const slideContainers = document.querySelectorAll(".hero-slides");
    if (!slideContainers.length) return;

    slideContainers.forEach((container) => {
        const heroSlides = container.querySelectorAll(".hero-slide");
        if (!heroSlides.length) return;

        heroSlides.forEach((slide) => {
            const backgroundImage = slide.dataset.bg;
            if (backgroundImage) {
                slide.style.backgroundImage = `url('${backgroundImage}')`;
            }
        });

        let heroIndex = 0;

        const showHeroSlide = (index) =>
            heroSlides.forEach((slide, i) => slide.classList.toggle("active", i === index));

        showHeroSlide(heroIndex);

        if (heroSlides.length > 1) {
            setInterval(() => {
                heroIndex = (heroIndex + 1) % heroSlides.length;
                showHeroSlide(heroIndex);
            }, HERO_INTERVAL_MS);
        }
    });
}
