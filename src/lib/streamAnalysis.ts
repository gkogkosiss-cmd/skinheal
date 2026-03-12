import { EDGE_FUNCTIONS_URL, EDGE_FUNCTIONS_KEY } from "@/lib/supabase";

/**
 * Detected sections from streamed JSON for progress tracking.
 * Maps JSON key patterns to loading step indices.
 */
const SECTION_MARKERS = [
  { pattern: /"bodyArea"/, step: 0 },
  { pattern: /"skinScore"/, step: 1 },
  { pattern: /"conditions"/, step: 2 },
  { pattern: /"rootCauses"/, step: 3 },
  { pattern: /"healingProtocol"/, step: 4 },
  { pattern: /"sevenDayMealPlan"/, step: 5 },
];

export interface StreamCallbacks {
  onProgress: (stepIndex: number) => void;
  onComplete: (parsed: any) => void;
  onError: (error: Error) => void;
}

/** Repair common LLM JSON issues (trailing commas, etc.) */
const repairJson = (raw: string): string => {
  let fixed = raw;
  fixed = fixed.replace(/,\s*([}\]])/g, "$1");
  return fixed;
};

/** Multi-strategy JSON extraction */
const extractJson = (content: string): any | null => {
  let cleaned = content.trim();

  // Strip markdown code fences
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
  }

  // Attempt 1: Direct
  try { return JSON.parse(cleaned); } catch { /* continue */ }

  // Attempt 2: Repair then parse
  try { return JSON.parse(repairJson(cleaned)); } catch { /* continue */ }

  // Attempt 3: Brace matching
  const startIdx = content.indexOf("{");
  const endIdx = content.lastIndexOf("}");
  if (startIdx !== -1 && endIdx > startIdx) {
    const sliced = content.slice(startIdx, endIdx + 1);
    try { return JSON.parse(sliced); } catch { /* continue */ }
    try { return JSON.parse(repairJson(sliced)); } catch { /* continue */ }
  }

  return null;
};

/**
 * Stream the full skin analysis from the edge function via SSE.
 * Accumulates JSON text and fires progress callbacks as sections are detected.
 */
export async function streamSkinAnalysis(
  body: Record<string, unknown>,
  callbacks: StreamCallbacks,
  signal?: AbortSignal
): Promise<void> {
  const resp = await fetch(`${EDGE_FUNCTIONS_URL}/analyze-skin`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: EDGE_FUNCTIONS_KEY,
      Authorization: `Bearer ${EDGE_FUNCTIONS_KEY}`,
    },
    body: JSON.stringify({ ...body, stream: true }),
    signal,
  });

  // Check for non-streaming error responses
  const contentType = resp.headers.get("content-type") || "";
  if (!resp.ok || !contentType.includes("text/event-stream")) {
    let errorMsg = "Analysis is taking longer than usual. Please try again.";
    try {
      const errData = await resp.json();
      errorMsg = errData?.error || errorMsg;
    } catch {
      // ignore parse failures
    }
    callbacks.onError(new Error(errorMsg));
    return;
  }

  if (!resp.body) {
    callbacks.onError(new Error("Analysis is taking longer than usual. Please try again."));
    return;
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let textBuffer = "";
  let fullContent = "";
  let streamDone = false;
  const detectedSteps = new Set<number>();

  // Fire initial progress
  callbacks.onProgress(0);

  // Stall detection: if no data for 45s, consider it stalled
  let lastDataTime = Date.now();
  const STALL_TIMEOUT = 45000;

  while (!streamDone) {
    const { done, value } = await reader.read();
    if (done) break;

    lastDataTime = Date.now();
    textBuffer += decoder.decode(value, { stream: true });

    let newlineIndex: number;
    while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
      let line = textBuffer.slice(0, newlineIndex);
      textBuffer = textBuffer.slice(newlineIndex + 1);

      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (line.startsWith(":") || line.trim() === "") continue;
      if (!line.startsWith("data: ")) continue;

      const jsonStr = line.slice(6).trim();
      if (jsonStr === "[DONE]") {
        streamDone = true;
        break;
      }

      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (content) {
          fullContent += content;

          // Detect which sections have appeared
          for (const marker of SECTION_MARKERS) {
            if (!detectedSteps.has(marker.step) && marker.pattern.test(fullContent)) {
              detectedSteps.add(marker.step);
              callbacks.onProgress(marker.step);
            }
          }
        }
      } catch {
        // Partial JSON across chunks — put back and wait
        textBuffer = line + "\n" + textBuffer;
        break;
      }
    }

    // Stall check
    if (Date.now() - lastDataTime > STALL_TIMEOUT) {
      console.warn("[streamAnalysis] stream stalled, attempting to parse accumulated content");
      break;
    }
  }

  // Final flush
  if (textBuffer.trim()) {
    for (let raw of textBuffer.split("\n")) {
      if (!raw) continue;
      if (raw.endsWith("\r")) raw = raw.slice(0, -1);
      if (raw.startsWith(":") || raw.trim() === "") continue;
      if (!raw.startsWith("data: ")) continue;
      const jsonStr = raw.slice(6).trim();
      if (jsonStr === "[DONE]") continue;
      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (content) fullContent += content;
      } catch { /* ignore */ }
    }
  }

  // Parse the accumulated JSON with robust extraction
  const result = extractJson(fullContent);
  if (result && typeof result === "object") {
    callbacks.onComplete(result);
  } else {
    callbacks.onError(new Error("Analysis is taking longer than usual. Please try again."));
  }
}
