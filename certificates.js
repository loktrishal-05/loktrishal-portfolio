(() => {
  "use strict";

  function credentialUrl(value) {
    if (typeof value !== "string") {
      return null;
    }
    try {
      const url = new URL(value);
      if (!["https:", "http:"].includes(url.protocol)) {
        return null;
      }
      if (url.username || url.password) {
        return null;
      }
      return url.href;
    } catch {
      return null;
    }
  }

  function renderCertificates(container, entries) {
    if (!Array.isArray(entries)) {
      throw new TypeError("Certificates must be an array");
    }
    const document = container.ownerDocument;
    const fragment = document.createDocumentFragment();
    let count = 0;

    for (const entry of entries) {
      if (!entry || typeof entry.title !== "string" || !entry.title.trim()) {
        continue;
      }
      // PA extraction drafts stay private until the owner reviews them.
      if (entry.needs_review === true) {
        continue;
      }
      const row = document.createElement("div");
      row.className = "cert-item";
      const url = credentialUrl(entry.credential_url);
      const label = document.createElement(url ? "a" : "span");
      let text = entry.title.trim();
      if (typeof entry.issuer === "string" && entry.issuer.trim()) {
        text += ` — ${entry.issuer.trim()}`;
      }
      if (typeof entry.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(entry.date)) {
        const date = new Date(`${entry.date}T00:00:00Z`);
        if (!Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === entry.date) {
          text += ` (${entry.date})`;
        }
      }
      // External data is always text, never HTML or executable instructions.
      label.textContent = text;
      if (url) {
        label.href = url;
        label.target = "_blank";
        label.rel = "noopener noreferrer";
      }
      row.appendChild(label);
      fragment.appendChild(row);
      count += 1;
    }

    if (count === 0) {
      const row = document.createElement("div");
      row.className = "cert-item";
      row.textContent = "No certifications listed yet.";
      fragment.appendChild(row);
    }
    container.replaceChildren(fragment);
    return count;
  }

  async function loadCertificates(container, fetcher = fetch) {
    container.setAttribute("aria-busy", "true");
    try {
      const response = await fetcher("/data/certificates.json", { cache: "no-cache" });
      if (!response.ok) {
        throw new Error("Certificate request failed");
      }
      renderCertificates(container, await response.json());
    } catch {
      const row = container.ownerDocument.createElement("div");
      row.className = "cert-item";
      row.textContent = "Certifications are temporarily unavailable.";
      container.replaceChildren(row);
    } finally {
      container.setAttribute("aria-busy", "false");
    }
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { credentialUrl, renderCertificates, loadCertificates };
  }
  if (typeof document !== "undefined") {
    const container = document.getElementById("certificate-list");
    if (container) {
      loadCertificates(container);
    }
  }
})();
