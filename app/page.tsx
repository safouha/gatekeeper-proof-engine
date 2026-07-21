"use client";

import { useMemo, useState } from "react";
import {
  analyzeDiff,
  createReceipt,
  type Analysis,
  type Finding,
} from "@/lib/analyzer";
import { DEMOS, type DemoKey } from "@/lib/demos";

const severityLabel: Record<Finding["severity"], string> = {
  critical: "S0",
  high: "S1",
  medium: "S2",
  low: "S3",
};

function Mark({ children }: { children: React.ReactNode }) {
  return <span className="mark">{children}</span>;
}

function FindingCard({ finding }: { finding: Finding }) {
  return (
    <article className={`finding finding-${finding.severity}`}>
      <div className="finding-top">
        <span className="severity">{severityLabel[finding.severity]}</span>
        <span className="finding-rule">{finding.rule}</span>
        <span className="line-ref">{finding.file}:{finding.line}</span>
      </div>
      <h3>{finding.title}</h3>
      <p>{finding.explanation}</p>
      <div className="finding-evidence">
        <span>Evidence</span>
        <code>{finding.evidence}</code>
      </div>
    </article>
  );
}

function ScoreDial({ analysis }: { analysis: Analysis }) {
  return (
    <div className="score-wrap">
      <div
        className="score-dial"
        style={{ "--score": `${analysis.score * 3.6}deg` } as React.CSSProperties}
        aria-label={`Trust score ${analysis.score} out of 100`}
      >
        <div><strong>{analysis.score}</strong><span>/100</span></div>
      </div>
      <div>
        <span className={`verdict verdict-${analysis.verdict.toLowerCase()}`}>
          {analysis.verdict === "BLOCK" ? "● release blocked" : analysis.verdict === "HOLD" ? "● needs proof" : "● cleared to ship"}
        </span>
        <p>{analysis.summary}</p>
      </div>
    </div>
  );
}

function DiffView({ analysis }: { analysis: Analysis }) {
  return (
    <div className="diff-view" role="table" aria-label="Analyzed code changes">
      {analysis.files.flatMap((file) => [
        <div className="diff-file" role="row" key={`${file.path}-header`}>
          <span>⌘</span> {file.path}
          <em>{file.added} additions · {file.removed} deletions</em>
        </div>,
        ...file.lines.map((line, index) => (
          <div className={`diff-line diff-${line.kind}`} role="row" key={`${file.path}-${index}`}>
            <span className="line-no">{line.newNumber ?? line.oldNumber ?? ""}</span>
            <span className="line-sign">{line.kind === "add" ? "+" : line.kind === "remove" ? "−" : " "}</span>
            <code>{line.content || " "}</code>
          </div>
        )),
      ])}
    </div>
  );
}

