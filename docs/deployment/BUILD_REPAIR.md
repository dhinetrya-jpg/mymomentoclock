# Build and deployment repair — 2026-11-05

Base: merged main `e39bc7feeddcc8fa7b2110719388f4e351c2ff30`. Branch: `fix/swiss-ephemeris-build`.
The previous local calculation patch branch is preserved; those commits are not present in this remote main and were not reapplied in this build repair.

## Swiss Ephemeris

The old Dockerfile used an astro.com archive URL and assumed a `swisseph-2.10.01/src` directory and `lib` Make target. The upstream GitHub source has its Makefile at the repository root and its static archive target is `libswe.a`.

`scripts/install-swisseph.sh` fetches the official https://github.com/aloistr/swisseph repository at immutable commit `175e1fcb3108bcd5c0d146c803f51dcf23508012` (v2.10.03), verifies HEAD, builds `libswe.a`, and installs the matching upstream headers and license files. It preserves TLS verification. Run with `sudo sh scripts/install-swisseph.sh` on a machine with git, make, a C/C++ compiler and a real Go toolchain. PREFIX can select an alternative installation directory; supply appropriate CGO_CFLAGS/CGO_LDFLAGS for a nonstandard prefix.

Both Go modules now link `-lswe -lm -ldl -lstdc++`. The handwritten placeholder headers were removed; the installed real header is required. Docker uses matching Debian build/runtime distributions, includes C++ runtime and timezone data, builds with CGO enabled and does not ignore dependency failures with `go mod tidy || true`.

This installs the library, not the separate `.se1` astronomical data files. At the tested dates, upstream Swiss Ephemeris can use its built-in Moshier calculations when files are absent. No high-precision file-backed calculation or independent astronomical accuracy certification is claimed. For file-backed operation, provision the appropriate data and supported upstream ephemeris path separately. Upstream licensing is AGPL-3.0 or an applicable Swiss Ephemeris professional license; the upstream license texts are retained in the engine image. The application MIT license does not relicense this library.

## Select the deployment artifact

- `Dockerfile`: Go native engine API, port 8080. This preserves the existing API artifact; it does not serve the React application. Copying unbuilt frontend source into the old image never made it a web server.
- `Dockerfile.web`: complete existing root React/Express application, port 3000. Includes compiled static assets and required tsx runtime. Runs as the node user with correct copied-file ownership. A Gemini credential is optional for startup; absent credentials return 503 AI_UNAVAILABLE for readings.
- GitHub Pages: static root Vite bundle only. Pages cannot run Express/Go, payment webhooks, SSE or native Swiss Ephemeris. Use the web image for those server features; deploying static pages does not create a backend.

Normal builds:

```sh
docker build -t mymomentoclock-engine .
docker build --target root-tests -t mymomentoclock-go-tests .
docker build -f Dockerfile.web -t mymomentoclock-web .
docker run --rm -p 8080:8080 mymomentoclock-engine
docker run --rm -p 3000:3000 mymomentoclock-web
```

In a managed proxy environment, add `--secret id=proxy_ca,src=/etc/ssl/certs/ca-certificates.crt` to each build command, using the trusted combined system CA bundle. The optional mount is not retained in image layers; ordinary GitHub-hosted builds need no proxy secret. Never disable TLS verification.

Compose now includes the web service on 3000, engine on 8080, and Grafana on 3001. Local engine replicas are one to avoid binding multiple containers to the same host port. `docker compose config --quiet` validates the configuration. Multi-node scaling belongs behind a service/load balancer rather than a fixed host-port binding.

## Frontend and CI

Keep the existing package-lock.json; use Node 22 and `npm ci`. No dependency version upgrade was required. Both root and alternate frontend use the root installed dependencies. The alternate frontend now enables its intended Node/Vite/TSX types and uses Tailwind's Vite plugin; unused locals/imports were removed without disabling strict/noUnused checks. Image URLs are Vite imports, so assets work after production bundling and under a Pages project base path.

CI now uses frozen npm installs, validates both frontend builds, compiles/tests both Go modules, and smoke-tests both runtime images. Payment audit commands execute the actual tests in the root Go module instead of addressing a nested module from the wrong directory or reporting success with no tests. Payment implementation is unchanged.

The k6 installer now uses Grafana's setup action. Automatic CI runs a bounded 10-iteration smoke profile and fails on failed checks. `workflow_dispatch` can choose the original 10,000-VU stress profile; no 10,000-user performance claim is made from a smoke run. Response checks follow the current API's computed-fit contract instead of the obsolete `is_certified_true` field, and do not assert scientific/graph certification.

## Live deployment prerequisites

No image has been pushed and no GitHub workflow or live rollout was triggered here. Kubernetes remains a template: provide a real image registry/tag, ingress hostname, real secret bindings, storage classes and ingress infrastructure before applying it. The namespace declaration was added so the documented apply sequence can create namespaced resources. Existing example credentials and application correctness/authentication blockers remain unsuitable for a production launch; this patch repairs build/startup paths, not those independent product/security issues.

Do not interpret successful compilation or health checks as completion of the earlier calculation-integrity or payment-security remediation.

## Executed validation

- `npm ci --no-audit --no-fund`: passed against the unchanged committed lockfile.
- `npm run lint`, `npm run build`, `npm --prefix frontend run lint`, `npm --prefix frontend run build`: all passed. The standalone frontend's earlier unused/type errors and Tailwind warnings were resolved.
- Native engine Docker build: passed; real Go 1.22 container toolchain used because host `/usr/bin/go` is a different program. CGO remained enabled.
- `docker build --target root-tests ...`: passed. Root module ran TestVerifyWebhookSignature, TestReplayAttackPrevention, TestCommercialKeywordsExclusion (3 passed). Backend module compiled all packages and ran TestNativeEphemeris/TestNativeNormalizationWithTimezone (2 passed); other backend packages have no tests and are not counted as tested.
- `docker build -f Dockerfile.web ...`: passed using Node 22; runtime ownership corrected after the first non-root container could not read package.json.
- `node tests/deployment/smoke.mjs engine http://127.0.0.1:18080`: passed against the real runtime container. Health and native four-planet normalization at J2000 (including Asia/Kolkata tzdata) verified.
- `node tests/deployment/smoke.mjs web http://127.0.0.1:13000`: passed against the real non-root runtime container. Health, HTML, JavaScript content type, three actual bundled JPEG responses, nine-planet chart API and typed AI-unavailable response verified. The initial asset-scanner assumption was corrected to follow Vite's actual import.meta-relative URLs; image response assertions were retained.
- k6 1.0.0 smoke against the web container: 10 completed iterations, 20 HTTP requests, 50/50 checks passed, zero failed requests. No 10,000-VU benchmark executed.
- `docker compose config --quiet`: passed. Full database/monitoring stack was not started.
- All workflow YAML and Kubernetes YAML documents parsed; `sh -n scripts/install-swisseph.sh` and `git diff --check` passed. Parsing is not a live Kubernetes deployment or a remote GitHub Actions run.
- Live Gemini API, payment transactions, cloud registry publishing, ingress/TLS and real Kubernetes rollout were not executed. Earlier calculation/auth/payment limitations are not resolved by these build tests.

Local Docker build commands used the optional trusted combined CA mount described above. Test containers were removed after verification. No remote push, merge or deployment occurred.
