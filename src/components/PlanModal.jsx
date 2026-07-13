import React from "react";
import {
  Brain,
  ChevronRight,
  Dices,
  Network,
  TrendingUp,
  X,
} from "lucide-react";
import { IconButton } from "./Common";

export default function PlanModal({ open, onClose }) {
  if (!open) return null;
  return (
    <div className="modal-backdrop">
      <div className="modal plan-modal">
        <IconButton onClick={onClose}>
          <X size={18} />
        </IconButton>
        <div className="modal-title">
          <span>人生如何继续</span>
          <b>这里没有固定剧情，世界和每个人都会发生变化。</b>
        </div>
        <div className="plan-flow">
          <div className="flow-card purple">
            <Network />
            <b>世界状态</b>
            <span>
              社会背景 + 年度变化
              <br />
              经济 / 政策 / 科技 / 舆论
            </span>
          </div>
          <ChevronRight />
          <div className="flow-card blue">
            <Dices />
            <b>概率场</b>
            <span>
              年龄 + 历史选择
              <br />
              动态风险 + 独立结果抽样
            </span>
          </div>
          <ChevronRight />
          <div className="flow-card orange">
            <Brain />
            <b>人物如何决定</b>
            <span>
              接受人格 → 年龄/记忆校准 → 决定
              <br />
              不会突然变成与人设不符的“完美理性人”
            </span>
          </div>
          <ChevronRight />
          <div className="flow-card green">
            <TrendingUp />
            <b>状态回写</b>
            <span>
              资产 / 健康 / 人格
              <br />
              关系 / 新概率 / 记忆
            </span>
          </div>
        </div>
        <div className="feedback-box">
          <b>每一轮，都会完整经历一段生活</b>
          <div>
            <span>输入</span>完整状态快照 + 最近记忆 + 世界背景 + 情境提示
          </div>
          <div>
            <span>输出</span>
            事件、思考摘要、决定、现金流、关系变化、人格微调、概率漂移
          </div>
          <div>
            <span>每年</span>
            额外生成年度社会报告，并成为下一年所有事件的世界前提
          </div>
        </div>
        <button className="primary full" onClick={onClose}>
          返回模拟器
        </button>
      </div>
    </div>
  );
}
