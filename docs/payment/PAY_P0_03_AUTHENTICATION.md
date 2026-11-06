# PAY-P0-03 — Authentication

2026-11-06 (Asia/Kolkata). Local engineering evidence only. Live activation: **NO-GO**.

`authn` implements vendor-neutral nonce-bound signed OIDC ID-token exchange. No identity vendor was selected without owner input. Configuration requires approved HTTPS issuer/audience, pinned RS256 JWKS SHA256, country claim and TTL300–3600s. RSA2048–8192 keys (max8), signature/issuer/audience/azp/exp/iat/nonce and bounded token lifetime are checked. No token-directed remote keys or email-derived identity.

Random5minute challenges store hashed nonce/CSRF, allow at most5 failed attempts and redeem once atomically. Customer IDs derive from issuer+subject SHA256; only subject digest is retained. Country comes from a reviewed signed identity claim, never IP/birth location/browser JSON.

Random256bit opaque sessions are hashed in PostgreSQL and delivered only via Node host-only `__Host-mmo-session` Secure/HttpOnly/SameSite=Lax cookie. Separate login/session CSRF cookies, exact Origin, double-submit and Go session-bound CSRF protect mutations. Browser JSON omits bearer tokens. Duplicate cookies and cross-environment sessions reject. Every request checks issuer/environment/expiry/revocation/deleted customer.

Logout revokes current session. Explicit account disable tombstones customer and revokes all sessions/grants transactionally while retaining financial audit; no automatic refund or financial erasure. Legal retention/complete privacy erasure workflow is unapproved. Pinned JWKS rotation requires reviewed config/hash update. Deployment must bound auth request rates; tests cover per-challenge attempts and request limits.

Real identity vendor SDK, hosted login UX and actual customer verification are external dependencies. Chosen SDK must support the server-issued nonce ID-token flow; arbitrary existing tokens are insufficient. Authorization-code/PKCE vendor integration is not claimed. G01 remains blocked.
