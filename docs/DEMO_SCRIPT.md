# Three-minute demo script

## 0:00–0:25 — Problem

“Codex can produce a working patch in minutes. The bottleneck is now proof: reviewers need to know what changed, what can break, and what evidence makes it safe to ship. Gatekeeper turns an AI-written diff into that evidence.”

Show the hero and the live case-file selector.

## 0:25–1:05 — Risk map

Open **Auth shortcut**. Point out the 2-file change surface, blocked release verdict, and change topology. Open the first finding and explain that Gatekeeper binds a stable rule to the exact caller-controlled role line. Mention that analysis happens locally.

Switch to **Annotated diff** to show that the product parses real hunk and line coordinates rather than displaying canned alert cards.

## 1:05–1:40 — Adversarial proof

Return to **Findings** and click **Run proof suite**. Explain that each detected risk becomes a hostile behavioral claim: forge the admin role, replay a foreign-audience token, or reject disabled security tests.

Show the failed proof results and blocked verdict.

## 1:40–2:05 — The safe path

Select **Safe refactor**. Show the 98 trust score and ship verdict. Emphasize that “no blocker” does not mean “trust me”: Gatekeeper still derives a boundary verification contract.

## 2:05–2:30 — Portable evidence

Open **Release receipt**. Copy or download the Markdown receipt. Point out the deterministic fingerprint and explain that the same patch always produces the same evidence package for humans and CI.

## 2:30–2:50 — Real input

Click **Analyze a diff**, briefly show the built-in unified diff, and explain that judges can paste any patch without connecting a repository or sharing source.

## 2:50–3:00 — Codex

“Gatekeeper itself was researched, designed, implemented, tested, documented, and deployed in one Codex + GPT-5.6 session. Codex let me spend the week’s compressed build window on the core product decision: AI should not lower the bar for trust; it should make the evidence impossible to ignore.”
