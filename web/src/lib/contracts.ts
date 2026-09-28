import { CONTRACT_ADDRESS } from "./config";
import { type Address, type TxStage, parseJson, readContract, writeAndWait } from "./genlayer";

export type ClaimRow = {
  claim_id: string;
  claim: string;
  label: string;
  source_url: string;
  publisher: string;
  status: string;
  baseline_hash: string;
  baseline_version: number;
  baseline_chars: number;
  judged_chars: number;
  pending_hash: string;
  checks: number;
  last_result: string;
  last_alert_id: string;
  injection_flags: string[];
};

export type AlertRow = {
  alert_id: string;
  claim_id: string;
  kind: string;
  label: string;
  source_url: string;
  previous_hash: string;
  current_hash: string;
  baseline_version: number;
  detail: string;
  raised_by: string;
};

export type Stats = {
  claims: number;
  supported: number;
  broken: number;
  unreachable: number;
  retracted: number;
  checks: number;
  alerts: number;
};

export async function listIds(): Promise<string[]> {
  return parseJson<string[]>(await readContract<string>(CONTRACT_ADDRESS, "list_ids", []), []);
}

export async function getClaim(id: string): Promise<ClaimRow | null> {
  const raw = await readContract<string>(CONTRACT_ADDRESS, "get_claim", [id]);
  const parsed = parseJson<ClaimRow & { error?: string }>(raw, {} as ClaimRow);
  return parsed.claim_id ? parsed : null;
}

export async function listAlerts(claimId = ""): Promise<AlertRow[]> {
  const raw = await readContract<string>(CONTRACT_ADDRESS, "list_alerts", [claimId]);
  return parseJson<AlertRow[]>(raw, []);
}

export async function getStats(): Promise<Stats | null> {
  return parseJson<Stats | null>(
    await readContract<string>(CONTRACT_ADDRESS, "get_stats", []),
    null,
  );
}

export async function getOwner(): Promise<string> {
  return (await readContract<string>(CONTRACT_ADDRESS, "get_owner", [])) || "";
}

export async function register(
  account: Address,
  provider: unknown,
  claimId: string,
  claim: string,
  sourceUrl: string,
  label: string,
  onStage?: (stage: TxStage, hash: string) => void,
) {
  return writeAndWait(
    account,
    provider,
    CONTRACT_ADDRESS,
    "register",
    [claimId, claim, sourceUrl, label],
    onStage,
  );
}

export async function verify(
  account: Address,
  provider: unknown,
  claimId: string,
  onStage?: (stage: TxStage, hash: string) => void,
) {
  return writeAndWait(account, provider, CONTRACT_ADDRESS, "verify", [claimId], onStage);
}

export async function retract(
  account: Address,
  provider: unknown,
  claimId: string,
  onStage?: (stage: TxStage, hash: string) => void,
) {
  return writeAndWait(account, provider, CONTRACT_ADDRESS, "retract", [claimId], onStage);
}
