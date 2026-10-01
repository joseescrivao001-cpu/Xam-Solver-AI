export function resolveModelId(model: string | null | undefined): string {
  if (!model) return "llama3.1-70b";
  if (["llama3.1-8b", "llama3.1-70b", "llama3.3-70b", "llama3.2-90b-vision-instruct"].includes(model)) {
    return model;
  }
  if (model.includes("flash") || model.includes("basic") || model === "gpt-oss-120b") {
    return "llama3.1-8b";
  }
  if (model.includes("vision") || model.includes("qwen")) {
    return "llama3.2-90b-vision-instruct";
  }
  if (model.includes("pro") || model.includes("ultra") || model.includes("opus")) {
    return "llama3.1-70b";
  }
  return "llama3.1-70b";
}
