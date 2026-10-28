import type { Metadata } from "next";
import DemoWorkspace from "./workspace";
import "./demo.css";

export const metadata: Metadata = {
  title: "Change evidence preview — BankOps.dev",
  description: "Explore a read-only, synthetic change evidence package. No live collection, approvals, or compliance determination.",
};

export default function DemoPage() {
  return <>
    <a className="skip-link" href="#demo-main">Skip to content</a>
    <div className="demo-shell">
      <header className="demo-header wrap">
        <a className="brand" href="/" aria-label="BankOps.dev home"><span className="brand-mark" aria-hidden="true">b/</span><span>BankOps<span className="brand-domain">.dev</span></span></a>
        <a className="demo-back" href="/">← Back to website</a>
      </header>
      <main id="demo-main" className="demo-main wrap">
        <div className="demo-intro">
          <p className="eyebrow">Product walkthrough / change evidence</p>
          <h1>One change.<br /><em>The evidence around it.</em></h1>
          <p>See how an infrastructure change could become a reviewable evidence package — with its sources, owners, and gaps in one place. Explore Development-owned application changes and Infra-owned AKS, on-prem OpenShift, and RHEL scenarios.</p>
        </div>
        <aside className="demo-disclosure" aria-label="Prototype limitations"><strong>Synthetic data · Read-only prototype</strong><p>These fictional packages are not executed changes. No live systems are connected, no approval can be recorded, and no form submissions or evidence uploads are accepted. This screen does not assess DORA compliance.</p></aside>
        <DemoWorkspace />
        <section className="demo-regulatory" aria-labelledby="demo-scope-title">
          <h2 id="demo-scope-title">What do the DORA references mean?</h2>
          <p>The suggested links explain our product mapping, not a complete legal checklist. “DORA” means Regulation (EU) 2022/2554; “RTS” refers here to its supporting Delegated Regulation (EU) 2024/1774. This walkthrough focuses on ICT change management under <a href="https://eur-lex.europa.eu/eli/reg/2022/2554/oj">DORA Article 9(4)(e)</a> and <a href="https://eur-lex.europa.eu/eli/reg_del/2024/1774/oj">Delegated Regulation Article 17</a>. A structured record alone cannot demonstrate policy effectiveness, independent approval, or regulatory compliance. This prototype does not cover the full requirements.</p>
        </section>
      </main>
      <footer className="demo-footer wrap"><span>BankOps.dev / Early product preview</span><a href="/">Return to the product vision →</a></footer>
    </div>
  </>;
}
