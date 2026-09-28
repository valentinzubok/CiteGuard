"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CHAIN_ID,
  CONTRACT_ADDRESS,
  CONTRACT_REPO,
  DEMO_CLAIM,
  DEMO_SOURCE,
  EXPLORER,
  GITHUB,
  txUrl,
} from "@/lib/config";
import {
  getClaim,
  getOwner,
  getStats,
  listAlerts,
  listIds,
  register,
  retract,
  verify,
  type AlertRow,
  type ClaimRow,
  type Stats,
} from "@/lib/contracts";
import { fundWithTestGen, getNativeBalance, type TxStage } from "@/lib/genlayer";
import { useWallet } from "./WalletProvider";

const short = (h: string, n = 10) => (h ? `${h.slice(0, n)}…${h.slice(-4)}` : "—");
const shortHash = (h: string) => (h ? `${h.slice(0, 16)}…` : "—");

const RESULT: Record<string, { text: string; tone: string }> = {
  baseline: { text: "source frozen", tone: "neutral" },
  unchanged: { text: "unchanged", tone: "ok" },
  rewritten_still_supports: { text: "source rewritten · still holds", tone: "ok" },
  no_longer_supports: { text: "no longer supported", tone: "broken" },
  unreachable: { text: "source unreachable", tone: "broken" },
  retracted: { text: "retracted", tone: "neutral" },
};

/** Hero illustration: a citation arrow from a claim to a source that can rot away. */
function Citation() {
  return (
    <div className="citation" aria-hidden="true">
      <div className="quote">
        <span className="ln" />
        <span className="ln short" />
        <span className="ln mid" />
      </div>
      <div className="arrow">
        <span className="shaft" />
        <span className="head" />
      </div>
      <div className="source">
        <span className="ln mid" />
        <span className="ln fading" />
        <span className="ln short" />
      </div>
      <div className="verdicts">
        <span className="holds">still holds</span>
        <span className="rots">source rewritten</span>
      </div>
    </div>
  );
}

