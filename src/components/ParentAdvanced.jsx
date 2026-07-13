import React from "react";
import { Dices } from "lucide-react";

export default function ParentAdvanced({
  parents,
  familyLabel,
  startAge,
  onChange,
  onGenerate,
  generating,
}) {
  const updateParent = (index, patch) => {
    onChange(
      parents.map((parent, parentIndex) =>
        parentIndex === index ? { ...parent, ...patch } : parent,
      ),
    );
  };

  return (
    <details className="parent-advanced">
      <summary>
        <span>
          <b>父母人物档案</b>
          <small>当前使用{familyLabel}家庭模板，可进阶编辑</small>
        </span>
        <em>进阶设置</em>
      </summary>
      <div className="parent-advanced-body">
        <div className="parent-advanced-head">
          <p>
            父母职业、性格与生平会进入关系网络，并持续影响主角的资源、压力和人生选择。
          </p>
          <button type="button" onClick={onGenerate} disabled={generating}>
            {generating ? (
              <>
                <i className="typing" /> 生成父母中
              </>
            ) : (
              <>
                <Dices size={14} /> 重新生成父母档案
              </>
            )}
          </button>
        </div>
        <div className="parent-card-grid">
          {parents.map((parent, index) => (
            <section className="parent-edit-card" key={parent.name || index}>
              <header>
                <span>{parent.emoji || (index === 0 ? "👨🏻" : "👩🏻")}</span>
                <div>
                  <b>{parent.name || (index === 0 ? "父亲" : "母亲")}</b>
                  <small>{parent.role || "职业待设置"}</small>
                </div>
              </header>
              <div className="parent-inline-fields">
                <label>
                  年龄
                  <input
                    type="number"
                    min={Math.max(18, startAge + 16)}
                    max="100"
                    value={parent.age || ""}
                    onChange={(event) =>
                      updateParent(index, { age: +event.target.value })
                    }
                  />
                </label>
                <label>
                  职业 / 身份
                  <input
                    value={parent.role || ""}
                    onChange={(event) =>
                      updateParent(index, { role: event.target.value })
                    }
                  />
                </label>
              </div>
              <label>
                性格
                <textarea
                  value={parent.personality || ""}
                  onChange={(event) =>
                    updateParent(index, { personality: event.target.value })
                  }
                />
              </label>
              <label>
                生平与职业经历
                <textarea
                  value={parent.background || ""}
                  onChange={(event) =>
                    updateParent(index, { background: event.target.value })
                  }
                />
              </label>
              <label>
                核心动机
                <input
                  value={parent.motivation || ""}
                  onChange={(event) =>
                    updateParent(index, { motivation: event.target.value })
                  }
                />
              </label>
              <label>
                潜在冲突
                <input
                  value={parent.potentialConflict || ""}
                  onChange={(event) =>
                    updateParent(index, {
                      potentialConflict: event.target.value,
                    })
                  }
                />
              </label>
            </section>
          ))}
        </div>
      </div>
    </details>
  );
}
