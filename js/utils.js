export const addClickListener = (selector, fn) => {
    document.querySelectorAll(selector).forEach((element) => {
        element.addEventListener("click", fn);
    });
};
