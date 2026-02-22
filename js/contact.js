/**
 * Contact formulier validatie en verzending
 * Handelt client-side validatie en AJAX submission af
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_MESSAGE_LENGTH = 10;

/**
 * Valideer een enkel formulierveld
 */
function validateField(field) {
    const formGroup = field.closest(".form-group");
    if (!formGroup) return true;

    const errorMessage = formGroup.querySelector(".error-message");
    const value = field.value.trim();
    let error = "";

    if (!value) {
        error = "Dit veld is verplicht";
    } else if (field.type === "email" && !EMAIL_REGEX.test(value)) {
        error = "Voer een geldig e-mailadres in";
    } else if (field.name === "message" && value.length < MIN_MESSAGE_LENGTH) {
        error = `Bericht moet minimaal ${MIN_MESSAGE_LENGTH} karakters bevatten`;
    } else if (field.name === "name" && value.length < 2) {
        error = "Naam moet minimaal 2 karakters bevatten";
    }

    if (error) {
        formGroup.classList.add("error");
        if (errorMessage) errorMessage.textContent = error;
        return false;
    }

    formGroup.classList.remove("error");
    if (errorMessage) errorMessage.textContent = "";
    return true;
}

/**
 * Valideer alle formuliervelden
 */
function validateForm(form) {
    const fields = form.querySelectorAll("input[required], textarea[required]");
    let isValid = true;

    fields.forEach((field) => {
        if (!validateField(field)) {
            isValid = false;
        }
    });

    return isValid;
}

/**
 * Toon formulier bericht (success of error)
 */
function showFormMessage(form, message, type) {
    const messageEl = form.querySelector(".form-message");
    if (!messageEl) return;

    messageEl.textContent = message;
    messageEl.classList.remove("success", "error", "is-hidden");
    messageEl.classList.add(type);

    // Scroll naar bericht
    messageEl.scrollIntoView({ behavior: "smooth", block: "nearest" });

    // Verberg na 8 seconden
    setTimeout(() => {
        messageEl.classList.add("is-hidden");
    }, 8000);
}

/**
 * Toggle submit button loading state
 */
function setSubmitLoading(button, isLoading) {
    if (!button) return;

    const btnText = button.querySelector(".btn-text");
    const btnLoading = button.querySelector(".btn-loading");

    if (isLoading) {
        if (btnText) btnText.classList.add("is-hidden");
        if (btnLoading) btnLoading.classList.remove("is-hidden");
        button.disabled = true;
    } else {
        if (btnText) btnText.classList.remove("is-hidden");
        if (btnLoading) btnLoading.classList.add("is-hidden");
        button.disabled = false;
    }
}

/**
 * Verzend formulier via AJAX
 */
async function submitContactForm(form) {
    const formData = new FormData(form);
    const submitButton = form.querySelector(".btn-submit");

    setSubmitLoading(submitButton, true);

    try {
        const response = await fetch(form.action, {
            method: "POST",
            body: formData
        });

        const result = await response.json();

        if (result.success) {
            showFormMessage(
                form,
                "Bedankt! Je bericht is succesvol verzonden. We nemen zo snel mogelijk contact op.",
                "success"
            );
            form.reset();
            // Verwijder alle error classes
            form.querySelectorAll(".form-group").forEach((group) => {
                group.classList.remove("error");
            });
        } else {
            showFormMessage(
                form,
                result.message || "Er is iets misgegaan. Probeer het later opnieuw of mail ons direct.",
                "error"
            );
        }
    } catch (error) {
        console.error("Formulier verzending fout:", error);
        showFormMessage(
            form,
            "Formulier verzending mislukt. Neem direct contact op via drukkerij.devlieghere@skynet.be",
            "error"
        );
    } finally {
        setSubmitLoading(submitButton, false);
    }
}

/**
 * Initialiseer contact formulier
 */
export function initContactForm() {
    const form = document.getElementById("contact-form");
    if (!form) return;

    // Real-time validatie bij blur
    const fields = form.querySelectorAll("input, textarea");
    fields.forEach((field) => {
        field.addEventListener("blur", () => validateField(field));
        
        // Verwijder error bij typen
        field.addEventListener("input", () => {
            const formGroup = field.closest(".form-group");
            if (formGroup?.classList.contains("error")) {
                validateField(field);
            }
        });
    });

    // Formulier submit
    form.addEventListener("submit", (event) => {
        event.preventDefault();

        if (validateForm(form)) {
            submitContactForm(form);
        } else {
            showFormMessage(form, "Vul alle verplichte velden correct in.", "error");
            // Focus eerste foutieve veld
            const firstError = form.querySelector(".form-group.error input, .form-group.error textarea");
            if (firstError) firstError.focus();
        }
    });
}
