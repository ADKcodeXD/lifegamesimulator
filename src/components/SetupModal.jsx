import React, { useRef, useState } from "react";
import {
  ArrowRight,
  CircleAlert,
  Dices,
  Plus,
  Sparkles,
  X,
} from "lucide-react";
import { IconButton } from "./Common";
import ParentAdvanced from "./ParentAdvanced";
import { BODY_TYPES } from "../simulation/bodyModel";
import { FAMILY_LEVELS, parentsForFamily } from "../data/family";
import {
  CITY_PRESETS,
  DEFAULT_FEMALE_BIO,
  DEFAULT_MALE_BIO,
  FREEDOM_LEVELS,
  TALENT_TIPS,
  TRAIT_TIPS,
} from "../data/setupConfig";

const money = (value) =>
  new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 0 }).format(
    value || 0,
  );
const avatarFor = (age, gender) => {
  if (age < 4) return "👶🏻";
  if (age < 12) return gender === "女" ? "👧🏻" : "👦🏻";
  if (age < 23) return gender === "女" ? "👩🏻‍🎓" : "🧑🏻‍🎓";
  if (age < 60) return gender === "女" ? "👩🏻" : "🧑🏻";
  return gender === "女" ? "👵🏻" : "👴🏻";
};

const radarPoint = (index, total, radius, center = 110) => {
  const angle = -Math.PI / 2 + (index * Math.PI * 2) / total;
  return {
    x: center + Math.cos(angle) * radius,
    y: center + Math.sin(angle) * radius,
  };
};

function AttributeRadar({ talents, traits }) {
  const attributes = [
    ...Object.entries(talents).map(([name, value]) => ({
      name,
      value,
      type: "能力",
    })),
    ...Object.entries(traits).map(([name, value]) => ({
      name,
      value,
      type: "人格",
    })),
  ];
  const total = attributes.length;
  const radius = 72;
  const gridLevels = [0.25, 0.5, 0.75, 1];
  const polygon = (scale) =>
    attributes
      .map((_, index) => {
        const point = radarPoint(index, total, radius * scale);
        return `${point.x},${point.y}`;
      })
      .join(" ");
  const valuePolygon = attributes
    .map((attribute, index) => {
      const point = radarPoint(
        index,
        total,
        radius * (Number(attribute.value) / 100),
      );
      return `${point.x},${point.y}`;
    })
    .join(" ");

  return (
    <div className="attribute-radar">
      <svg viewBox="0 0 220 220" role="img" aria-label="人物能力与人格雷达图">
        {gridLevels.map((level) => (
          <polygon className="radar-grid" points={polygon(level)} key={level} />
        ))}
        {attributes.map((attribute, index) => {
          const end = radarPoint(index, total, radius);
          return (
            <line
              className="radar-axis"
              x1="110"
              y1="110"
              x2={end.x}
              y2={end.y}
              key={attribute.name}
            />
          );
        })}
        <polygon className="radar-value" points={valuePolygon} />
        {attributes.map((attribute, index) => {
          const point = radarPoint(
            index,
            total,
            radius * (Number(attribute.value) / 100),
          );
          return (
            <circle
              className="radar-dot"
              cx={point.x}
              cy={point.y}
              r="3"
              key={attribute.name}
            />
          );
        })}
        {attributes.map((attribute, index) => {
          const label = radarPoint(index, total, 94);
          return (
            <text
              className={`radar-label radar-label-${attribute.type}`}
              x={label.x}
              y={label.y}
              textAnchor="middle"
              key={attribute.name}
            >
              <tspan x={label.x} dy="-0.15em">
                {attribute.name}
              </tspan>
              <tspan className="radar-label-value" x={label.x} dy="1.15em">
                {attribute.value}
              </tspan>
            </text>
          );
        })}
      </svg>
      <div className="radar-legend" aria-hidden="true">
        <span>能力</span>
        <span>人格倾向</span>
      </div>
    </div>
  );
}

