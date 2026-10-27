# bankops-web

BankOps.dev's first product-introduction website: Next.js 16.4.3, React 19.3.1, TypeScript 7.0.2, and Node.js 24. It contains no business backend, database, sign-up, evidence collector, or live integrations. The evidence visual is explicitly illustrative. The demo/contact CTA opens a GitHub issue; visitors are asked not to include confidential or regulated data.

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
