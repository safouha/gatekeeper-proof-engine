export type Severity = "critical" | "high" | "medium" | "low";
export type LineKind = "add" | "remove" | "context";

export type DiffLine = { kind: LineKind; content: string; oldNumber: number | null; newNumber: number | null };
export type AnalyzedFile = { path: string; added: number; removed: number; risk: Severity; lines: DiffLine[] };
export type Finding = { id: string; rule: string; title: string; explanation: string; evidence: string; file: string; line: number; severity: Severity };
export type Probe = { id: string; title: string; command: string; status: "queued"; expected: "pass" | "fail" };
export type Analysis = {
  id: string; score: number; verdict: "BLOCK" | "HOLD" | "SHIP"; summary: string; files: AnalyzedFile[];
  findings: Finding[]; probes: Probe[]; changedLines: number; blastRadius: "NARROW" | "MODERATE" | "WIDE";
  coverage: number; coveredChecks: number; criticalCount: number;
};

type Rule = Omit<Finding, "id" | "file" | "line" | "evidence"> & { pattern: RegExp; probe: Omit<Probe, "id" | "status"> };

const RULES: Rule[] = [
  {
    rule: "AUTH-04", severity: "critical", pattern: /(?:role|permission|isAdmin).*(?:body|params|query)|(?:body|params|query).*(?:role|permission|isAdmin)/i,
    title: "Authorization trusts caller-controlled input",
    explanation: "The new path derives privilege from request data. An attacker can self-assign authority before the protected action runs.",
    probe: { title: "Forge an administrator claim", command: "gate test --as guest --inject role=admin", expected: "fail" },
  },
  {
    rule: "AUTH-07", severity: "high", pattern: /verify\s*\([^,)]*\)|jwt\.decode|decodeToken/i,
    title: "Token verification loses its policy boundary",
    explanation: "The changed token path does not visibly bind issuer, audience, or algorithm policy. A syntactically valid token may be treated as trusted.",
    probe: { title: "Replay a token with a foreign audience", command: "gate test --fixture token.foreign-aud", expected: "fail" },
  },
  {
    rule: "DATA-03", severity: "critical", pattern: /(?:delete|update|insert|execute|query)\s*\([^)]*\$\{|(?:WHERE|SELECT|DELETE|UPDATE).*(?:\+|\$\{)/i,
    title: "Data query is assembled dynamically",
    explanation: "User-derived values appear inside a query string. Parameter binding is no longer evident at the change boundary.",
    probe: { title: "Inject a destructive query fragment", command: "gate test --fuzz sql-injection --budget 250", expected: "fail" },
  },
  {
    rule: "FLOW-02", severity: "high", pattern: /catch\s*\([^)]*\)\s*\{?\s*(?:return|console\.(?:log|warn))?/i,
    title: "Failure path may be converted into success",
    explanation: "The changed exception path suppresses or normalizes a failure, making upstream systems unable to distinguish a partial operation.",
    probe: { title: "Interrupt the dependency mid-operation", command: "gate test --fault network:reset@write", expected: "fail" },
  },
  {
    rule: "MONEY-01", severity: "high", pattern: /(?:charge|payment|transfer|refund|capture)\s*\(/i,
    title: "Money movement has no visible idempotency guard",
    explanation: "A retried request can cross a financial side-effect boundary. The patch does not show a stable idempotency key or duplicate check.",
    probe: { title: "Replay the same payment concurrently", command: "gate test --replay 12 --concurrency 4", expected: "fail" },
  },
  {
    rule: "TEST-09", severity: "medium", pattern: /(?:\.skip\(|xit\(|xdescribe\(|test\.only\(|it\.only\()/i,
    title: "Test coverage is selectively disabled",
    explanation: "The patch changes test execution controls, which can hide regressions while leaving the suite apparently green.",
    probe: { title: "Reject focused or skipped tests", command: "gate lint --deny test-exclusions", expected: "fail" },
  },
  {
    rule: "SECRET-01", severity: "critical", pattern: /(?:api[_-]?key|secret|token|password)\s*[:=]\s*["'][^"']{8,}/i,
    title: "Credential-like value enters source control",
    explanation: "A high-entropy secret-shaped literal appears in an added line and should be rotated even if the patch is not merged.",
    probe: { title: "Scan history for secret material", command: "gate scan --entropy --include-history", expected: "fail" },
  },
];

const severityWeight: Record<Severity, number> = { critical: 30, high: 18, medium: 10, low: 4 };
const riskRank: Record<Severity, number> = { critical: 4, high: 3, medium: 2, low: 1 };

function hash(input: string) {
  let value = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    value ^= input.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return (value >>> 0).toString(16).padStart(8, "0").toUpperCase();
}

export function analyzeDiff(diff: string): Analysis {
  const sourceLines = diff.replace(/\r/g, "").split("\n");
  const files: AnalyzedFile[] = [];
  let current: AnalyzedFile | null = null;
  let oldLine = 0;
  let newLine = 0;

  for (const raw of sourceLines) {
    if (raw.startsWith("+++ ")) {
      const path = raw.slice(4).replace(/^b\//, "").trim();
      if (path !== "/dev/null") {
        current = { path, added: 0, removed: 0, risk: "low", lines: [] };
        files.push(current);
      }
      continue;
    }
    const hunk = raw.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (hunk) {
      oldLine = Number(hunk[1]);
      newLine = Number(hunk[2]);
      continue;
    }
    if (!current || raw.startsWith("--- ") || raw.startsWith("diff --git") || raw.startsWith("index ")) continue;
    if (raw.startsWith("+")) {
      current.added += 1;
      current.lines.push({ kind: "add", content: raw.slice(1), oldNumber: null, newNumber: newLine++ });
    } else if (raw.startsWith("-")) {
      current.removed += 1;
      current.lines.push({ kind: "remove", content: raw.slice(1), oldNumber: oldLine++, newNumber: null });
    } else if (raw.startsWith(" ")) {
      current.lines.push({ kind: "context", content: raw.slice(1), oldNumber: oldLine++, newNumber: newLine++ });
    }
  }

  if (files.length === 0 && diff.trim()) {
    current = { path: "pasted-change.txt", added: sourceLines.length, removed: 0, risk: "low", lines: sourceLines.map((line, i) => ({ kind: "add", content: line, oldNumber: null, newNumber: i + 1 })) };
    files.push(current);
  }

  const findings: Finding[] = [];
  for (const file of files) {
    for (const line of file.lines.filter((candidate) => candidate.kind === "add")) {
      for (const rule of RULES) {
        rule.pattern.lastIndex = 0;
        if (rule.pattern.test(line.content)) {
          const finding: Finding = {
            id: `${rule.rule}-${file.path}-${line.newNumber}`,
            rule: rule.rule,
            title: rule.title,
            explanation: rule.explanation,
            severity: rule.severity,
            evidence: line.content.trim().slice(0, 112),
            file: file.path,
            line: line.newNumber ?? 0,
          };
          if (!findings.some((existing) => existing.rule === finding.rule && existing.file === finding.file)) findings.push(finding);
        }
      }
    }
  }

  for (const file of files) {
    const fileFindings = findings.filter((finding) => finding.file === file.path);
    file.risk = fileFindings.reduce<Severity>((highest, finding) => riskRank[finding.severity] > riskRank[highest] ? finding.severity : highest, "low");
  }

  const probes = findings.slice(0, 5).map((finding, index) => {
    const rule = RULES.find((candidate) => candidate.rule === finding.rule)!;
    return { id: `P-${String(index + 1).padStart(2, "0")}`, ...rule.probe, status: "queued" as const };
  });
  if (probes.length === 0) probes.push({ id: "P-01", title: "Exercise changed behavior at its boundary", command: "gate test --derive-boundaries", status: "queued", expected: "pass" });

  const changedLines = files.reduce((total, file) => total + file.added + file.removed, 0);
  const penalty = findings.reduce((total, finding) => total + severityWeight[finding.severity], 0);
  const coverage = Math.max(18, Math.min(96, 92 - findings.filter((finding) => finding.severity === "critical").length * 19 - findings.filter((finding) => finding.severity === "high").length * 8));
  const score = Math.max(7, Math.min(98, 98 - penalty - Math.max(0, files.length - 3) * 3));
  const criticalCount = findings.filter((finding) => finding.severity === "critical").length;
  const verdict = criticalCount > 0 ? "BLOCK" : findings.some((finding) => finding.severity === "high") ? "HOLD" : "SHIP";
  const blastRadius = files.length >= 4 || changedLines > 80 ? "WIDE" : files.length >= 2 || changedLines > 30 ? "MODERATE" : "NARROW";
  const id = `${hash(diff).slice(0, 4)}-${String(files.length).padStart(2, "0")}`;
  return {
    id, score, verdict, files, findings, probes, changedLines, blastRadius, coverage,
    coveredChecks: Math.round((coverage / 100) * probes.length), criticalCount,
    summary: verdict === "BLOCK" ? `${criticalCount} trust boundary ${criticalCount === 1 ? "change requires" : "changes require"} human review.` : verdict === "HOLD" ? "Risk is bounded, but the proof set is incomplete." : "No static release blockers detected in this patch.",
  };
}

export function createReceipt(analysis: Analysis) {
  const claims = analysis.probes.map((probe) => `- [ ] ${probe.title} — \`${probe.command}\``).join("\n");
  const risks = analysis.findings.length ? analysis.findings.map((finding) => `- **${finding.rule} ${finding.severity.toUpperCase()}** ${finding.title} (${finding.file}:${finding.line})`).join("\n") : "- No static blockers detected";
  const body = `# Gatekeeper Release Receipt ${analysis.id}\n\n**Verdict:** ${analysis.verdict}\n**Trust score:** ${analysis.score}/100\n**Change surface:** ${analysis.files.length} files, ${analysis.changedLines} lines\n**Proof coverage:** ${analysis.coverage}%\n\n## Risk signals\n${risks}\n\n## Verification contract\n${claims}\n`;
  return { id: analysis.id, fingerprint: `GK-${hash(body)}-${hash(analysis.files.map((file) => file.path).join("|"))}`, markdown: `${body}\n---\nGenerated locally by Gatekeeper. Receipt fingerprint: GK-${hash(body)}\n` };
}
