# CiteGuard

<p align="center">
  <strong>A citation is only as good as the source it points at. CiteGuard keeps checking.</strong>
</p>

<p align="center">
  <a href="https://valentinzubok.github.io/CiteGuard/"><img src="https://img.shields.io/badge/Live-Console-818cf8?style=flat-square" alt="Live console" /></a>
  <a href="https://github.com/valentinzubok/CiteGuard/actions/workflows/ci.yml"><img src="https://github.com/valentinzubok/CiteGuard/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <img src="https://img.shields.io/badge/GenLayer-Studio%20Dev%2061997-818cf8?style=flat-square" alt="Studio Dev" />
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue?style=flat-square" alt="MIT" /></a>
</p>

---

## The trust problem

Footnotes rot. A page gets rewritten, a report is withdrawn, a URL 404s — and the claim that cited
it keeps circulating, still looking sourced. Hashing the page alone cannot tell you whether it
matters: a changed timestamp is not a retraction. A single language model can tell you, but its
answer is unreproducible, unattributable, and easy to steer with a line of text on the page.

**CiteGuard makes "does this source still support this claim?" a consensus question.**

```
register(claim_id, claim, source_url, label)
      the source is fetched and frozen now: validators agree on the SHA-256 of the whole
      normalized document, and they must agree it SUPPORTS the claim. A citation that does
      not hold at filing time is refused, so the registry never contains an unchecked claim.

verify(claim_id)
      re-reads THE SOURCE THAT WAS REGISTERED — no URL is accepted here, so nobody can point
      the check at a friendlier page:
        identical hash            -> "unchanged", decided deterministically, zero model spend
        changed and still states  -> the new text becomes baseline v(n+1)
        changed and no longer     -> the claim is marked broken, both hashes recorded
        unreachable or empty      -> marked unreachable; link rot is a finding, not a pass
retract(claim_id)   publisher withdraws the claim; retracted claims are never re-verified
```

### Why it fails the way it does

Every judgement is **one boolean** under `eq_principle.prompt_comparative`, answered from a bounded
deterministic digest of the whole document, with the claim and the page quoted as untrusted data.
A malformed answer, a model error or a consensus failure **reverts the transaction**. That is the
opposite direction from a monitoring alert, and it is deliberate: in a citation registry, the
dangerous failure is a claim quietly *becoming* supported.

| Risk | What stops it |
|---|---|
| The check is pointed at a friendlier page | `verify()` takes no URL; the source is fixed at registration. |
| Only the top of the page is read | The whole document is hashed; the model reads ≤4000 chars assembled from the head plus non-overlapping windows around the claim's own words. |
| `bool("no")` is `True` | `literal_bool()` accepts only JSON `true`/`false`; anything else reverts. |
| Prompt injection on the cited page | Claim and page text are fenced as untrusted data, inner fences neutralized, injection phrasing flagged to the model and stored on the claim. |
| Consensus quietly degrading | No fallback: if `prompt_comparative` cannot run, the transaction reverts. (`principle` is positional-only in GenVM v0.3 — passing it by keyword silently pushed earlier contracts onto `strict_eq`.) |
| A timestamp change looking like a retraction | An identical hash short-circuits to `unchanged`; a changed hash is judged on substance, not on bytes. |

## Live

| | |
|---|---|
| Console | **https://valentinzubok.github.io/CiteGuard/** (reads work with no wallet) |
| Network | GenLayer Studio Dev / Studio Next — chain `61997` |
| Contract | [`0x78A83b43A44432795A4fb6826Ebb3Cf12042d0b7`](https://explorer-studio-dev.genlayer.com/address/0x78A83b43A44432795A4fb6826Ebb3Cf12042d0b7) |
| Contract-only repo | [CiteGuardCore](https://github.com/valentinzubok/CiteGuardCore) |
| Deploy record | [`STUDIO_DEV_DEPLOY.md`](STUDIO_DEV_DEPLOY.md) |

`scripts/verify_deployment.py` runs in CI and fails the build if the deployed bytes stop matching
[`contracts/CiteGuard.py`](contracts/CiteGuard.py).

## The demo source is a file in this repository

[`web/public/fixtures/report.html`](web/public/fixtures/report.html) is the page the demo claims
cite. Every edit that CiteGuard reacts to is therefore a public commit you can diff — the
"retraction" in the history is a real change to a real file, not a story in a README.

## The console

[`web/`](web/) — Next.js 16 + `genlayer-js` 2.0.0-rc.1 + MetaMask, exported statically to Pages.
It reads claims and alerts from chain without a wallet, writes `register` / `verify` / `retract`
through MetaMask with Studio Dev fees, and distinguishes `ACCEPTED` from `FINALIZED` rather than
presenting acceptance as completion.

```bash
cd web
npm install
npm run dev      # http://localhost:3014
```

## Tests

```bash
pip install -r requirements-dev.txt
python3 -m pytest -q      # 32 tests
```

`tests/test_adversarial.py` is the interesting half: twelve malformed or non-boolean model
outputs, model errors, consensus failure, prompt injection in the claim and on the page, a
retraction buried 6 KB into a document, digest bounds and determinism, conflicting sources, and
link rot.

## License

[MIT](LICENSE) © 2026 Valentyn Zubok
