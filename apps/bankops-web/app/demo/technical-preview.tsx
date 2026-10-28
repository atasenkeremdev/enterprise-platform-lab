"use client";

import { useState } from "react";
import technical from "../../public/demo/openshift-technical.synthetic.json";
import { references } from "./guidance";

const baseline = technical.baseline;
const artifacts = [
  { id: "version", title: "Cluster version", data: baseline.clusterVersion, meaning: "The fictional baseline reports status.desired.version = 4.18.0. That is the desired release in this excerpt, not proof that an update completed or that 4.22 is reachable.", question: "What release is the change starting from?" },
  { id: "operators", title: "Operators", data: baseline.operators, meaning: "Three selected Operators are Available=True, Progressing=False and Degraded=False in this synthetic excerpt. Missing Operators and compatibility with the requested target are not assessed.", question: "What is the starting condition of selected platform components?" },
  { id: "pools", title: "Machine pools", data: baseline.machinePools, meaning: "The fictional master and worker pools each show 3/3 updated, 3/3 ready and zero degraded machines. This snapshot does not establish spare capacity, safe drain behaviour or target compatibility.", question: "Are example pools converged before the planned maintenance?" },
  { id: "nodes", title: "Nodes", data: baseline.nodes, meaning: "Two selected fictional nodes show Ready=True. This is a partial excerpt, not the complete six-machine inventory represented by the pool example, and not a post-upgrade observation.", question: "Which node readiness observations support the baseline?" },
];

export default function TechnicalPreview({ showAllChecks }: { showAllChecks: () => void }) {
  const [selected, setSelected] = useState("version");
  const artifact = artifacts.find(item => item.id === selected)!;
  return <section className="technical-preview" aria-labelledby="technical-preview-title">
    <p className="demo-kicker">Concrete technical example / OpenShift only</p>
    <h3 id="technical-preview-title">OpenShift 4.18 → requested target 4.22</h3>
    <p className="technical-notice"><strong>Synthetic output, not executed commands.</strong> These hand-authored excerpts describe a fictional cluster, not this lab. 4.22 is a requested target minor, not a validated direct upgrade or an executed change.</p>
    <div className="technical-plan"><div><span>Illustrative starting release</span><strong>{baseline.clusterVersion.output.status.desired.version}</strong></div><div><span>Requested target minor</span><strong>{technical.plan.requestedTargetMinor}</strong></div><div><span>Exact target patch</span><strong>Not selected</strong></div><div><span>Supported update path</span><strong className="technical-unresolved">Not validated</strong></div></div>
    <p className="technical-path-note">Do not read the arrow as a supported single-step upgrade. Infra must assess the real cluster’s recommended updates, intermediate stages, Operator compatibility and conditions. No upgrade graph or recommendations were retrieved. <a href="https://docs.redhat.com/en/documentation/openshift_container_platform/4.18/html/updating_clusters/performing-a-cluster-update">Red Hat update-path guidance</a>.</p>
    <h4 className="technical-table-title" id="technical-comparison-title">What do we know before and after the proposed change?</h4><p className="technical-scroll-hint" id="technical-scroll-hint">Scroll the comparison horizontally to read the before and after columns.</p><div className="technical-table-scroll" tabIndex={0} role="region" aria-label="Before and after change evidence comparison" aria-describedby="technical-scroll-hint"><table className="technical-comparison" aria-labelledby="technical-comparison-title"><thead><tr><th scope="col">Technical question</th><th scope="col">Before · synthetic excerpt</th><th scope="col">After · execution not recorded</th></tr></thead><tbody><tr><th scope="row">Cluster release</th><td>{baseline.clusterVersion.output.status.desired.version} desired</td><td>No post-change version captured</td></tr><tr><th scope="row">Operator condition</th><td>{baseline.operators.output.items.length} selected examples available / not degraded</td><td>No post-change Operator output</td></tr>{baseline.machinePools.output.items.map(pool => <tr key={pool.metadata.name}><th scope="row">{pool.metadata.name} pool</th><td>{pool.status.updatedMachineCount}/{pool.status.machineCount} updated · {pool.status.readyMachineCount}/{pool.status.machineCount} ready</td><td>No post-change pool output</td></tr>)}<tr><th scope="row">Node readiness</th><td>{baseline.nodes.output.items.length} selected Ready=True examples</td><td>No post-change node output</td></tr><tr><th scope="row">Application regression</th><td>No Development test result attached</td><td>No service-owner validation</td></tr></tbody></table></div>
    <div className="technical-artifact-picker" role="group" aria-label="Choose a technical output excerpt">{artifacts.map(item => <button key={item.id} type="button" aria-pressed={selected === item.id} onClick={() => setSelected(item.id)}>{item.title}</button>)}</div>
    <div className="technical-artifact" aria-labelledby="technical-artifact-title">
      <h4 id="technical-artifact-title">{artifact.question}</h4>
      <p className="technical-command"><strong>Read-only command reference · not run</strong><code>{artifact.data.command}</code></p>
      <pre tabIndex={0} aria-label={`${artifact.title} synthetic JSON excerpt`}><code>{JSON.stringify(artifact.data.output, null, 2)}</code></pre>
      <p className="technical-meaning"><strong>How to interpret it:</strong> {artifact.meaning}</p>
      <dl className="technical-provenance"><div><dt>Artifact origin</dt><dd>Hand-authored synthetic excerpt</dd></div><div><dt>Illustrative source time</dt><dd>{technical.sourceAt}</dd></div><div><dt>Illustrative collection time</dt><dd>{technical.collectedAt}</dd></div></dl>
    </div>
    <div className="technical-mapping"><h4>How does this become change evidence?</h4><ol><li><strong>Technical artifact:</strong> inspect the command reference and raw excerpt above.</li><li><strong>Evidence context:</strong> Infra attaches the baseline to <a href="#evidence-check-baseline" onClick={showAllChecks}>Cluster & infrastructure readiness</a>, with source, time, complete inventory and supported update-path assessment.</li><li><strong>Suggested control link:</strong> <a href={references.planning.url}>{references.planning.label}</a>. These artifacts are supporting examples, not a prescribed DORA output format or proof of compliance.</li><li><strong>Still unresolved:</strong> target patch, recommended path, Development tests, security assessment, independent approval and all post-change observations.</li></ol><p>Partial synthetic baselines do not close the readiness gap. A real before/after comparison is only possible after an approved change is executed and its outcome is captured.</p></div>
    <a className="demo-download" href="/demo/openshift-technical.synthetic.json" download="openshift-technical.synthetic.json">Download synthetic technical outputs ↓</a>
  </section>;
}
