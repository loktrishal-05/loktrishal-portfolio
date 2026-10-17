const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const { credentialUrl, renderCertificates, loadCertificates } = require("../certificates.js");

class Element {
  constructor(tagName, document) {
    this.tagName = tagName;
    this.ownerDocument = document;
    this.children = [];
    this.attributes = {};
    this.textContent = "";
  }

  appendChild(child) {
    this.children.push(child);
  }

  replaceChildren(child) {
    this.children = child.tagName === "fragment" ? child.children : [child];
  }

  setAttribute(name, value) {
    this.attributes[name] = value;
  }
}

function container() {
  const document = {
    createElement: (name) => new Element(name, document),
    createDocumentFragment: () => new Element("fragment", document),
  };
  return document.createElement("div");
}

test("preserves all three existing labels from JSON", () => {
  const entries = JSON.parse(fs.readFileSync(path.join(__dirname, "../data/certificates.json"), "utf8"));
  const target = container();
  assert.equal(renderCertificates(target, entries), 3);
  assert.ok(target.children.every((row) => row.attributes.role === "listitem"));
  assert.deepEqual(target.children.map((row) => row.children[0].textContent), [
    "Power BI — Data Visualization (Certified)",
    "Data Science Training Program",
    "Analytics & Tech Skill Development",
  ]);
});

test("adds reviewed PA fields and safe credential links", () => {
  const target = container();
  renderCertificates(target, [{
    title: "Python", issuer: "Test Academy", date: "2025-09-20",
    credential_url: "https://example.com/verify", needs_review: false,
  }]);
  const label = target.children[0].children[0];
  assert.equal(label.textContent, "Python — Test Academy (2025-09-20)");
  assert.equal(label.tagName, "a");
  assert.equal(label.rel, "noopener noreferrer");
});

test("does not execute markup or render pending review records", () => {
  const target = container();
  const title = '<img src=x onerror="alert(1)">';
  assert.equal(renderCertificates(target, [
    { title, credential_url: "javascript:alert(1)" },
    { title: "Pending", needs_review: true },
    null, {}, { title: " " },
  ]), 1);
  assert.equal(target.children[0].children[0].textContent, title);
  assert.equal(target.children[0].children[0].tagName, "span");
});

test("rejects unsafe and malformed credential URLs", () => {
  for (const url of [null, "javascript:alert(1)", "data:text/html,unsafe", "https://[", "https://user:pass@example.com/"]) {
    assert.equal(credentialUrl(url), null);
  }
  assert.equal(credentialUrl("https://example.com/verify"), "https://example.com/verify");
});

test("omits invalid dates and shows an empty state", () => {
  const target = container();
  renderCertificates(target, [{ title: "Course", date: "2025-02-30" }]);
  assert.equal(target.children[0].children[0].textContent, "Course");
  renderCertificates(target, []);
  assert.equal(target.children[0].textContent, "No certifications listed yet.");
  assert.throws(() => renderCertificates(target, {}), TypeError);
});

test("fetches JSON and clears its busy state", async () => {
  const target = container();
  await loadCertificates(target, async (url) => {
    assert.equal(url, "/data/certificates.json");
    return { ok: true, json: async () => [{ title: "Loaded from JSON" }] };
  });
  assert.equal(target.children[0].children[0].textContent, "Loaded from JSON");
  assert.equal(target.attributes["aria-busy"], "false");
});

test("handles network, HTTP, malformed JSON, and invalid shape failures", async () => {
  const failures = [
    async () => { throw new Error("offline"); },
    async () => ({ ok: false }),
    async () => ({ ok: true, json: async () => { throw new SyntaxError("invalid JSON"); } }),
    async () => ({ ok: true, json: async () => ({}) }),
  ];
  for (const fetcher of failures) {
    const target = container();
    await loadCertificates(target, fetcher);
    assert.equal(target.children[0].textContent, "Certifications are temporarily unavailable.");
    assert.equal(target.attributes["aria-busy"], "false");
  }
});

test("Vercel serves assets before the page fallback and cannot deploy this PR branch", () => {
  const config = JSON.parse(fs.readFileSync(path.join(__dirname, "../vercel.json"), "utf8"));
  assert.equal(config.git.deploymentEnabled["pa/json-certificates"], false);
  assert.deepEqual(config.routes[0], { handle: "filesystem" });
  assert.ok(config.builds.some((entry) => entry.src === "data/certificates.json"));
  assert.ok(config.builds.some((entry) => entry.src === "certificates.js"));
});
