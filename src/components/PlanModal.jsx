import React from "react";
import {
  Brain,
  ChevronRight,
  Dices,
  Gamepad2,
  Globe2,
  HeartPulse,
  ScrollText,
  Skull,
  X,
} from "lucide-react";
import { IconButton } from "./Common";

const FLOW = [
  {
    icon: Globe2,
    tone: "purple",
    title: "世界记忆",
    text: "世界种子 + 模型生成的新闻历史",
    detail: "没有代码预设新闻池",
  },
  {
    icon: Dices,
    tone: "blue",
    title: "概率结算",
    text: "年龄、健康、关系、资产与风险",
    detail: "先掷骰，再决定外部结果",
  },
  {
    icon: Brain,
    tone: "orange",
    title: "角色行动",
    text: "人格 + 记忆 + 玩家方向权重",
    detail: "角色按自己的人生惯性选择",
  },
  {
    icon: Gamepad2,
    tone: "green",
    title: "游戏反馈",
    text: "成功 / 失败 / 努力 / 婚姻",
    detail: "素材、数值和里程碑结算",
  },
];

export default function PlanModal({ open, onClose }) {
  if (!open) return null;
  return (
    <div className="modal-backdrop">
      <div className="modal plan-modal architecture-modal">
        <IconButton onClick={onClose}>
          <X size={18} />
        </IconButton>
        <div className="modal-title">
          <span>SIMULATION ARCHITECTURE · v7</span>
          <b>世界、人物、概率与死亡，共同组成一条可终止的人生状态机。</b>
        </div>

        <div className="plan-flow architecture-flow">
          {FLOW.map((item, index) => {
            const Icon = item.icon;
            return (
              <React.Fragment key={item.title}>
                <div className={`flow-card ${item.tone}`}>
                  <Icon />
                  <b>{item.title}</b>
                  <span>
                    {item.text}
                    <br />
                    <small>{item.detail}</small>
                  </span>
                </div>
                {index < FLOW.length - 1 && (
                  <ChevronRight className="flow-arrow" />
                )}
              </React.Fragment>
            );
          })}
        </div>

        <div className="life-state-machine">
          <div className="state-alive">
            <HeartPulse size={19} />
            <span>
              <b>存活</b>
              <small>继续回合 → 写入状态与长期记忆</small>
            </span>
          </div>
          <ChevronRight />
          <div className="state-check">
            <Dices size={19} />
            <span>
              <b>死亡判定</b>
              <small>事故 / 疾病 / 长期恶化，必须有完整因果</small>
            </span>
          </div>
          <div className="state-branches">
            <span>未死亡 → 下一轮</span>
            <span>死亡 ↓</span>
          </div>
          <div className="state-ended">
            <Skull size={19} />
            <span>
              <b>人生终止</b>
              <small>锁定播放器并停止自动推演</small>
            </span>
          </div>
          <ChevronRight />
          <div className="state-summary">
            <ScrollText size={19} />
            <span>
              <b>自动总结</b>
              <small>回顾高光、遗憾、财富、关系与人格</small>
            </span>
          </div>
        </div>

        <div className="feedback-box architecture-notes">
          <b>一轮推演的数据闭环</b>
          <div>
            <span>输入</span>人物快照、世界记忆、方向权重、关系网络、资产账本
          </div>
          <div>
            <span>模型</span>
            生成世界事件与人物行动；概率工具约束成功、失败、事故和死亡合理性
          </div>
          <div>
            <span>结算</span>
            纯函数统一生成新快照与领域事件，UI 不直接修改人物状态
          </div>
          <div>
            <span>输出</span>
            领域事件驱动里程碑、重大弹窗、存档与死亡总结；固定种子支持复盘
          </div>
        </div>
        <button className="primary full" onClick={onClose}>
          返回模拟器
        </button>
      </div>
    </div>
  );
}
