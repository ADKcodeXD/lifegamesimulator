export const DEFAULT_LLM_CONFIG = {
  endpoint: "https://api.apifast.tech/v1",
  model: "gemini-3-flash-preview-maxthinking",
} as const;

export const LLM_STORAGE_KEYS = {
  apiKey: "life_api_key",
  endpoint: "life_endpoint",
  model: "life_model",
} as const;
