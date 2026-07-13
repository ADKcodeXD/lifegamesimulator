import React, { useState } from "react";
import { CheckCircle2, CircleAlert, Loader2, X } from "lucide-react";
import { IconButton } from "./Common";
import { DEFAULT_LLM_CONFIG, LLM_STORAGE_KEYS } from "../data/llmConfig";
import { testLlmConnection } from "../services/llm";

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
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const saveConfig = () => {
    const nextApiKey = draft.trim();
    const nextEndpoint = endpoint.trim();
    const nextModel = model.trim();
    setApiKey(nextApiKey);
    updateEndpoint?.(nextEndpoint);
    updateModel?.(nextModel);
    localStorage.setItem(LLM_STORAGE_KEYS.apiKey, nextApiKey);
    localStorage.setItem(LLM_STORAGE_KEYS.endpoint, nextEndpoint);
    localStorage.setItem(LLM_STORAGE_KEYS.model, nextModel);
  };
  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      await testLlmConnection({ apiKey: draft, endpoint, model });
      saveConfig();
      onClearNotice?.();
      setTestResult({ type: "success", message: "连接测试成功，配置已保存。" });
    } catch (error) {
      setTestResult({
        type: "error",
        message: error?.message || "连接测试失败，请检查配置。",
      });
    } finally {
      setTesting(false);
    }
  };
  if (!open) return null;
  return (
    <div className="modal-backdrop">
      <div className="modal key-modal">
        <IconButton onClick={onClose}>
          <X size={18} />
        </IconButton>
        <div className="modal-title">
          <span>连接模拟引擎</span>
          <b>让故事引擎接管这个世界。</b>
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
        {testResult && (
          <div className={`connection-test-result ${testResult.type}`}>
            {testResult.type === "success" ? (
              <CheckCircle2 size={16} />
            ) : (
              <CircleAlert size={16} />
            )}
            <span>{testResult.message}</span>
          </div>
        )}
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
            className="ghost"
            onClick={handleTestConnection}
            disabled={testing}
          >
            {testing && <Loader2 className="spin-icon" size={16} />}
            测试链接
          </button>
          <button
            className="primary"
            onClick={() => {
              saveConfig();
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
