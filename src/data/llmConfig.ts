export const DEFAULT_LLM_CONFIG = {
  endpoint: "https://api.deepseek.com",
  model: "deepseek-v4-flash",
} as const;

export const LLM_STORAGE_KEYS = {
  apiKey: "life_api_key",
  endpoint: "life_endpoint",
  model: "life_model",
} as const;
