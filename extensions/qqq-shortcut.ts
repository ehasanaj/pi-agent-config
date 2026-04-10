import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

const EXPANSION = "If something is unclear, ask me questions DO NOT ASSUME!";

export default function (pi: ExtensionAPI) {
  pi.on("input", async (event) => {
    if (event.source === "extension") {
      return { action: "continue" };
    }

    if (!event.text.includes("qqq")) {
      return { action: "continue" };
    }

    return {
      action: "transform",
      text: event.text.replace(/qqq/g, EXPANSION),
    };
  });
}
