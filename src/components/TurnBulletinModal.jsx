import React from "react";
import {
  Car,
  ChevronRight,
  Globe2,
  Home,
  Landmark,
  Sparkles,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import { IconButton } from "./Common";
import { formatWorldMoney } from "../simulation/probabilityModel";

const assetIcon = (account = "") =>
  account === "realEstate" ? Home : account === "vehicles" ? Car : Landmark;
const RESULT_ASSETS = {
  success: {
    file: "result-success.png",
    label: "高光达成",
    eyebrow: "SUCCESS",
  },
  failure: {
    file: "result-failure.png",
    label: "遭遇挫折",
    eyebrow: "SETBACK",
  },
  effort: { file: "result-effort.png", label: "持续努力", eyebrow: "EFFORT" },
  marriage: {
    file: "result-marriage.png",
    label: "关系里程碑",
    eyebrow: "MILESTONE",
  },
  death: { file: "result-death.png", label: "人生终章", eyebrow: "LIFE ENDED" },
};

export default function TurnBulletinModal({ bulletin, onClose, world }) {
  if (!bulletin) return null;
  const presentation = RESULT_ASSETS[bulletin.variant] || RESULT_ASSETS.effort;
  return (
    <div
      className={`modal-backdrop bulletin-backdrop variant-${bulletin.variant || "effort"}`}
      onClick={onClose}
    >
      <article
        className="modal turn-bulletin"
        onClick={(event) => event.stopPropagation()}
      >
        <IconButton onClick={onClose} className="modal-close-btn">
          <X size={18} />
        </IconButton>
        <div className="bulletin-hero">
          <img
            src={`${import.meta.env.BASE_URL}assets/${presentation.file}`}
            alt={`${presentation.label}游戏结算插画`}
          />
          <div className="bulletin-hero-copy">
            <span>
              {bulletin.time} · {presentation.eyebrow}
            </span>
            <h2>{presentation.label}</h2>
            <p>
              {bulletin.variant === "death"
                ? "这一生停在这里，但所有选择都已成为故事。"
                : "世界给出了回应，新的状态已经写入人生。"}
            </p>
          </div>
          <div className="bulletin-result-stamp">
            {bulletin.resultLabel || presentation.label}
          </div>
        </div>
        <div className="bulletin-body">
          <section className="bulletin-lead">
            <span className="bulletin-kicker">
              <Sparkles size={14} /> 人生关键变化
            </span>
            <h3>{bulletin.life.title}</h3>
            <p>{bulletin.life.summary}</p>
            <div className="bulletin-deltas">
              {bulletin.life.deltas.map((item) => (
                <span
                  className={item.value >= 0 ? "positive" : "negative"}
                  key={item.label}
                >
                  {item.value >= 0 ? (
                    <TrendingUp size={13} />
                  ) : (
                    <TrendingDown size={13} />
                  )}
                  {item.label} {item.value >= 0 ? "+" : ""}
                  {item.value}
                </span>
              ))}
            </div>
          </section>
          {bulletin.world && (
            <section
              className={`bulletin-news tone-${bulletin.world.tone || "warning"}`}
            >
              <span className="bulletin-kicker">
                <Globe2 size={14} /> 世界新闻
              </span>
              <h3>{bulletin.world.title}</h3>
              <p>{bulletin.world.description}</p>
              <small>
                {bulletin.world.scope || "全球"} ·{" "}
                {bulletin.world.phase || "正在发展"}
              </small>
            </section>
          )}
          {bulletin.assets.length > 0 && (
            <section className="bulletin-assets">
              <span className="bulletin-kicker">
                <Landmark size={14} /> 大资产异动
              </span>
              {bulletin.assets.map((entry, index) => {
                const AssetIcon = assetIcon(entry.account);
                const value = Number(
                  entry.netWorthDelta ?? entry.assetDelta ?? 0,
                );
                return (
                  <div key={`${entry.label}-${index}`}>
                    <span>
                      <AssetIcon size={17} />
                    </span>
                    <span>
                      <b>{entry.label}</b>
                      <small>{entry.note || "资产结构发生变化"}</small>
                    </span>
                    <strong className={value >= 0 ? "positive" : "negative"}>
                      {value >= 0 ? "+" : ""}
                      {formatWorldMoney(value, world)}
                    </strong>
                  </div>
                );
              })}
            </section>
          )}
          <button className="bulletin-continue" onClick={onClose}>
            {bulletin.variant === "death" ? "查看一生总结" : "继续下一阶段"}{" "}
            <ChevronRight size={16} />
          </button>
        </div>
      </article>
    </div>
  );
}