export function CiteGuardApp() {
  const { address, provider, connect, error: walletError } = useWallet();
  const [rows, setRows] = useState<ClaimRow[]>([]);
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [owner, setOwner] = useState("");
  const [gen, setGen] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState(false);
  const [tx, setTx] = useState("");
  const [stage, setStage] = useState<TxStage | "">("");

  const [claimId, setClaimId] = useState("audit/2026-b");
  const [claim, setClaim] = useState(DEMO_CLAIM);
  const [sourceUrl, setSourceUrl] = useState(DEMO_SOURCE);
  const [label, setLabel] = useState("Bridge reserve audit");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [ids, o, s, a] = await Promise.all([listIds(), getOwner(), getStats(), listAlerts("")]);
      setOwner(o);
      setStats(s);
      setAlerts(a.slice(0, 8));
      const loaded = await Promise.all(ids.map((id) => getClaim(id)));
      setRows((loaded.filter(Boolean) as ClaimRow[]).reverse());
      if (address) setGen(await getNativeBalance(address));
    } catch (e) {
      setMsg(`Error: ${e instanceof Error ? e.message : "read failed"}`);
      setOk(false);
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  /** ACCEPTED and FINALIZED are different guarantees, so the UI shows both. */
  const onStage = (next: TxStage, hash: string) => {
    setTx(hash);
    setStage(next);
    if (next === "finalized") void refresh();
  };

  const run = async (name: string, fn: () => Promise<string | void>) => {
    if (!address || !provider) {
      setMsg("Connect MetaMask for writes");
      setOk(false);
      return;
    }
    setBusy(name);
    setMsg("");
    setStage("");
    try {
      const hash = await fn();
      if (hash) setTx(hash);
      await refresh();
      setMsg(`${name}: accepted by consensus`);
      setOk(true);
    } catch (e) {
      setMsg(`Error: ${e instanceof Error ? e.message : String(e)}`);
      setOk(false);
    } finally {
      setBusy("");
    }
  };

  const acct = address as `0x${string}`;
  const disabled = !!busy || !address;

  return (
    <main className="wrap">
      <section className="hero">
        <div>
          <h1>
            Cite<span className="accent">Guard</span>
          </h1>
          <p className="lede">
            A claim is filed together with the source that must back it, and GenLayer validators
            freeze that source and agree it really does. Later they re-read <strong>the same
            source</strong> and answer one question: does the citation still hold? Silent edits,
            retractions and link rot stop being invisible.
          </p>
          <div className="chips">
            <span className="chip">
              chain <b>{CHAIN_ID}</b>
            </span>
            {stats && (
              <>
                <span className="chip">
                  claims <b>{stats.claims}</b>
                </span>
                <span className="chip">
                  supported <b>{stats.supported}</b>
                </span>
                <span className="chip hot">
                  broken <b>{stats.broken}</b>
                </span>
                <span className="chip hot">
                  unreachable <b>{stats.unreachable}</b>
                </span>
                <span className="chip">
                  checks <b>{stats.checks}</b>
                </span>
              </>
            )}
          </div>
          <p className="muted" style={{ marginTop: "0.8rem" }}>
            Contract <a href={EXPLORER}>{short(CONTRACT_ADDRESS, 12)}</a> · owner{" "}
            <code>{short(owner)}</code> · <a href={CONTRACT_REPO}>contract source</a> ·{" "}
            <a href={GITHUB}>this console</a>
          </p>
          <div>
            {!address ? (
              <button onClick={() => void connect()}>Connect MetaMask</button>
            ) : (
              <span className="pill">
                <span className="dot" /> {short(address)} · {gen || "?"} GEN
              </span>
            )}
            {address && (
              <button
                className="ghost"
                style={{ marginLeft: "0.5rem" }}
                disabled={!!busy}
                onClick={() =>
                  void run("Get test GEN", async () => {
                    await fundWithTestGen(acct);
                  })
                }
              >
                Get test GEN
              </button>
            )}
          </div>
          {walletError && <p className="msg">{walletError}</p>}
          {msg && <p className={ok ? "okmsg" : "msg"}>{msg}</p>}
          {tx && (
            <p className="tx muted">
              last tx <a href={txUrl(tx)}>{short(tx, 14)}</a>{" "}
              {stage === "finalized" ? (
                <span className="stagepill final">finalized</span>
              ) : (
                <span className="stagepill accepted">accepted — awaiting finalization</span>
              )}
            </p>
          )}
        </div>
        <Citation />
      </section>

      <div className="row">
        <section className="card">
          <h2>1 · File a claim with its source</h2>
          <p className="muted">
            The source is fetched and frozen now, and the validators must agree it supports the
            claim. A citation that does not hold at filing time is refused, so the registry never
            holds an unchecked claim.
          </p>
          <label htmlFor="claimId">Claim id</label>
          <input id="claimId" value={claimId} onChange={(e) => setClaimId(e.target.value)} />
          <label htmlFor="claim">Claim</label>
          <textarea id="claim" rows={3} value={claim} onChange={(e) => setClaim(e.target.value)} />
          <label htmlFor="sourceUrl">Source URL (https)</label>
          <input
            id="sourceUrl"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
          />
          <label htmlFor="label">Label</label>
          <input id="label" value={label} onChange={(e) => setLabel(e.target.value)} />
          <button
            disabled={disabled || !claimId || !claim || !sourceUrl}
            onClick={() =>
              void run("register", () =>
                register(acct, provider, claimId, claim, sourceUrl, label, onStage),
              )
            }
          >
            {busy === "register" ? (
              <span className="working">
                <span className="spinner" /> freezing the source…
              </span>
            ) : (
              "register → freeze the source"
            )}
          </button>
        </section>

        <section className="card">
          <h2>2 · How a re-check decides</h2>
          <ul className="decide">
            <li>
              <span className="tag ok">unchanged</span> byte-identical source: decided
              deterministically, no model spend at all.
            </li>
            <li>
              <span className="tag ok">rewritten · still holds</span> the page changed but still
              states the claim, so the new text becomes the baseline.
            </li>
            <li>
              <span className="tag broken">no longer supported</span> the page no longer states
              it: the claim is marked broken and both hashes are recorded.
            </li>
            <li>
              <span className="tag broken">unreachable</span> the source is gone or empty — link
              rot is a finding, never a silent pass.
            </li>
          </ul>
          <p className="muted">
            A malformed model answer, a model error or a consensus failure reverts the whole
            transaction. Nothing in this registry can <em>become</em> supported by accident.
          </p>
        </section>
      </div>

      <section style={{ marginTop: "2rem" }}>
        <h2>Claims on chain {loading && <span className="spinner" />}</h2>
        {rows.length === 0 && !loading && <p className="muted">No claims yet.</p>}
        {rows.map((r) => {
          const res = RESULT[r.last_result] || { text: r.last_result, tone: "neutral" };
          return (
            <article key={r.claim_id} className={`card claim ${res.tone}`}>
              <div className="head">
                <span className="id">{r.claim_id}</span>
                <span className={`verdict ${res.tone}`}>{res.text}</span>
                <span className="muted">
                  baseline v{r.baseline_version} · {r.checks} checks
                </span>
              </div>
              <p className="claimtext">“{r.claim}”</p>
              <p className="hashline">
                source <a href={r.source_url}>{r.source_url}</a>
              </p>
              <p className="hashline">
                baseline sha-256 <code>{shortHash(r.baseline_hash)}</code> over{" "}
                {r.baseline_chars} chars, {r.judged_chars} judged
                {r.pending_hash && (
                  <>
                    {" "}
                    · current <code>{shortHash(r.pending_hash)}</code>
                  </>
                )}
              </p>
              {r.injection_flags?.length > 0 && (
                <p className="hashline flagged">
                  injection phrasing seen in the data: {r.injection_flags.join(", ")}
                </p>
              )}
              <button
                className="ghost"
                disabled={disabled || r.status === "retracted"}
                onClick={() => void run("verify", () => verify(acct, provider, r.claim_id, onStage))}
              >
                verify now
              </button>
              {address && address.toLowerCase() === r.publisher.toLowerCase() && (
                <button
                  className="ghost"
                  style={{ marginLeft: "0.5rem" }}
                  disabled={disabled}
                  onClick={() =>
                    void run("retract", () => retract(acct, provider, r.claim_id, onStage))
                  }
                >
                  retract
                </button>
              )}
            </article>
          );
        })}
      </section>

      <section style={{ marginTop: "2rem" }}>
        <h2>Alert timeline</h2>
        {alerts.length === 0 ? (
          <p className="muted">No alerts yet.</p>
        ) : (
          <ul className="timeline">
            {alerts.map((a) => (
              <li
                key={a.alert_id}
                className={a.kind === "rewritten_still_supports" ? "" : "broken"}
              >
                <strong>{RESULT[a.kind]?.text || a.kind}</strong> · {a.claim_id}{" "}
                <span className="muted">
                  {a.detail} · {shortHash(a.previous_hash)} → {shortHash(a.current_hash)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer className="foot">
        CiteGuard on GenLayer Studio Dev (chain {CHAIN_ID}). Reads work without a wallet; writes
        need MetaMask and test GEN for fees. The demo source is a file in this repository, so every
        edit it reacts to is a public commit. Contract source:{" "}
        <a href={CONTRACT_REPO}>CiteGuardCore</a>.
      </footer>
    </main>
  );
}
