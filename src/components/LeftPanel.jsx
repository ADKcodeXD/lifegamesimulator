import React from "react";
import { Activity, Heart, Settings2, Target } from "lucide-react";
import { FAMILY_LEVELS } from "../data/family";
import { avatarFor } from "../data/gameState";

export default function LeftPanel({
  age,
  settings,
  state,
  profileExpanded,
  setProfileExpanded,
  onEdit,
  onOpenProfile,
}) {
  return (
    <aside className="left-panel">
      <div className="profile-card">
        <div className="avatar">
          {avatarFor(age, settings.gender)}
          <span />
        </div>
        <div>
          <h3>{settings.name}</h3>
          <p>
            {FAMILY_LEVELS[settings.family].label}家庭 · {settings.gender} · LLM
            自主行动
          </p>
        </div>
        <button className="tiny-btn" onClick={onEdit} aria-label="修改人物设置">
          <Settings2 size={15} />
        </button>
      </div>
      <div className="section-title">
        人物状态 <span>实时</span>
      </div>
      <div className="status-list">
        <div>
          <label>
            <Heart size={15} /> 健康
          </label>
          <b>{state.health}</b>
          <i>
            <em style={{ width: state.health + "%" }} />
          </i>
        </div>
        <div>
          <label>
            <Activity size={15} /> 心情
          </label>
          <b>{state.mood}</b>
          <i>
            <em className="pink" style={{ width: state.mood + "%" }} />
          </i>
        </div>
        <div>
          <label>
            <Target size={15} /> 事业
          </label>
          <b>{state.career}</b>
          <i>
            <em className="blue" style={{ width: state.career + "%" }} />
          </i>
        </div>
      </div>
      <div className="section-title">动态人格</div>
      <div className="trait-grid">
        {Object.entries(settings.traits).map(([k, v]) => (
          <div key={k}>
            <span>{k}</span>
            <b>{v}</b>
          </div>
        ))}
      </div>
      <div className="section-title">初始底盘</div>
      <div className="origin-card">
        <b>{FAMILY_LEVELS[settings.family].label}家庭</b>
        <small>{FAMILY_LEVELS[settings.family].netWorth}</small>
        <div>
          {Object.entries(settings.talents).map(([k, v]) => (
            <span key={k}>
              {k} <b>{v}</b>
            </span>
          ))}
        </div>
      </div>
      <div className="section-title profile-section-title">
        人物档案
        <span className="profile-actions">
          <button
            type="button"
            onClick={() => setProfileExpanded((value) => !value)}
          >
            {profileExpanded ? "收起" : "展开"}
          </button>
          <button
            type="button"
            className="profile-detail-link"
            onClick={onOpenProfile}
          >
            查看详情
          </button>
        </span>
      </div>
      <div className={`profile-bio${profileExpanded ? " expanded" : ""}`}>
        {age >= 6 && (
          <p>
            <b>童年</b>
            {settings.bio.childhood || "由人生经历逐步形成"}
          </p>
        )}
        {age >= 12 && (
          <p>
            <b>中学</b>
            {settings.bio.school || "由人生经历逐步形成"}
          </p>
        )}
        <p>
          <b>性格</b>
          {settings.personalityProfile?.currentSummary ||
            settings.bio.personality ||
            "等待人生塑造"}
        </p>
        <p>
          <b>爱好</b>
          {settings.bio.hobbies || "未知"}
        </p>
      </div>
    </aside>
  );
}
