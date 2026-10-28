# bankops-web

BankOps.dev's first product-introduction website: Next.js 16.4.3, React 19.3.1, TypeScript 7.0.2, and Node.js 24. It contains no business backend, database, sign-up, evidence collector, or live integrations. The evidence visual is explicitly illustrative. The demo CTA links to an honest on-page availability notice until a verified business contact address is supplied. No visitor-facing GitHub references or links remain; visitors are asked not to include confidential or regulated data.

```sh
npm ci --ignore-scripts
npm run typecheck
npm run build
npm start
# In another terminal after the production server starts:
npx playwright install chromium
npm run test:browser
```

Use Node.js 24. The standalone multi-stage Dockerfile pins the Node base digest and runs UID/GID 1001. `/healthz` is the production health endpoint. GitHub Actions builds the amd64 image, runs it read-only with a 256 MiB limit, runs desktop/mobile browser checks and the image healthcheck, then publishes to GHCR and commits its immutable digest to `deploy/bankops/deployment.yaml`.

The cluster uses Traefik and Flux with manifests under `clusters/lab` and `deploy/bankops`. The intended private URL is http://lab-k3s-01.lan. Public DNS, ingress TLS, and any future product/backend capabilities are separate work. See the repository operations documentation for deployment validation results.

The public /demo route is a synthetic, read-only change evidence walkthrough. It supports gap filtering, native disclosures and static JSON download, with no inputs, approval operations, source fetching or persistence. Keep public/demo/change-evidence.synthetic.json synchronized with the canonical product/dora example; the browser suite checks object parity. Never put real evidence in public/.

The scenario selector separates Development-owned application changes from Infra-owned AKS, on-prem OpenShift and RHEL platform/OS changes. The typed scenario catalogue in app/demo/scenarios.ts holds illustrative responsibility/checklist metadata; every downloadable JSON remains a draft under the existing contract. Keep all public/demo JSON files synchronized with their product/dora/examples counterparts.
