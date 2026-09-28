/** Live CiteGuard deploy on GenLayer Studio Dev (chain 61997). Override via env. */
export const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_CITEGUARD_ADDRESS ||
  "0x78A83b43A44432795A4fb6826Ebb3Cf12042d0b7") as `0x${string}`;

/** Studio Dev / Studio Next — chain ID 61997. */
export const CHAIN_ID = 61997;
export const RPC_URL =
  process.env.NEXT_PUBLIC_GENLAYER_RPC || "https://studio-dev.genlayer.com/api";
export const EXPLORER_BASE =
  process.env.NEXT_PUBLIC_GENLAYER_EXPLORER || "https://explorer-studio-dev.genlayer.com";
export const EXPLORER = `${EXPLORER_BASE}/address/${CONTRACT_ADDRESS}`;
export const txUrl = (hash: string) => `${EXPLORER_BASE}/tx/${hash}`;

export const GITHUB = "https://github.com/valentinzubok/CiteGuard";
export const CONTRACT_REPO = "https://github.com/valentinzubok/CiteGuardCore";

/** The demo source lives in this repository, so every edit to it is a public commit. */
export const DEMO_SOURCE =
  "https://valentinzubok.github.io/CiteGuard/fixtures/report.html";
export const DEMO_CLAIM =
  "The 2026 reserve audit reports 12,400 ETH held in the bridge reserve.";