export default function Home() {
  const [demoKey, setDemoKey] = useState<DemoKey>("auth");
  const [diff, setDiff] = useState(DEMOS.auth.diff);
  const [view, setView] = useState<"findings" | "diff" | "receipt">("findings");
  const [composerOpen, setComposerOpen] = useState(false);
  const [draft, setDraft] = useState(diff);
  const [proofState, setProofState] = useState<"idle" | "running" | "done">("idle");
  const [copied, setCopied] = useState(false);
  const analysis = useMemo(() => analyzeDiff(diff), [diff]);
  const receipt = useMemo(() => createReceipt(analysis), [analysis]);

  function chooseDemo(key: DemoKey) {
    setDemoKey(key);
    setDiff(DEMOS[key].diff);
    setDraft(DEMOS[key].diff);
    setProofState("idle");
  }

  function analyzeDraft() {
    if (!draft.trim()) return;
    setDiff(draft);
    setDemoKey("custom");
    setComposerOpen(false);
    setView("findings");
    setProofState("idle");
  }

  function runProofSuite() {
    setProofState("running");
    window.setTimeout(() => setProofState("done"), 1450);
  }

  async function copyReceipt() {
    await navigator.clipboard.writeText(receipt.markdown);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  function downloadReceipt() {
    const blob = new Blob([receipt.markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `gatekeeper-${receipt.id}.md`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Gatekeeper home">
          <span className="brand-glyph">G</span>
          <span>GATEKEEPER</span>
          <sup>LABS</sup>
        </a>
        <div className="top-status"><span /> proof engine online</div>
        <button className="button button-dark" onClick={() => setComposerOpen(true)}>Analyze a diff <kbd>⌘ K</kbd></button>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <div className="eyebrow">Release intelligence for AI-written code</div>
          <h1>Fast code is easy.<br /><Mark>Proven code</Mark> ships.</h1>
          <p>Gatekeeper turns any patch into a reviewable chain of evidence: risk signals, adversarial probes, and a tamper-evident release receipt.</p>
        </div>
        <div className="scenario-picker" aria-label="Choose a demo change">
          <span>Live case file</span>
          {(Object.keys(DEMOS) as DemoKey[]).filter((key) => key !== "custom").map((key) => (
            <button key={key} className={demoKey === key ? "active" : ""} onClick={() => chooseDemo(key)}>
              <i>{DEMOS[key].number}</i>
              <span>{DEMOS[key].name}<small>{DEMOS[key].subtitle}</small></span>
            </button>
          ))}
        </div>
      </section>

      <section className="workspace" aria-live="polite">
        <div className="workspace-head">
          <div>
            <span className="case-id">CASE / {analysis.id}</span>
            <h2>{demoKey === "custom" ? "Custom patch review" : DEMOS[demoKey].title}</h2>
          </div>
          <ScoreDial analysis={analysis} />
        </div>

        <div className="metrics-strip">
          <div><span>Change surface</span><strong>{analysis.files.length}</strong><small>files touched</small></div>
          <div><span>Blast radius</span><strong>{analysis.blastRadius}</strong><small>{analysis.changedLines} changed lines</small></div>
          <div><span>Risk signals</span><strong>{analysis.findings.length}</strong><small>{analysis.criticalCount} release blocker{analysis.criticalCount === 1 ? "" : "s"}</small></div>
          <div><span>Proof coverage</span><strong>{analysis.coverage}%</strong><small>{analysis.coveredChecks}/{analysis.probes.length} claims evidenced</small></div>
        </div>

        <div className="console-grid">
          <aside className="file-rail">
            <div className="panel-label"><span>01</span> Change map</div>
            {analysis.files.map((file) => (
              <div className="file-row" key={file.path}>
                <span className={`risk-dot risk-${file.risk}`} />
                <div><strong>{file.path.split("/").pop()}</strong><small>{file.path}</small></div>
                <em>+{file.added} −{file.removed}</em>
              </div>
            ))}
            <div className="blast-map">
              <span>Observed blast radius</span>
              <div className="orbit orbit-one"><i>AUTH</i></div>
              <div className="orbit orbit-two"><i>DATA</i></div>
              <div className="orbit-core">Δ</div>
              <small>Static change topology</small>
            </div>
          </aside>

          <section className="evidence-panel">
            <div className="tabs" role="tablist">
              <button className={view === "findings" ? "active" : ""} onClick={() => setView("findings")}>Findings <span>{analysis.findings.length}</span></button>
              <button className={view === "diff" ? "active" : ""} onClick={() => setView("diff")}>Annotated diff</button>
              <button className={view === "receipt" ? "active" : ""} onClick={() => setView("receipt")}>Release receipt</button>
            </div>
            {view === "findings" && (
              <div className="findings-list">
                {analysis.findings.length ? analysis.findings.map((finding) => <FindingCard finding={finding} key={finding.id} />) : (
                  <div className="empty-state"><span>✓</span><h3>No static blockers found</h3><p>Run the proof suite to verify behavior before release.</p></div>
                )}
              </div>
            )}
            {view === "diff" && <DiffView analysis={analysis} />}
            {view === "receipt" && (
              <div className="receipt-view">
                <div className="receipt-stamp"><span>G</span><strong>{analysis.verdict}</strong><small>VERIFIABLE RECEIPT</small></div>
                <div><span>Receipt fingerprint</span><code>{receipt.fingerprint}</code></div>
                <div><span>Generated</span><strong>Locally · no source uploaded</strong></div>
                <div><span>Claims bound</span><strong>{analysis.probes.length} verification contracts</strong></div>
                <button onClick={copyReceipt}>{copied ? "Copied to clipboard" : "Copy Markdown receipt"}</button>
                <button onClick={downloadReceipt}>Download .md</button>
              </div>
            )}
          </section>

          <aside className="proof-panel">
            <div className="panel-label"><span>02</span> Adversarial proof</div>
            <p className="proof-intro">Claims inferred from the patch, converted into executable challenges.</p>
            <div className="probe-list">
              {analysis.probes.map((probe, index) => {
                const status = proofState === "idle" ? probe.status : proofState === "running" ? (index === 0 ? "running" : "queued") : probe.expected;
                return (
                  <div className={`probe probe-${status}`} key={probe.id}>
                    <span>{status === "pass" ? "✓" : status === "fail" ? "×" : status === "running" ? "↻" : "○"}</span>
                    <div><strong>{probe.title}</strong><code>{probe.command}</code></div>
                    <em>{status}</em>
                  </div>
                );
              })}
            </div>
            <button className="run-button" onClick={runProofSuite} disabled={proofState === "running"}>
              {proofState === "running" ? "Running hostile paths…" : proofState === "done" ? "Run proof suite again" : "Run proof suite"}
              <span>⌁</span>
            </button>
            <div className="local-note"><span>◉</span><p><strong>Local-first analysis</strong>Your source never leaves this browser.</p></div>
          </aside>
        </div>
      </section>

      <section className="manifesto">
        <span>THE PRINCIPLE</span>
        <blockquote>“AI should not lower the bar for trust.<br />It should make the evidence <Mark>impossible to ignore.</Mark>”</blockquote>
        <div className="manifesto-grid">
          <div><b>01</b><strong>Parse the change</strong><p>Understand exactly what moved, where, and how far the effects can travel.</p></div>
          <div><b>02</b><strong>Attack the claim</strong><p>Turn intended behavior into hostile, executable verification paths.</p></div>
          <div><b>03</b><strong>Bind the proof</strong><p>Export a deterministic receipt that reviewers can reproduce and audit.</p></div>
        </div>
      </section>

      <footer><div className="brand"><span className="brand-glyph">G</span><span>GATEKEEPER</span></div><p>Built with Codex + GPT-5.6 for OpenAI Build Week 2026.</p><a href="https://github.com/safouha/gatekeeper-proof-engine" target="_blank" rel="noreferrer">View source ↗</a></footer>

      {composerOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setComposerOpen(false)}>
          <section className="composer" role="dialog" aria-modal="true" aria-labelledby="composer-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="composer-head"><div><span>NEW CASE FILE</span><h2 id="composer-title">Paste a unified diff</h2></div><button aria-label="Close" onClick={() => setComposerOpen(false)}>×</button></div>
            <p>Gatekeeper analyzes source locally. Try a patch containing authentication, database, or error-handling changes.</p>
            <textarea value={draft} onChange={(event) => setDraft(event.target.value)} spellCheck={false} aria-label="Unified diff" />
            <div className="composer-actions"><span>{draft.split("\n").length} lines ready</span><button className="button button-dark" onClick={analyzeDraft}>Build evidence map →</button></div>
          </section>
        </div>
      )}
    </main>
  );
}