export default function SetupModal({
  open,
  onClose,
  onStart,
  settings,
  setSettings,
  error,
  onClearError,
  llmConfigured,
  onGenerateProfile,
  profileGenerating,
  onGenerateParents,
  parentGenerating,
}) {
  const [tab, setTab] = useState("person");
  const [startError, setStartError] = useState("");
  const nameInputRef = useRef(null);
  const heightInputRef = useRef(null);
  if (!open) return null;
  const parents = settings.parents || parentsForFamily(settings.family);
  return (
    <div className="modal-backdrop">
      <div className="modal setup-modal">
        <IconButton onClick={onClose}>
          <X size={18} />
        </IconButton>
        <div className="modal-title">
          <span>初始化模拟宇宙</span>
          <b>只给边界，不替人生写答案。</b>
        </div>
        <div className="tabs">
          <button
            className={tab === "person" ? "active" : ""}
            onClick={() => setTab("person")}
          >
            01 人物档案
          </button>
          <button
            className={tab === "world" ? "active" : ""}
            onClick={() => setTab("world")}
          >
            02 社会背景
          </button>
          <button
            className={tab === "rules" ? "active" : ""}
            onClick={() => setTab("rules")}
          >
            03 人生引导
          </button>
        </div>
        {error && (
          <div className="setup-inline-error" role="alert">
            <CircleAlert size={17} />
            <span>{error}</span>
            <button onClick={onClearError} aria-label="关闭错误提示">
              <X size={14} />
            </button>
          </div>
        )}
        {tab === "world" && (
          <div className="setup-content">
            <div className="world-presets">
              <label>选择城市 / 国家（点击自动填充背景设定）</label>
              {Object.entries(CITY_PRESETS).map(([country, cities]) => (
                <div className="world-preset-group" key={country}>
                  <span>{country}</span>
                  {cities.map((c) => (
                    <button
                      key={c.name}
                      className={
                        "world-preset-btn" +
                        (settings.world === c.seed ? " active" : "")
                      }
                      onClick={() =>
                        setSettings({ ...settings, world: c.seed })
                      }
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              ))}
            </div>
            <label>
              社会背景种子（可手动编辑）
              <textarea
                value={settings.world}
                onChange={(e) =>
                  setSettings({ ...settings, world: e.target.value })
                }
              />
            </label>
            <p className="helper">
              这不是固定世界观。每一轮故事引擎都会继承既有世界记忆，
              自主判断经济、政策、科技与社会情绪是否出现新的变化。
            </p>
            <div className="generator-note">
              <Sparkles size={18} />
              <span>
                <b>无预设事件池</b>
                <small>
                  月份事件、机会、灾难、市场收益与人物均由模型按当前状态现场生成。
                </small>
              </span>
            </div>
          </div>
        )}
        {tab === "person" && (
          <div className="setup-content person-setup">
            <div className="avatar-line">
              <div className="big-avatar">
                {avatarFor(settings.startAge, settings.gender)}
              </div>
              <div>
                <b>
                  {settings.name || "未命名"} · {settings.startAge} 岁 ·{" "}
                  {settings.gender}
                </b>
                <span>
                  {FAMILY_LEVELS[settings.family].label}家庭 / 初始资金 ¥
                  {money(settings.initialCash)} /{" "}
                  {settings.world.split(/[。；]/)[0]}
                </span>
              </div>
              <button
                className="profile-gen-btn"
                onClick={onGenerateProfile}
                disabled={profileGenerating}
              >
                {profileGenerating ? (
                  <>
                    <i className="typing" />
                    生成中
                  </>
                ) : (
                  <>
                    <Dices size={14} /> 智能生成人设
                  </>
                )}
              </button>
            </div>
            <section
              className="attribute-panel"
              aria-labelledby="attribute-title"
            >
              <div className="attribute-panel-head">
                <span>
                  <b id="attribute-title">数值设定</b>
                  <small>随机人设会依据这些数值生成，不会修改它们</small>
                </span>
                <em>0 — 100</em>
              </div>
              <div className="attribute-panel-body">
                <AttributeRadar
                  talents={settings.talents}
                  traits={settings.traits}
                />
                <div className="attribute-controls">
                  <div className="attribute-group">
                    <b>能力</b>
                    {Object.entries(settings.talents).map(([k, v]) => (
                      <label
                        className="attribute-range"
                        key={k}
                        title={TALENT_TIPS[k]}
                      >
                        <span>{k}</span>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={v}
                          disabled={profileGenerating}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              talents: {
                                ...settings.talents,
                                [k]: +e.target.value,
                              },
                            })
                          }
                        />
                        <strong>{v}</strong>
                      </label>
                    ))}
                  </div>
                  <div className="attribute-group">
                    <b>人格倾向</b>
                    {Object.entries(settings.traits).map(([k, v]) => (
                      <label
                        className="attribute-range"
                        key={k}
                        title={TRAIT_TIPS[k]}
                      >
                        <span>{k}</span>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={v}
                          disabled={profileGenerating}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              traits: {
                                ...settings.traits,
                                [k]: +e.target.value,
                              },
                            })
                          }
                        />
                        <strong>{v}</strong>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </section>
            <div className="identity-grid">
              <label>
                主角姓名
                <input
                  ref={nameInputRef}
                  value={settings.name}
                  maxLength={12}
                  aria-invalid={Boolean(startError && !settings.name.trim())}
                  onChange={(e) => {
                    setStartError("");
                    setSettings({ ...settings, name: e.target.value });
                  }}
                  placeholder="输入姓名"
                />
              </label>
              <label>
                初始年龄
                <input
                  type="number"
                  min="0"
                  max="80"
                  value={settings.startAge}
                  onChange={(e) =>
                    (() => {
                      const nextAge = Math.max(
                        0,
                        Math.min(80, +e.target.value),
                      );
                      setSettings({
                        ...settings,
                        startAge: nextAge,
                        bio: {
                          ...settings.bio,
                          childhood: nextAge >= 6 ? settings.bio.childhood : "",
                          school: nextAge >= 12 ? settings.bio.school : "",
                        },
                      });
                    })()
                  }
                />
              </label>
              <label>
                性别
                <div className="segmented">
                  {["男", "女"].map((x) => (
                    <button
                      className={settings.gender === x ? "active" : ""}
                      onClick={() => {
                        const isDef =
                          JSON.stringify(settings.bio) ===
                            JSON.stringify(DEFAULT_MALE_BIO) ||
                          JSON.stringify(settings.bio) ===
                            JSON.stringify(DEFAULT_FEMALE_BIO);
                        setSettings({
                          ...settings,
                          gender: x,
                          physicalProfile: {
                            ...settings.physicalProfile,
                            adultHeightCm:
                              settings.physicalProfile?.adultHeightCm ===
                              (settings.gender === "女" ? 163 : 175)
                                ? x === "女"
                                  ? 163
                                  : 175
                                : settings.physicalProfile?.adultHeightCm,
                          },
                          bio: isDef
                            ? x === "女"
                              ? DEFAULT_FEMALE_BIO
                              : DEFAULT_MALE_BIO
                            : settings.bio,
                        });
                      }}
                      key={x}
                    >
                      {x}
                    </button>
                  ))}
                </div>
              </label>
              <label>
                成年最终身高（cm）
                <input
                  ref={heightInputRef}
                  type="number"
                  inputMode="decimal"
                  value={settings.physicalProfile?.adultHeightCm ?? 175}
                  aria-invalid={Boolean(startError && /身高/.test(startError))}
                  onChange={(e) => {
                    setStartError("");
                    setSettings({
                      ...settings,
                      physicalProfile: {
                        ...settings.physicalProfile,
                        adultHeightCm: e.target.value,
                      },
                    });
                  }}
                />
                <small className="field-helper">
                  输入时不截断，启动模拟时统一校验
                </small>
              </label>
              <label>
                初始身材
                <select
                  value={settings.physicalProfile?.initialBodyType || "匀称"}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      physicalProfile: {
                        ...settings.physicalProfile,
                        initialBodyType: e.target.value,
                      },
                    })
                  }
                >
                  {BODY_TYPES.map((bodyType) => (
                    <option value={bodyType} key={bodyType}>
                      {bodyType}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                家庭条件
                <select
                  value={settings.family}
                  onChange={(e) => {
                    const family = e.target.value;
                    setSettings({
                      ...settings,
                      family,
                      parents: parentsForFamily(family),
                    });
                  }}
                >
                  <option value="destitute">赤贫</option>
                  <option value="poor">贫穷</option>
                  <option value="modest">小康</option>
                  <option value="middle">中产</option>
                  <option value="affluent">富裕</option>
                  <option value="rich2nd">富二代</option>
                </select>
              </label>
              <label className="cash-field">
                独立初始资金（没钱可以打工赚）
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={settings.initialCash}
                  onChange={(e) =>
                    setSettings({ ...settings, initialCash: +e.target.value })
                  }
                />
              </label>
            </div>
            <div className="family-meter">
              <div>
                <b>{FAMILY_LEVELS[settings.family].label}家庭</b>
                <span>{FAMILY_LEVELS[settings.family].netWorth}</span>
              </div>
              <small>
                {FAMILY_LEVELS[settings.family].income} ·{" "}
                {FAMILY_LEVELS[settings.family].support}
              </small>
            </div>
            <ParentAdvanced
              parents={parents}
              familyLabel={FAMILY_LEVELS[settings.family].label}
              startAge={settings.startAge}
              onChange={(nextParents) =>
                setSettings({ ...settings, parents: nextParents })
              }
              onGenerate={onGenerateParents}
              generating={parentGenerating}
            />
            <div className="bio-grid">
              {settings.startAge < 6 && (
                <p className="age-bio-note">
                  当前从 {settings.startAge}{" "}
                  岁开始，童年经历会在模拟过程中逐步形成。
                </p>
              )}
              {settings.startAge >= 6 && (
                <label>
                  童年经历
                  <textarea
                    value={settings.bio.childhood}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        bio: { ...settings.bio, childhood: e.target.value },
                      })
                    }
                    placeholder="小时候在哪里长大，经历过什么…"
                  />
                </label>
              )}
              {settings.startAge >= 12 && (
                <label>
                  中学经历
                  <textarea
                    value={settings.bio.school}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        bio: { ...settings.bio, school: e.target.value },
                      })
                    }
                    placeholder="中学成绩、朋友和重要转折…"
                  />
                </label>
              )}
              <label>
                性格成因
                <textarea
                  value={settings.bio.personality}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      bio: { ...settings.bio, personality: e.target.value },
                    })
                  }
                  placeholder="性格如何形成…"
                />
              </label>
              <label>
                兴趣爱好
                <input
                  value={settings.bio.hobbies}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      bio: { ...settings.bio, hobbies: e.target.value },
                    })
                  }
                  placeholder="篮球、摄影、编程…"
                />
              </label>
            </div>
          </div>
        )}
        {tab === "rules" && (
          <div className="setup-content">
            <p className="helper">
              这里填写的只是人生情境提示，不是目标或必经剧本。它可能延后、错过、被拒绝或完全不发生，也不保证结果成功。
            </p>
            <div className="end-age-setting">
              <label>
                自动暂停年龄
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={settings.endAge}
                  onChange={(e) =>
                    setSettings({ ...settings, endAge: +e.target.value })
                  }
                />
              </label>
              <span>
                到 {settings.endAge}{" "}
                岁仅暂停并生成阶段总结，不代表死亡，之后仍可继续推演
              </span>
            </div>
            <div className="time-granularity">
              <label>每轮时间跨度</label>
              <select
                value={settings.monthsPerTurn}
                onChange={(e) =>
                  setSettings({ ...settings, monthsPerTurn: +e.target.value })
                }
              >
                <option value={1}>1 个月</option>
                <option value={3}>3 个月（季度）</option>
                <option value={6}>6 个月（半年）</option>
                <option value={12}>12 个月（一年）</option>
              </select>
              <span className="hint">跨度越大，模拟越快，但细节越少</span>
            </div>
            <div className="freedom-setting">
              <div>
                <b>人生自由度</b>
                <span>
                  {FREEDOM_LEVELS[settings.freedomLevel]?.description ||
                    FREEDOM_LEVELS.medium.description}
                </span>
              </div>
              <div className="segmented" aria-label="人生自由度">
                {Object.entries(FREEDOM_LEVELS).map(([key, level]) => (
                  <button
                    type="button"
                    className={settings.freedomLevel === key ? "active" : ""}
                    key={key}
                    onClick={() =>
                      setSettings({ ...settings, freedomLevel: key })
                    }
                  >
                    {level.label}
                    <small>{level.optionCount} 个选项</small>
                  </button>
                ))}
              </div>
            </div>
            {settings.constraints.map((c, i) => (
              <div className="constraint-edit" key={i}>
                <input
                  type="number"
                  min="0"
                  max="99"
                  value={c.age}
                  onChange={(e) => {
                    const n = [...settings.constraints];
                    n[i] = { ...c, age: +e.target.value };
                    setSettings({ ...settings, constraints: n });
                  }}
                />
                <input
                  value={c.title}
                  onChange={(e) => {
                    const n = [...settings.constraints];
                    n[i] = { ...c, title: e.target.value };
                    setSettings({ ...settings, constraints: n });
                  }}
                />
                <button
                  onClick={() =>
                    setSettings({
                      ...settings,
                      constraints: settings.constraints.filter(
                        (_, j) => i !== j,
                      ),
                    })
                  }
                >
                  <X size={15} />
                </button>
              </div>
            ))}
            <button
              className="dashed"
              onClick={() =>
                setSettings({
                  ...settings,
                  constraints: [
                    ...settings.constraints,
                    {
                      age: 30,
                      title: "可能接触高风险投资或赌博诱惑",
                      tone: "blue",
                    },
                  ],
                })
              }
            >
              <Plus size={16} /> 添加情境提示
            </button>
          </div>
        )}
        <div className="modal-actions">
          {startError && (
            <span className="setup-start-error" role="alert">
              <CircleAlert size={15} />
              {startError}
            </span>
          )}
          <span className={`setup-llm-state ${llmConfigured ? "ready" : ""}`}>
            {llmConfigured
              ? "故事引擎已连接，可以随机建档并继续人生"
              : "建档无需连接；随机人设和后续人生发展需要故事引擎"}
          </span>
          <button className="ghost" onClick={onClose}>
            返回
          </button>
          <button
            className="primary"
            onClick={() => {
              if (!settings.name.trim()) {
                setStartError("请先填写主角姓名，再启动模拟。");
                nameInputRef.current?.focus();
                nameInputRef.current?.scrollIntoView({
                  behavior: "smooth",
                  block: "center",
                });
                return;
              }
              const height = Number(settings.physicalProfile?.adultHeightCm);
              if (!Number.isFinite(height) || height < 130 || height > 220) {
                setStartError("成年最终身高请填写 130–220 cm 之间的有效数值。");
                heightInputRef.current?.focus();
                heightInputRef.current?.scrollIntoView({
                  behavior: "smooth",
                  block: "center",
                });
                return;
              }
              const submittedSettings = {
                ...settings,
                physicalProfile: {
                  ...settings.physicalProfile,
                  adultHeightCm: height,
                },
              };
              setSettings(submittedSettings);
              setStartError("");
              onStart(submittedSettings);
            }}
          >
            启动模拟 <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
