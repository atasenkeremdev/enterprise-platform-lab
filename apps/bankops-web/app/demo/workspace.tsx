"use client";

import { useState } from "react";
import { scenarios } from "./scenarios";
import TechnicalPreview from "./technical-preview";
import { explainCheck, references } from "./guidance";

function FieldHelp({ question, reference }: { question: string; reference: { label: string; url: string } }) {
  return <span className="field-help">{question} <a href={reference.url}>{reference.label}</a></span>;
}

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
    <section className="demo-reading-guide" aria-labelledby="reading-guide-title">
      <p className="demo-kicker">Start here / how to read this demo</p>
      <h2 id="reading-guide-title">Could someone else explain this change?</h2>
      <ol><li><strong>Understand the change.</strong> Read what will change, why, and which team owns it.</li><li><strong>Inspect the evidence.</strong> Open a row to see why it matters, who should provide it, and an example of what is needed.</li><li><strong>Check what is still missing.</strong> A draft with gaps has no recorded approval or verified result.</li></ol>
      <p><strong>A gap is missing package information, not a finding of a DORA breach.</strong> All counts and statuses are illustrative; this demo does not evaluate your systems.</p>
    </section>
    <div className="package-heading">
      <div><p className="demo-kicker">{sample.id} / Revision {sample.revision}</p><h2>{scenario.title}</h2><p>Fictional system: <strong>{sample.change.system}</strong> · Synthetic lab scenario</p></div>
      <div className="package-actions"><span className="demo-badge">Draft · incomplete</span><a className="demo-download" href={`/demo/${scenario.download}`} download={scenario.download}>Download synthetic JSON ↓</a></div>
    </div>
    <nav className="demo-section-nav" aria-label="Evidence package sections"><a href="#change-summary">Overview</a><a href="#evidence-checks">Evidence & gaps</a><a href="#package-review">Review</a></nav>
    <div className="demo-facts" aria-label="Package at a glance"><div><span>Change type</span><strong>Normal change</strong></div><div><span>Evidence references</span><strong>{sample.evidence.length} synthetic {sample.evidence.length === 1 ? "example" : "examples"}</strong></div><div><span>Open evidence gaps</span><strong>{gaps} in this walkthrough</strong></div><div><span>Review status</span><strong>Not requested</strong></div></div>
    <section className="responsibility-panel" aria-labelledby="responsibility-title">
      <div className="responsibility-heading"><div><p className="demo-kicker">{scenario.environment}</p><h3 id="responsibility-title">Ownership follows the change.</h3></div><span className="owner-team-badge">Accountable team: {scenario.ownerTeam}</span></div>
      <dl className="responsibility-grid"><div><dt>Primary responsibility</dt><dd>{scenario.boundary}</dd></div><div><dt>Supporting responsibility</dt><dd>{scenario.supportingTeam}</dd></div><div><dt>Outside this change</dt><dd>{scenario.excluded}</dd></div><div><dt>Independent approval</dt><dd>Designated independent change reviewer — not the requester or implementer. No reviewer or approval is recorded.</dd></div></dl>
      <p className="demo-small-note">Illustrative team allocation, not a universal organisation model or an access-control policy. Security advises on security impact; Compliance reviews evidence needs. Neither substitutes for the technical owner or independently authorised change approval.</p>
    </section>
    {scenario.id === "openshift" && <TechnicalPreview showAllChecks={() => setOnlyGaps(false)} />}
    <div className="demo-columns" key={scenario.id}>
      <div className="demo-primary">
        <section className="demo-card" id="change-summary" aria-labelledby="change-summary-title"><p className="demo-kicker">01 / Change context</p><h3 id="change-summary-title">What is changing, and why?</h3><dl className="demo-definition"><div><dt>Purpose</dt><dd>{sample.change.purpose}<FieldHelp question="Why is this change needed?" reference={references.description} /></dd></div><div><dt>Scope</dt><dd>{sample.change.scope}<FieldHelp question="Which systems and boundaries are affected?" reference={references.description} /></dd></div><div><dt>Expected outcome</dt><dd>{sample.change.expectedOutcome}<FieldHelp question="What result should the reviewer expect?" reference={references.description} /></dd></div><div><dt>Planned window</dt><dd>{formatTime(sample.change.plannedStart)} → {formatTime(sample.change.plannedEnd)}<span className="demo-muted">Illustrative timestamps; not a scheduled operation.</span><FieldHelp question="When is the change planned?" reference={references.description} /></dd></div></dl><details className="demo-details"><summary>Risk and fallback plan</summary><dl className="demo-definition"><div><dt>Risk assessment</dt><dd>{sample.change.riskAssessment}<FieldHelp question="What could go wrong or affect security controls?" reference={references.security} /></dd></div><div><dt>Fallback plan</dt><dd>{sample.change.fallbackPlan}<FieldHelp question="If the change fails, what is the recovery approach?" reference={references.fallback} /></dd></div><div><dt>Fallback owner</dt><dd>{sample.change.fallbackOwner}<FieldHelp question="Who is responsible for the fallback procedure?" reference={references.fallback} /></dd></div></dl><p className="demo-small-note">A written fallback proposal is not proof that recovery has been tested.</p></details></section>
        <section className="demo-card" id="evidence-checks" aria-labelledby="evidence-checks-title"><div className="demo-card-heading"><div><p className="demo-kicker">02 / Evidence readiness</p><h3 id="evidence-checks-title">Make the gaps visible.</h3></div><span className="demo-gap-count">{gaps} gaps</span></div><p className="demo-section-copy">Open a row to understand the question, the responsible team, and the evidence a reviewer would look for. Counts are not DORA violations or a compliance score.</p><div className="demo-filters" role="group" aria-label="Filter evidence checks"><button type="button" aria-pressed={!onlyGaps} onClick={() => setOnlyGaps(false)}>All checks</button><button type="button" aria-pressed={onlyGaps} onClick={() => setOnlyGaps(true)}>Gaps only</button></div><p className="demo-result-count" role="status">Showing {visible.length} of {checks.length} illustrative checks</p><ul className="demo-checks">{visible.map(check => <li key={check.id} id={`evidence-check-${check.id}`}><details><summary><span className={`check-symbol ${check.missing ? "is-gap" : "is-example"}`} aria-hidden="true">{check.missing ? "!" : "↳"}</span><span className="check-name">{check.title}</span><span className={`check-state ${check.missing ? "is-gap" : "is-example"}`}>{check.state}</span><span className="check-expand" aria-hidden="true">+</span></summary><div className="evidence-explainer">
                  <dl><div><dt>Why this matters</dt><dd>{explainCheck(scenario.id, check.id).why}</dd></div><div><dt>Who should provide it</dt><dd className="evidence-provider">{check.team}</dd></div><div><dt>Example evidence to provide</dt><dd>{explainCheck(scenario.id, check.id).expected}</dd></div><div><dt>What this demo actually has</dt><dd>{check.detail}</dd></div></dl>
                  <p className="evidence-reference"><strong>Suggested DORA link:</strong> <a href={explainCheck(scenario.id, check.id).reference.url}>{explainCheck(scenario.id, check.id).reference.label}</a></p>
                </div>{check.id === "change_record" && <div className="demo-provenance"><strong>Example provenance · not a live source</strong><dl><div><dt>Source identifier</dt><dd><code>{sample.evidence[0].sourceUri}</code><span className="provenance-help">The identifier of the example record; not a working integration.</span></dd></div><div><dt>Source timestamp</dt><dd>{formatTime(sample.evidence[0].sourceAt)}<span className="provenance-help">When the source record was created.</span></dd></div><div><dt>Collection timestamp</dt><dd>{formatTime(sample.evidence[0].collectedAt)}<span className="provenance-help">When it was added to this example package.</span></dd></div><div><dt>Assertion type</dt><dd>Synthetic</dd></div></dl><p>Source and collection times help trace a record. They do not prove authenticity or satisfy a specific DORA requirement by themselves. This prototype does not fetch or verify sources.</p></div>}</details></li>)}</ul></section>
      </div>
      <aside className="demo-secondary" aria-label="Ownership and review">
        <section className="demo-card"><p className="demo-kicker">Accountability</p><h3>People behind the change</h3><p className="scenario-team-label">Accountable team: <strong>{scenario.ownerTeam}</strong></p><dl className="demo-definition"><div><dt>Accountable owner</dt><dd>{sample.people.owner}</dd></div><div><dt>Requester</dt><dd>{sample.people.requester}</dd></div><div><dt>Implementer</dt><dd>{sample.people.implementer}</dd></div></dl><p className="demo-small-note">Fictional role identifiers. No real identities or organisation are represented. Team labels do not grant access or prove independent review.</p></section>
        <section className="demo-card demo-review" id="package-review" aria-labelledby="package-review-title"><p className="demo-kicker">03 / Review</p><h3 id="package-review-title">Not ready for approval.</h3><p>The package has unresolved evidence gaps and no independent reviewer. There is no approval decision, implementation record, or verified outcome.</p><div className="demo-review-state">No approval actions in this prototype</div><p className="demo-small-note">A future workflow would bind approval to a specific revision and check reviewer independence. Neither is enforced by this read-only screen.</p></section>
        <section className="demo-card demo-next"><h3>What does each status mean?</h3><dl className="status-explainer"><div><dt>Example attached</dt><dd>A fictional reference only, not verified evidence.</dd></div><div><dt>Partial example</dt><dd>Some fictional output is shown; the evidence requirement is still incomplete.</dd></div><div><dt>Missing / Not assessed</dt><dd>The supporting result or completed assessment is absent.</dd></div><div><dt>Not recorded / Not implemented</dt><dd>No approval decision or implementation outcome is recorded.</dd></div></dl><p className="demo-small-note"><strong>About the JSON download:</strong> it contains the selected synthetic draft record, not the UI checklist, an audit report or a compliance certificate.</p></section>
      </aside>
    </div>
  </div>;
}
