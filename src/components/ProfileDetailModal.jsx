import React from "react";
import {
  Activity,
  Brain,
  BriefcaseBusiness,
  GraduationCap,
  Heart,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import { IconButton } from "./Common";
import { avatarFor } from "../data/gameState";
import {
  buildAbilityModel,
  formatWorldMoney,
} from "../simulation/probabilityModel";
import { calculateFinancialSummary } from "../simulation/financeModel";
import { groupSkillsByTier } from "../simulation/skillModel";
import { describeEmotion, normalizeEmotion } from "../simulation/emotionModel";

export default function ProfileDetailModal({
  open,
  onClose,
  settings,
  age,
  state,
  resume,
  logs,
}) {
  if (!open) return null;
  const model = buildAbilityModel(settings, state);
  const emotion = describeEmotion(normalizeEmotion(state));
  const financialSummary = calculateFinancialSummary(state);
  const personality = settings.personalityProfile || {};
  const experiences = resume.experiences?.length
    ? resume.experiences
    : logs.slice(1).map((log) => ({
        time: log.time,
        title: log.title,
        description: log.summary || log.text,
        type: log.tag || "经历",
      }));
  const skillGroups = groupSkillsByTier(resume.skills || []);
  const skillCount = skillGroups.reduce(
    (total, group) => total + group.skills.length,
    0,
  );
  return (
    <div className="modal-backdrop profile-detail-backdrop">
      <div className="modal profile-detail-modal">
        <IconButton onClick={onClose} className="modal-close-btn">
          <X size={18} />
        </IconButton>
        <header className="profile-detail-hero">
          <span className="profile-detail-avatar">
            {avatarFor(age, settings.gender)}
          </span>
          <div>
            <small>PROTAGONIST PROFILE · 实时履历</small>
            <h2>{settings.name}</h2>
            <p>
              {age}岁 · {settings.gender} · {resume.employmentStatus}
            </p>
            {personality.mbti && (
              <span className="profile-mbti-badge">
                {personality.mbti} · {personality.mbtiLabel}
              </span>
            )}
          </div>
          <div className="profile-detail-worth">
            <small>当前净资产</small>
            <b>{formatWorldMoney(financialSummary.netWorth, settings.world)}</b>
          </div>
        </header>

        <div className="profile-detail-scroll">
          <section className="profile-current-grid">
            <article>
              <BriefcaseBusiness size={19} />
              <span>
                <small>当前身份</small>
                <b>{resume.currentRole || "待探索"}</b>
              </span>
            </article>
            <article>
              <UserRound size={19} />
              <span>
                <small>所属组织</small>
                <b>{resume.organization || "暂无"}</b>
              </span>
            </article>
            <article>
              <GraduationCap size={19} />
              <span>
                <small>教育状态</small>
                <b>{resume.education || "待更新"}</b>
              </span>
            </article>
            <article>
              <Heart size={19} />
              <span>
                <small>健康 / 情绪 / 行动力</small>
                <b>
                  {state.health} / {emotion.value} / {emotion.actionDrive}
                </b>
              </span>
            </article>
            <article>
              <Activity size={19} />
              <span>
                <small>身高档案</small>
                <b>
                  {state.bodyProfile?.currentHeightCm || "--"} cm
                  {state.bodyProfile?.currentHeightCm !==
                    state.bodyProfile?.adultHeightCm &&
                    ` / 最终 ${state.bodyProfile?.adultHeightCm || "--"} cm`}
                </b>
              </span>
            </article>
            <article>
              <UserRound size={19} />
              <span>
                <small>动态身材</small>
                <b>{state.bodyProfile?.bodyType || "匀称"}</b>
              </span>
            </article>
          </section>

          <section className="profile-detail-section personality-section">
            <div className="profile-detail-title">
              <span>
                <Brain size={16} /> 动态性格画像
              </span>
              <small>初始 MBTI 是锚点，经历会形成可变化的倾向</small>
            </div>
            <div className="personality-overview">
              <span>
                <b>{personality.mbti || "待生成"}</b>
                <small>{personality.mbtiBasis || "根据初始人格生成"}</small>
              </span>
              <p>
                {personality.currentSummary ||
                  settings.bio.personality ||
                  "性格仍在经历中形成。"}
              </p>
            </div>
            {(personality.adaptations || []).length > 0 && (
              <div className="personality-adaptations">
                {personality.adaptations.map((item) => (
                  <article key={item.key}>
                    <span>
                      <b>{item.title}</b>
                      <small>影响强度 {item.intensity}/3</small>
                    </span>
                    <p>{item.tendency}</p>
                    {item.evidence?.length > 0 && (
                      <em>形成于：{item.evidence.join("、")}</em>
                    )}
                  </article>
                ))}
              </div>
            )}
            <div className="personality-history">
              {(personality.history || []).map((item) => (
                <article key={item.id}>
                  <i />
                  <span>
                    <small>{item.age}岁</small>
                    <b>{item.title}</b>
                    <p>{item.detail}</p>
                  </span>
                </article>
              ))}
            </div>
          </section>

          <section className="profile-detail-section">
            <div className="profile-detail-title">
              <span>
                <Sparkles size={16} /> 当前可用技能
              </span>
              <small>三级归并 · 最多保留少量核心能力</small>
            </div>
            <div className="profile-skill-groups">
              {skillCount ? (
                skillGroups
                  .filter((group) => group.skills.length)
                  .map((group) => (
                    <div
                      className={`profile-skill-tier tier-${group.id}`}
                      key={group.id}
                    >
                      <header>
                        <span>LEVEL {group.level}</span>
                        <b>{group.label}</b>
                        <small>{group.description}</small>
                      </header>
                      <div>
                        {group.skills.map((skill) => (
                          <span key={skill}>{skill}</span>
                        ))}
                      </div>
                    </div>
                  ))
              ) : (
                <p>尚未积累明确技能，后续经历会持续补充。</p>
              )}
            </div>
          </section>

          <section className="profile-detail-section">
            <div className="profile-detail-title">
              <span>
                <Activity size={16} /> 非线性能力影响
              </span>
              <small>50为人群平均，每15分约为一个标准差</small>
            </div>
            <div className="ability-model-grid">
              {[
                ["颜值", model.appearance],
                ["运动", model.athletic],
                ["智力", model.intelligence],
                ["天赋", model.talent],
                ["财商", model.financial],
                ["社交", model.social],
              ].map(([name, value]) => (
                <article key={name}>
                  <div>
                    <b>{name}</b>
                    <strong>{value.score}</strong>
                  </div>
                  <i>
                    <em style={{ width: `${value.score}%` }} />
                  </i>
                  <p>{value.label}</p>
                  <small>
                    人群百分位 {value.percentile.toFixed(1)}% · 概率乘数 ×
                    {value.multiplier.toFixed(2)}
                  </small>
                </article>
              ))}
            </div>
          </section>

          <section className="profile-detail-section">
            <div className="profile-detail-title">
              <span>
                <BriefcaseBusiness size={16} /> 人生履历
              </span>
              <small>{experiences.length} 条经历</small>
            </div>
            <div className="resume-timeline">
              {experiences.length ? (
                [...experiences].reverse().map((entry, index) => (
                  <article key={`${entry.time}-${entry.title}-${index}`}>
                    <i />
                    <div>
                      <span>
                        {entry.time || "时间待定"} · {entry.type || "经历"}
                      </span>
                      <b>{entry.title}</b>
                      <p>{entry.description}</p>
                    </div>
                  </article>
                ))
              ) : (
                <p className="profile-empty-resume">
                  完成第一轮推演后，这里会生成第一条动态履历。
                </p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
