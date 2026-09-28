# CiteGuard — Studio Dev (chain 61997) deploy record

| | |
|---|---|
| **Network** | GenLayer Studio Dev / Studio Next — chain `61997`, GenVM `v0.3.0` |
| **Contract** | [`0x78A83b43A44432795A4fb6826Ebb3Cf12042d0b7`](https://explorer-studio-dev.genlayer.com/address/0x78A83b43A44432795A4fb6826Ebb3Cf12042d0b7) |
| **Source** | [`contracts/CiteGuard.py`](contracts/CiteGuard.py) — runner `py-genlayer:5jycge4q8k23462jtb0b9fyey1s9qz928sz2nbrd9mg4sxqg2qng` |
| **Source sha256** | `003a026a65c1348aea55ee4fd8f1259a4ab3dfd6cecb6a61f90b926ed1cf130d` |
| **Console** | https://valentinzubok.github.io/CiteGuard/ — the app in this repository |
| **Owner / publisher** | `0xBA989D240AAB780d3d2eD2201f5F677098901408` (test account) |

## Verify that the deployed code equals this source

```bash
curl -s -X POST https://studio-dev.genlayer.com/api -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"gen_getContractCode","params":["0x78A83b43A44432795A4fb6826Ebb3Cf12042d0b7"]}' \
  | python3 -c "import sys,json,base64,hashlib; print(hashlib.sha256(base64.b64decode(json.load(sys.stdin)['result'])).hexdigest())"
shasum -a 256 contracts/CiteGuard.py
# both print 003a026a65c1348aea55ee4fd8f1259a4ab3dfd6cecb6a61f90b926ed1cf130d
```

`scripts/verify_deployment.py` does the same check and runs in CI.

## On-chain lifecycle

The two cited sources are files in this repository, so every change below is a public commit in
[the history](https://github.com/valentinzubok/CiteGuard/commits/main).

| # | Step | Result | Tx |
|---|------|--------|----|
| 0 | deploy | contract created | `0x1630a4d713ea1b61e011b45712c0fc09c55fc0cd4b3ea928fc6e9f0811bb8df5` |
| 1 | `register("audit/2026", …, fixtures/report.html)` | **supported** — validators agreed the source states the claim. Baseline sha-256 `27153705…` over 1495 characters of extracted text, 1000 of them judged. | `0x0124cc1d032e4a97f4c3544d6d6519e5f2b98285e0e0262b4d33b483c9a06a40` |
| 2 | `verify("audit/2026")` | **unchanged** — identical hash, so the result was decided deterministically with no model spend. | `0x702b1ad6811b2f2240de0043b46df1c36750caa3d292c8c2c0d245d65c948db8` |
| 3 | `register("custody/2026", …, fixtures/addendum.html)` | **supported** | `0x53121d0c22fd6ef3e3bc7d4e7574c8e6718ae0b1d84aae79f924523fcc7cc536` |
| 4 | `verify("audit/2026")` after a cosmetic commit (an italic "Last reviewed" line) | **unchanged** again — the renderer's extracted text did not change, so the hash did not either. Worth knowing: the baseline is over *extracted text*, not raw HTML, and decorative markup does not spend a single token. | `0x9c3af5f9a667b8ffd8f92918d31047a0e242d8f206e30ab6520aee9fc68b7f54`, `0xfb225030c788801f9e16dc3c69ade8cc01a139e553f23b2619eec8601bdc3844` |
| 5 | `verify("audit/2026")` after the findings section withdrew the figure | **broken** — `no_longer_supports`. The validators agreed the source no longer states the claim; `alert-1` records baseline `27153705…` → current `6d8f794a…` and the claim keeps baseline v1 so the original hash is not lost. | `0xb9a967040451642c6620dd7b0ee920621c7acb5d0c085e4508508444a3c74c93` |
| 6 | `verify("custody/2026")` after the cited file was deleted | **unreachable** — `alert-2` records `WEBPAGE_LOAD_FAILED`. Link rot is stored as a finding; it never reads as support. | `0x017289ff9e7db010b4d7da517e941c576adb1e995bbfb6a55eb1a46982ac3500` |

State (`get_stats`): `{"claims":2,"supported":0,"broken":1,"unreachable":1,"retracted":0,"checks":5,"alerts":2}`

Two claims, two different ways a citation dies: one source quietly rewritten, one deleted. Both are
visible on chain with the hashes, and both are reproducible from the repository's commit history.

## What the validators are actually asked

One boolean, from a bounded deterministic digest of the whole document:

- the leader returns `{"verdict": "supports" | "no_support" | "invalid"}` and `prompt_comparative`
  (with a **positional** principle — it is positional-only in GenVM v0.3) requires the field to be
  identical across validators;
- `literal_bool()` accepts only JSON `true`/`false`, so `"true"`, `1`, `"yes"`, `[]` and `{}` all
  produce `invalid` and revert the transaction;
- the claim and the page text are fenced as untrusted data, inner fences are neutralized, and
  injection phrasing is flagged to the model and stored on the claim;
- there is **no fallback** to another consensus strategy. In a citation registry the dangerous
  failure is a claim quietly *becoming* supported, so every surprise reverts.
