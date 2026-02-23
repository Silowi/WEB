const PAGES_SEGMENT = "/pages/";

export const addClickListener = (selector, handler) => {
    document.querySelectorAll(selector).forEach((element) => {
        element.addEventListener("click", handler);
    });
};

export const isPagesPath = (pathname = window.location.pathname) =>
    pathname.toLowerCase().includes(PAGES_SEGMENT);

export const getAssetPrefix = (pathname = window.location.pathname) =>
    isPagesPath(pathname) ? "../" : "";
