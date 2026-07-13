import React, { useState } from "react";
import { CircleAlert, X } from "lucide-react";
import { IconButton } from "./Common";
import { DEFAULT_LLM_CONFIG, LLM_STORAGE_KEYS } from "../data/llmConfig";

export default function KeyModal({
  open,
  onClose,
  apiKey,
  setApiKey,
  endpoint: configuredEndpoint,
  setEndpoint: updateEndpoint,
  model: configuredModel,
  setModel: updateModel,
  notice,
  onClearNotice,
}) {
  const [draft, setDraft] = useState(apiKey);
  const [endpoint, setEndpoint] = useState(
    configuredEndpoint ||
      localStorage.getItem(LLM_STORAGE_KEYS.endpoint) ||
      DEFAULT_LLM_CONFIG.endpoint,
  );
  const [model, setModel] = useState(
    configuredModel ||
      localStorage.getItem(LLM_STORAGE_KEYS.model) ||
      DEFAULT_LLM_CONFIG.model,
  );
  if (!open) return null;
  return (
    <div className="modal-backdrop">
      <div className="modal key-modal">
        <IconButton onClick={onClose}>
          <X size={18} />
        </IconButton>
        <div className="modal-title">
          <span>连接模拟引擎</span>
          <b>让 LLM 接管整个世界。</b>
        </div>
        {notice && (
          <div className="connection-notice" role="alert">
            <CircleAlert size={17} />
            <span>{notice}</span>
          </div>
        )}
        <label>
          兼容接口
          <input
            value={endpoint}
            onChange={(e) => setEndpoint(e.target.value)}
            placeholder="https://.../v1"
          />
        </label>
        <label>
          模型
          <input value={model} onChange={(e) => setModel(e.target.value)} />
        </label>
        <label>
          API Key
          <input
            type="password"
            placeholder="sk-..."
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
        </label>
        <p className="helper">
          Key
          仅保存在当前浏览器。纯前端直连适合本地原型，正式上线应使用服务端代理。
        </p>
        <div className="modal-actions">
          <button
            className="ghost"
            onClick={() => {
              setApiKey("");
              localStorage.removeItem(LLM_STORAGE_KEYS.apiKey);
              onClearNotice?.();
              onClose();
            }}
          >
            清除 Key
          </button>
          <button
            className="primary"
            onClick={() => {
              setApiKey(draft.trim());
              updateEndpoint?.(endpoint);
              updateModel?.(model);
              localStorage.setItem(LLM_STORAGE_KEYS.apiKey, draft.trim());
              localStorage.setItem(LLM_STORAGE_KEYS.endpoint, endpoint);
              localStorage.setItem(LLM_STORAGE_KEYS.model, model);
              onClearNotice?.();
              onClose();
            }}
          >
            保存并启用
          </button>
        </div>
      </div>
    </div>
  );
}
