/*
 * PaperPilot optional voluntary USDC receiver display/copy.
 * No transfers, wallet connection, RPC calls, account login, checkout,
 * tracking, customer data, signatures or automatic payment.
 * Public address previously advertised by the same beneficial owner's
 * live original VM5 x402 merchant. Not a proof of current key custody.
 */
export const RECEIVER = "0x6b01efA0705E91a7aca54271510bf9e594717f34";
export const NETWORK = "eip155:8453";
export const CIRCLE_USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
export const IS_PAYMENT = false;
export const IS_SERVICE_ORDER = false;
export const SUGGESTED_EXAMPLE_USDC = "1"; // Informational example, no transaction builder.

export async function copyPublicReceiver(clipboard) {
  if (!clipboard || typeof clipboard.writeText !== "function") {
    return { copied: false, reason: "Clipboard unavailable. Select the public address and copy it manually." };
  }
  try {
    await clipboard.writeText(RECEIVER);
    return { copied: true, reason: "Public address copied. Verify receiver, Base network and Circle token in your own wallet before deciding to send anything." };
  } catch {
    return { copied: false, reason: "Clipboard denied by this browser. Select the public address and copy it manually." };
  }
}
