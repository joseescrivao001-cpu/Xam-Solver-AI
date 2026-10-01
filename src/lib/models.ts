
export function resolveModelId(model: string | null | undefined): string {
  if (!model) return "gpt-oss-120b";
  
  const m = model.toLowerCase();
  if (m.includes("vision") || m.includes("qwen") || m.includes("opus")) {
    return "qwen-3.8-27b";
  }

  return "gpt-oss-120b";
}

