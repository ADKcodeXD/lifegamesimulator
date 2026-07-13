import React, { useEffect, useMemo, useState } from "react";
import { Bot, Check, Clock3, ShieldAlert, Sparkles } from "lucide-react";

const TIMEOUT_SECONDS = 50;

export default function ApprovalRequest({ request, onResolve }) {
  const [secondsLeft, setSecondsLeft] = useState(TIMEOUT_SECONDS);
  const options = request?.options || [];
  const defaultOption = useMemo(
    () =>
      options.find((option) => option.id === request?.defaultOptionId) ||
      options.find((option) => option.recommended) ||
      options[0],
    [options, request?.defaultOptionId],
  );

  useEffect(() => {
    if (!request || !defaultOption) return undefined;
    setSecondsLeft(TIMEOUT_SECONDS);
    const timer = window.setInterval(() => {
      setSecondsLeft((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          onResolve(defaultOption, true);
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [request, defaultOption, onResolve]);

  if (!request) return null;
  return (
    <div className="approval-backdrop" role="dialog" aria-modal="true">
      <section className="approval-request">
        <header>
          <span className="approval-agent-icon">
            <Bot size={21} />
          </span>
          <div>
            <small>LLM AGENT · REQUESTING APPROVAL</small>
            <b>主角需要你的临时授权</b>
          </div>
          <span className="approval-timer">
            <Clock3 size={15} /> {secondsLeft}s
          </span>
        </header>
        <div className="approval-progress">
          <i style={{ width: `${(secondsLeft / TIMEOUT_SECONDS) * 100}%` }} />
        </div>
        <div className="approval-context">
          <span>
            <Sparkles size={15} /> 随机人生分岔
          </span>
          <h3>{request.title}</h3>
          <p>{request.context}</p>
          {request.agentThought && (
            <blockquote>{request.agentThought}</blockquote>
          )}
        </div>
        <div className="approval-options">
          {options.map((option) => {
            const recommended = option.id === defaultOption?.id;
            return (
              <button
                type="button"
                key={option.id}
                className={recommended ? "recommended" : ""}
                onClick={() => onResolve(option, false)}
              >
                <span className="approval-radio">
                  {recommended ? <Check size={14} /> : null}
                </span>
                <span>
                  <b>{option.label}</b>
                  <small>{option.description}</small>
                  <em>{option.impact}</em>
                </span>
                {recommended && <strong>推荐</strong>}
              </button>
            );
          })}
        </div>
        <footer>
          <ShieldAlert size={15} />
          <span>
            若不操作，倒计时结束后 Agent 将自动采用推荐方案并继续推演。
          </span>
        </footer>
      </section>
    </div>
  );
}
