# Devpost submission copy

## Project name

Gatekeeper

## Tagline

Fast code is easy. Proven code ships.

## Category

Developer Tools

## Links

- Live demo: https://gatekeeper-proof-engine.safouha.chatgpt.site
- Public repository: https://github.com/safouha/gatekeeper-proof-engine

## Inspiration

Codex has changed the economics of writing code, but code review still scales with human attention. As AI-generated changes become larger and more frequent, teams need something more useful than another opaque “AI confidence score.” They need visible, reproducible evidence that a change deserves to ship.

## What it does

Gatekeeper is a local-first release intelligence tool for AI-written patches. Paste a unified diff and it parses the real file and hunk structure, identifies trust-boundary changes, shows exact line-level evidence, calculates blast radius, and converts each risky claim into an adversarial verification command. It then produces a clear release verdict and a deterministic Markdown receipt that can travel with the change into review or CI.

The demo includes an authorization regression, a payment retry race, and a safe refactor. Judges can also paste any patch of their own. Source never leaves the browser.

## How we built it

Gatekeeper is a Cloudflare-compatible Next.js/vinext application built with Codex and GPT-5.6. The analysis core is a typed deterministic engine that parses unified diffs, evaluates transparent evidence rules, calculates severity-weighted scores, derives hostile probes, and fingerprints release receipts. The interface presents the same analysis as a file risk map, annotated diff, proof console, and exportable receipt.

The application was researched, designed, implemented, tested, documented, and deployed in one concentrated Codex session. Codex also helped compare architectural options. We deliberately chose deterministic release decisions over runtime model calls because release evidence should be private, fast, testable, and reproducible.

## Challenges

The hardest design problem was avoiding two weak extremes: a generic static-analysis dashboard and an opaque AI reviewer. The product needed to be immediately demoable while making a credible architectural argument. Binding every verdict to an exact evidence line, stable rule, failure explanation, and hostile probe created that bridge.

## Accomplishments

- A real unified-diff parser with hunk-aware line coordinates.
- Explainable trust-boundary findings across auth, data, money, failure handling, secrets, and tests.
- Deterministic case IDs and release-receipt fingerprints.
- Interactive proof-suite simulation and Markdown export.
- Three polished, realistic case files plus arbitrary pasted input.
- Fully local browser analysis with no keys or accounts required.
- Responsive, coherent product experience and production deployment.

## What we learned

AI-generated code does not only need more tests; it needs a better unit of trust. A portable evidence receipt is a more useful review primitive than a score because it makes the assumptions, risks, and remaining work explicit.

## What's next

Next we would add AST and data-flow adapters, repository dependency graphs, isolated probe execution, GitHub Checks annotations, cryptographically signed receipts, and organization-specific invariants learned from incidents and runbooks.

## Codex session ID

`019f8693-7d3a-7a20-9749-7f6369247919`
