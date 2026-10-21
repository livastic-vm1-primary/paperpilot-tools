import { RECEIVER, copyPublicReceiver } from "./koinly-optional-support.mjs";

const button = document.getElementById("copy-voluntary-receiver");
const output = document.getElementById("voluntary-receiver-status");
const address = document.getElementById("voluntary-receiver-address");

// Fail closed if the static page and the original public owner receiver differ.
if (button && output && address && address.textContent.trim() === RECEIVER) {
  let busy = false;
  button.addEventListener("click", async () => {
    if (busy) return;
    busy = true;
    button.disabled = true;
    try {
      const res = await copyPublicReceiver(navigator.clipboard);
      output.textContent = res.reason;
    } finally {
      button.disabled = false;
      busy = false;
    }
  });
} else if (button && output) {
  button.disabled = true;
  output.textContent = "Receiver details are inconsistent; copying is disabled.";
}
