# Architecture and design decisions

## Product boundary

Gatekeeper accepts a unified diff and returns an evidence package. It intentionally does not require repository access, an API key, or source upload. That narrow input boundary makes the demo immediate and the privacy claim verifiable.

## Analysis pipeline

1. **Parse** — `analyzeDiff` walks file headers and hunk coordinates, preserving old and new line numbers.
2. **Observe** — added lines are evaluated against named, severity-ranked evidence rules.
3. **Explain** — each match binds a rule identifier, exact source line, risk explanation, and file location.
4. **Challenge** — the matched rule selects a hostile verification probe and runnable command shape.
5. **Decide** — explicit severity weights produce the trust score and release verdict.
6. **Bind** — `createReceipt` serializes the case and computes FNV-1a fingerprints over its content and file set.

## Why deterministic analysis

There were two reasonable approaches:

- A model-powered reviewer can understand more semantic context and support more languages immediately, but it is slower, requires source transmission, and can produce different answers for the same release.
- A deterministic evidence engine has a smaller initial rule surface, but every result is explainable, fast, private, cacheable, and reproducible.

Gatekeeper uses the second approach for the release gate. A future semantic model can propose candidate rules or probes, but it should not silently change the final evidence package.

## Explainability contract

Every blocking decision must expose:

- the stable rule identifier;
- the severity;
- the exact changed line;
- a plain-language failure mechanism;
- an adversarial verification command.

If the engine cannot show those five items, the finding should not block release.

## Extension points

- Replace line rules with AST and inter-procedural data-flow adapters.
- Add repository graph context to calculate real downstream blast radius.
- Execute probes in ephemeral containers and attach immutable logs.
- Sign receipts using a CI workload identity.
- Publish GitHub Checks annotations and required-status gates.
- Learn organization-specific invariants from previous incidents and runbooks.

## Threat model

The browser runtime does not transmit pasted patches. Exported receipts contain file paths and evidence excerpts, so users should review them before sharing outside their organization. The current fingerprint is tamper-evident for accidental edits, not a cryptographic signature; production receipts should use SHA-256 plus an authenticated signer.
