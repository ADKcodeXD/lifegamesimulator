import React from "react";
import { Download, Pause, Play, RefreshCcw, RotateCcw, Zap } from "lucide-react";

export default function BottomPlayer({ autoPlay, setAutoPlay, playbackIndex, history, simulating, simulate, settings, age, monthOfYear, month, seekPlayback, restartFromPlayback, exportJson, importJson }) {
  return (
    <div className="bottom-player">
      <button
        className="player-main"
        onClick={() => setAutoPlay((v) => !v)}
        disabled={playbackIndex < history.length}
      >
        {autoPlay ? (
          <Pause size={17} />
        ) : (
          <Play size={17} fill="currentColor" />
        )}
        <span>
          {autoPlay ? (simulating ? "推演中…" : "阅读中…") : "自动播放"}
        </span>
      </button>
      <button
        className="step-btn"
        onClick={simulate}
        disabled={simulating || autoPlay || playbackIndex < history.length}
      >
        {simulating ? <i className="typing" /> : <Zap size={16} />}
        <span>
          {simulating
            ? "推演中"
            : `推演${settings.monthsPerTurn >= 12 ? "一年" : settings.monthsPerTurn >= 6 ? "半年" : settings.monthsPerTurn + "个月"}`}
        </span>
      </button>
      <div className="player-time">
        <b>
          {age} 岁 {monthOfYear} 月
        </b>
        <small>
          第 {playbackIndex}/{history.length} 轮 · 累计 {month} 月
        </small>
      </div>
      <div className="player-track">
        <input
          aria-label="人生播放进度"
          type="range"
          min="0"
          max={Math.max(history.length, 1)}
          value={playbackIndex}
          onChange={(e) => seekPlayback(e.target.value)}
        />
        <div>
          <span>{settings.startAge ?? 18} 岁 · 起点</span>
          <span>{settings.endAge} 岁 · 终点</span>
        </div>
      </div>
      {playbackIndex < history.length && (
        <button className="branch-btn" onClick={restartFromPlayback}>
          <RotateCcw size={14} />
          <span>从这里重开</span>
        </button>
      )}
      <button className="json-btn" onClick={exportJson}>
        <Download size={14} />
        <span>导出 JSON</span>
      </button>
      <label className="json-btn" style={{ cursor: "pointer" }}>
        <RefreshCcw size={14} />
        <span>导入 JSON</span>
        <input
          type="file"
          accept=".json"
          style={{ display: "none" }}
          onChange={(e) => {
            if (e.target.files[0]) importJson(e.target.files[0]);
            e.target.value = "";
          }}
        />
      </label>
    </div>
  );
}
