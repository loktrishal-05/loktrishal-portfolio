# Certificates

The About section reads `data/certificates.json`. The page layout, fonts, colors,
and existing three labels are preserved. The labels were migrated verbatim from
the original page; they have not been independently verified. No issuer, date,
credential URL, or new qualification was invented.

## Data format

The public file is an array of objects. Each object needs `title`; optional
fields are `issuer`, `date` (`YYYY-MM-DD`), and `credential_url` (HTTP/HTTPS).
Unknown optional values can be omitted or `null`. `needs_review: true` entries
are never shown. Unsafe links are rendered as plain text. Text is inserted with
`textContent`, not HTML. Empty data and failed requests have visible messages.

For the personal-assistant workflow, keep JSON Resume and the private certificate
registry in the PA repo as the canonical sources. After checking an original
certificate and reviewing its draft, copy only its public fields into this
derived JSON file on a new branch. Never copy inbox files, original PDFs,
private local `file` paths, secrets, or unreviewed drafts into this public repo.
The existing labels remain until the owner replaces them with verified records.
This change does not edit PA status flags or silently remove existing claims.

## Preview and tests

From this checkout, start a local-only preview:

```bash
python -m http.server 8765 --bind 127.0.0.1
```

Open <http://127.0.0.1:8765/#about>. Opening `index.html` directly as a `file://`
URL is not supported because browsers restrict fetching local JSON.

Run dependency-free renderer tests with Node.js 18 or later:

```bash
node --test tests/certificates.test.cjs
```

Vercel's explicit static builds include both the script and the JSON file.
The filesystem route serves these assets before the existing page fallback,
so a JSON request does not accidentally receive `index.html`.

## No deployment in this phase

`git.deploymentEnabled["pa/json-certificates"]` is `false` in `vercel.json`.
This disables automatic Vercel deployments for this PR branch; the production
branch is not changed. Preview locally. Do not merge, deploy, or remove this
branch guard without owner approval. See the official configuration reference:
<https://vercel.com/docs/project-configuration/git-configuration>.
