const form = document.querySelector("[data-auth-form]");

if (!form) {
  console.error("Revizely auth form was not found.");
} else {
  document.querySelectorAll(".password-toggle").forEach((button) => {
    button.addEventListener("click", () => {
      const input = button.parentElement.querySelector("input");
      if (!input) return;
      const isHidden = input.type === "password";
      input.type = isHidden ? "text" : "password";
      button.textContent = isHidden ? "Hide" : "Show";
      button.setAttribute("aria-label", `${isHidden ? "Hide" : "Show"} password`);
    });
  });

  document.querySelectorAll("[data-provider]").forEach((button) => {
    button.addEventListener("click", async () => {
      setBusy(button, true);
      try {
        const response = await fetch("/api/auth/provider", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ provider: button.dataset.provider })
        });
        const text = await response.text();
        let data = {};
        if (text.trim()) {
          try { data = JSON.parse(text); }
          catch { throw new Error(`Login server returned an invalid response (${response.status}).`); }
        }
        if (!response.ok) throw new Error(data.error || `Login failed (${response.status}).`);
        window.location.href = "../app/index.html";
      } catch (error) {
        showNote(error.message || "Social sign-in is unavailable.");
        setBusy(button, false);
      }
    });
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submit = form.querySelector('[type="submit"]');
    const values = Object.fromEntries(new FormData(form));
    const mode = form.dataset.authForm;
    const endpoint = mode === "signup" ? "/api/auth/signup" : "/api/auth/login";

    setBusy(submit, true);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values)
      });

      const text = await response.text();
      let data = {};
      if (text.trim()) {
        try { data = JSON.parse(text); }
        catch { throw new Error(`Login server returned an invalid response (${response.status}).`); }
      }

      if (!response.ok) throw new Error(data.error || `Login failed (${response.status}).`);

      if (data.requiresConfirmation) {
        showNote(data.message || "Check your email to confirm your account, then log in.");
        setBusy(submit, false);
        return;
      }
      showNote("Opening your workspace...");
      window.location.href = "../app/index.html";
    } catch (error) {
      console.error("Revizely authentication error:", error);
      showNote(error.message || "Something went wrong. Please try again.");
      setBusy(submit, false);
    }
  });

  function setBusy(button, busy) {
    if (!button) return;
    button.disabled = busy;
    button.style.opacity = busy ? "0.65" : "";
    button.style.cursor = busy ? "wait" : "";
  }

  function showNote(message) {
    let note = document.querySelector(".auth-note");
    if (!note) {
      note = document.createElement("p");
      note.className = "auth-note";
      note.setAttribute("role", "status");
      form.insertAdjacentElement("afterend", note);
    }
    note.textContent = message;
  }
}
