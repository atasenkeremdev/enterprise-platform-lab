"use client";

import { useState } from "react";
import { scenarios } from "./scenarios";

const formatTime = (value: string) => new Date(value).toLocaleString("en-GB", { timeZone: "UTC", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }) + " UTC";

export default function DemoWorkspace() {
  const [scenarioId, setScenarioId] = useState("application");
  const [onlyGaps, setOnlyGaps] = useState(false);
  const scenario = scenarios.find(item => item.id === scenarioId)!;
  const sample = scenario.record;
  const checks = scenario.checks;
  const visible = checks.filter(check => !onlyGaps || check.missing);
  const gaps = checks.filter(check => check.missing).length;
  return <div className="demo-workspace">
    <section className="scenario-picker" aria-labelledby="scenario-picker-title">
      <div><p className="demo-kicker">Explore responsibility boundaries</p><h2 id="scenario-picker-title">Different teams. Different evidence.</h2><p>Application releases belong to Development; platform and OS changes belong to Infra in these examples. Review remains a separate responsibility.</p></div>
      <div><label htmlFor="scenario-select">Choose a synthetic scenario</label><select id="scenario-select" value={scenarioId} onChange={event => { setScenarioId(event.target.value); setOnlyGaps(false); }}>{scenarios.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></div>
    </section>
    <div className="package-heading">
      <div><p className="demo-kicker">{sample.id} / Revision {sample.revision}</p><h2>{scenario.title}</h2><p>Fictional system: <strong>{sample.change.system}</strong> · Synthetic lab scenario</p></div>
      <div className="package-actions"><span className="demo-badge">Draft · incomplete</span><a className="demo-download" href={`/demo/${scenario.download}`} download={scenario.download}>Download synthetic JSON ↓</a></div>
    </div>
    <nav className="demo-section-nav" aria-label="Evidence package sections"><a href="#change-summary">Overview</a><a href="#evidence-checks">Evidence & gaps</a><a href="#package-review">Review</a></nav>
    <div className="demo-facts" aria-label="Package at a glance"><div><span>Change type</span><strong>Normal change</strong></div><div><span>Evidence references</span><strong>{sample.evidence.length} synthetic example</strong></div><div><span>Open evidence gaps</span><strong>{gaps} in this walkthrough</strong></div><div><span>Review status</span><strong>Not requested</strong></div></div>
    <section className="responsibility-panel" aria-labelledby="responsibility-title">
      <div className="responsibility-heading"><div><p className="demo-kicker">{scenario.environment}</p><h3 id="responsibility-title">Ownership follows the change.</h3></div><span className="owner-team-badge">Accountable team: {scenario.ownerTeam}</span></div>
      <dl className="responsibility-grid"><div><dt>Primary responsibility</dt><dd>{scenario.boundary}</dd></div><div><dt>Supporting responsibility</dt><dd>{scenario.supportingTeam}</dd></div><div><dt>Outside this change</dt><dd>{scenario.excluded}</dd></div><div><dt>Independent approval</dt><dd>Designated independent change reviewer — not the requester or implementer. No reviewer or approval is recorded.</dd></div></dl>
      <p className="demo-small-note">Illustrative team allocation, not a universal organisation model or an access-control policy. Security advises on security impact; Compliance reviews evidence needs. Neither substitutes for the technical owner or independently authorised change approval.</p>
    </section>
    <div className="demo-columns" key={scenario.id}>
      <div className="demo-primary">
        <section className="demo-card" id="change-summary" aria-labelledby="change-summary-title"><p className="demo-kicker">01 / Change context</p><h3 id="change-summary-title">What is changing, and why?</h3><dl className="demo-definition"><div><dt>Purpose</dt><dd>{sample.change.purpose}</dd></div><div><dt>Scope</dt><dd>{sample.change.scope}</dd></div><div><dt>Expected outcome</dt><dd>{sample.change.expectedOutcome}</dd></div><div><dt>Planned window</dt><dd>{formatTime(sample.change.plannedStart)} → {formatTime(sample.change.plannedEnd)}<span className="demo-muted">Illustrative timestamps; not a scheduled operation.</span></dd></div></dl><details className="demo-details"><summary>Risk and fallback plan</summary><dl className="demo-definition"><div><dt>Risk assessment</dt><dd>{sample.change.riskAssessment}</dd></div><div><dt>Fallback plan</dt><dd>{sample.change.fallbackPlan}</dd></div><div><dt>Fallback owner</dt><dd>{sample.change.fallbackOwner}</dd></div></dl><p className="demo-small-note">A written fallback proposal is not proof that recovery has been tested.</p></details></section>
        <section className="demo-card" id="evidence-checks" aria-labelledby="evidence-checks-title"><div className="demo-card-heading"><div><p className="demo-kicker">02 / Evidence readiness</p><h3 id="evidence-checks-title">Make the gaps visible.</h3></div><span className="demo-gap-count">{gaps} gaps</span></div><p className="demo-section-copy">These are illustrative package checks, not a regulatory checklist or compliance score.</p><div className="demo-filters" role="group" aria-label="Filter evidence checks"><button type="button" aria-pressed={!onlyGaps} onClick={() => setOnlyGaps(false)}>All checks</button><button type="button" aria-pressed={onlyGaps} onClick={() => setOnlyGaps(true)}>Gaps only</button></div><p className="demo-result-count" role="status">Showing {visible.length} of {checks.length} illustrative checks</p><ul className="demo-checks">{visible.map(check => <li key={check.id}><details><summary><span className={`check-symbol ${check.missing ? "is-gap" : "is-example"}`} aria-hidden="true">{check.missing ? "!" : "↳"}</span><span className="check-name">{check.title}</span><span className={`check-state ${check.missing ? "is-gap" : "is-example"}`}>{check.state}</span><span className="check-expand" aria-hidden="true">+</span></summary><p>{check.detail}</p><p className="check-responsibility"><strong>Evidence responsibility:</strong> {check.team}</p>{check.id === "change_record" && <div className="demo-provenance"><strong>Example provenance · not a live source</strong><dl><div><dt>Source identifier</dt><dd>{sample.evidence[0].sourceUri}</dd></div><div><dt>Source timestamp</dt><dd>{formatTime(sample.evidence[0].sourceAt)}</dd></div><div><dt>Collection timestamp</dt><dd>{formatTime(sample.evidence[0].collectedAt)}</dd></div><div><dt>Assertion type</dt><dd>Synthetic</dd></div></dl><p>Identifiers are displayed as text. This prototype does not fetch or verify them.</p></div>}</details></li>)}</ul></section>
      </div>
      <aside className="demo-secondary" aria-label="Ownership and review">
        <section className="demo-card"><p className="demo-kicker">Accountability</p><h3>People behind the change</h3><p className="scenario-team-label">Accountable team: <strong>{scenario.ownerTeam}</strong></p><dl className="demo-definition"><div><dt>Accountable owner</dt><dd>{sample.people.owner}</dd></div><div><dt>Requester</dt><dd>{sample.people.requester}</dd></div><div><dt>Implementer</dt><dd>{sample.people.implementer}</dd></div></dl><p className="demo-small-note">Fictional role identifiers. No real identities or organisation are represented. Team labels do not grant access or prove independent review.</p></section>
        <section className="demo-card demo-review" id="package-review" aria-labelledby="package-review-title"><p className="demo-kicker">03 / Review</p><h3 id="package-review-title">Not ready for approval.</h3><p>The package has unresolved evidence gaps and no independent reviewer. There is no approval decision, implementation record, or verified outcome.</p><div className="demo-review-state">No approval actions in this prototype</div><p className="demo-small-note">A future workflow would bind approval to a specific revision and check reviewer independence. Neither is enforced by this read-only screen.</p></section>
        <section className="demo-card demo-next"><h3>Explore the package</h3><p>Open a check to inspect its context, filter the gaps, or download the exact synthetic record.</p><p className="demo-small-note">The download contains this draft’s data, not the illustrative UI checklist or a compliance assessment.</p></section>
      </aside>
    </div>
  </div>;
}
