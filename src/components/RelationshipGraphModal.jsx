import React, { useEffect, useRef, useState } from "react";
import ForceGraph2D from "react-force-graph-2d";
import { Brain, Clock3, HeartHandshake, X } from "lucide-react";
import { IconButton } from "./Common";
import {
  RELATIONSHIP_BANDS,
  relationshipBandFor,
} from "../data/npcLifecycleConfig.ts";
import { RELATION_EVENT_TYPES } from "../data/relationshipHistoryConfig.ts";

const avatarFor = (age, gender) => {
  if (age < 4) return "👶🏻";
  if (age < 12) return gender === "女" ? "👧🏻" : "👦🏻";
  if (age < 23) return gender === "女" ? "👩🏻‍🎓" : "🧑🏻‍🎓";
  if (age < 60) return gender === "女" ? "👩🏻" : "🧑🏻";
  return gender === "女" ? "👵🏻" : "👴🏻";
};

const colorFor = (value) => relationshipBandFor(value).color;

export default function RelationshipGraphModal({
  relations,
  settings,
  npcProfiles,
  socialEdges = [],
  historicalContacts = [],
  onClose,
  initialName,
}) {
  const [selectedId, setSelectedId] = useState(initialName || null);
  const graphRef = useRef(null);
  const wrapRef = useRef(null);
  const [graphSize, setGraphSize] = useState({ width: 760, height: 480 });
  const graphData = {
    nodes: [
      {
        id: "me",
        name: settings.name || "我",
        emoji: avatarFor(settings.startAge, settings.gender),
        value: 100,
        isMe: true,
        val: 8,
        color: "#6c5ce7",
      },
      ...relations.map((relation) => ({
        id: relation.name,
        name: relation.name,
        emoji: relation.emoji || "🙂",
        value: relation.value,
        status: relation.status,
        personality: relation.personality,
        profile: npcProfiles[relation.name],
        isMe: false,
        val: Math.max(4, relation.value / 10),
        color: colorFor(relation.value),
        familiarity: relation.familiarity,
        inactiveYears: relation.inactiveYears || 0,
        lifeStatus: relation.lifeStatus,
        archived: false,
      })),
      ...historicalContacts
        .filter(
          (contact) =>
            !relations.some((relation) => relation.name === contact.name),
        )
        .map((contact) => ({
          id: contact.name,
          name: contact.name,
          emoji: contact.emoji || "◌",
          value: contact.value ?? 20,
          status: "历史联系人",
          profile: npcProfiles[contact.name] || contact.profile,
          isMe: false,
          archived: true,
          archivedAtAge: contact.archivedAtAge,
          archivedReason: contact.archivedReason,
          inactiveYears: contact.inactiveYears || 0,
          val: 4,
          color: "#aaa6b5",
        })),
    ],
    links: [
      ...relations.map((relation) => ({
        source: "me",
        target: relation.name,
        color: colorFor(relation.value),
        width: Math.max(0.5, relation.value / 25),
        value: relation.value,
        kind: "protagonist",
      })),
      ...historicalContacts
        .filter(
          (contact) =>
            !relations.some((relation) => relation.name === contact.name),
        )
        .map((contact) => ({
          source: "me",
          target: contact.name,
          color: "#bbb8c4",
          width: 0.8,
          value: contact.value ?? 20,
          kind: "historical",
        })),
      ...socialEdges
        .filter(
          (edge) =>
            relations.some((item) => item.name === edge.source) &&
            relations.some((item) => item.name === edge.target),
        )
        .map((edge) => ({
          source: edge.source,
          target: edge.target,
          color: colorFor(edge.value ?? 50),
          width: Math.max(0.5, (edge.value ?? 50) / 30),
          value: edge.value ?? 50,
          status: edge.status,
          kind: "npc",
        })),
    ],
  };

  useEffect(() => {
    const updateSize = () => {
      const width = Math.max(
        280,
        Math.floor(wrapRef.current?.clientWidth || 720),
      );
      setGraphSize({ width, height: window.innerWidth < 640 ? 290 : 480 });
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    if (wrapRef.current) observer.observe(wrapRef.current);
    const timer = setTimeout(() => {
      if (!graphRef.current) return;
      graphRef.current.d3Force("charge").strength(-300);
      graphRef.current
        .d3Force("link")
        .distance(window.innerWidth < 640 ? 76 : 105);
      graphRef.current.d3ReheatSimulation();
      setTimeout(() => graphRef.current?.zoomToFit(400, 48), 450);
    }, 100);
    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => graphRef.current?.zoomToFit(350, 52), 320);
    return () => clearTimeout(timer);
  }, [graphSize.width, graphSize.height, relations.length]);

  const selectedNode = graphData.nodes.find((node) => node.id === selectedId);
  const profile = selectedNode?.profile || {};
  const interactionHistory = profile.interactionHistory || [];
  const protagonistPersonality = settings.personalityProfile || {};
  const npcConnections = selectedNode
    ? socialEdges.filter(
        (edge) =>
          edge.source === selectedNode.name ||
          edge.target === selectedNode.name,
      )
    : [];

  return (
    <div className="modal-backdrop">
      <div className="modal rel-graph-modal">
        <IconButton onClick={onClose} className="modal-close-btn">
          <X size={18} />
        </IconButton>
        <div className="modal-title">
          <span>人际网络</span>
          <b>关系连线图</b>
        </div>
        <div className="rel-graph-wrap" ref={wrapRef}>
          <ForceGraph2D
            ref={graphRef}
            width={graphSize.width}
            height={graphSize.height}
            graphData={graphData}
            nodeRelSize={6}
            nodeId="id"
            linkColor={(link) => link.color}
            linkWidth={(link) => link.width}
            linkOpacity={0.58}
            linkCurvature={(link) => (link.kind === "npc" ? 0.16 : 0.06)}
            linkLineDash={(link) =>
              link.kind === "npc"
                ? [4, 3]
                : link.kind === "historical"
                  ? [2, 5]
                  : null
            }
            cooldownTicks={100}
            onNodeClick={(node) => {
              setSelectedId(node.id);
            }}
            nodeCanvasObject={(node, context, globalScale) => {
              const radius = node.isMe ? 14 : 10;
              context.beginPath();
              context.arc(node.x, node.y, radius, 0, 2 * Math.PI);
              context.fillStyle = node.color;
              context.fill();
              context.strokeStyle = "#fff";
              context.lineWidth = 2;
              context.stroke();
              context.font = `${node.isMe ? 16 : 13}px serif`;
              context.textAlign = "center";
              context.textBaseline = "middle";
              context.fillText(node.emoji, node.x, node.y);
              context.font = `${14 / globalScale}px "Noto Sans SC", sans-serif`;
              context.fillStyle = "#5a5670";
              context.fillText(
                node.name,
                node.x,
                node.y + radius + 10 / globalScale,
              );
              if (!node.isMe) {
                context.fillStyle = node.color;
                context.font = `${11 / globalScale}px "Noto Sans SC", sans-serif`;
                context.fillText(
                  node.value,
                  node.x,
                  node.y + radius + 22 / globalScale,
                );
              }
            }}
            enableNodeDrag
            enableZoomInteraction
            enablePanInteraction
          />
        </div>

        {selectedNode && !selectedNode.isMe ? (
          <div className="rel-profile">
            <div className="rel-profile-head">
              <span className="rel-profile-emoji">{selectedNode.emoji}</span>
              <div>
                <b>{selectedNode.name}</b>
                <span className="rel-profile-status">
                  {selectedNode.status} · 好感度 {selectedNode.value}
                </span>
              </div>
            </div>
            <div className="rel-profile-bar">
              <em
                style={{
                  width: `${selectedNode.value}%`,
                  background: colorFor(selectedNode.value),
                }}
              />
            </div>
            {profile.role && (
              <div className="rel-profile-meta">
                <span>
                  <b>身份</b> {profile.role}
                </span>
                {profile.age && (
                  <span>
                    <b>年龄</b> {profile.age}岁
                  </span>
                )}
              </div>
            )}
            <div className="rel-lifecycle-strip">
              <span className={selectedNode.archived ? "archived" : "active"}>
                {selectedNode.archived ? "已自然淡出" : "生活仍在继续"}
              </span>
              {!selectedNode.archived && (
                <small>
                  {selectedNode.lifeStatus || profile.lifeStatus || "生活平稳"}
                </small>
              )}
            </div>
            {(profile.statusSummary || selectedNode.archivedReason) && (
              <p className="rel-profile-life-summary">
                {selectedNode.archivedReason || profile.statusSummary}
              </p>
            )}
            {selectedNode.inactiveYears > 0 && !selectedNode.archived && (
              <p className="rel-profile-inactive">
                已有 {selectedNode.inactiveYears}{" "}
                年没有实质互动，关系会随时间自然衰减。
              </p>
            )}
            <p className="rel-profile-personality">
              {profile.personality || selectedNode.personality || "性格待塑造"}
            </p>
            {(profile.personalityHistory || []).length > 1 && (
              <div className="npc-personality-observations">
                <b>性格观察修正</b>
                {profile.personalityHistory.slice(-3).map((item) => (
                  <span key={item.id}>
                    <small>{item.age}岁观察</small>
                    <p>{item.summary}</p>
                    <em>{item.evidence}</em>
                  </span>
                ))}
              </div>
            )}
            {profile.background && (
              <p className="rel-profile-bg">{profile.background}</p>
            )}
            {profile.motivation && (
              <p className="rel-profile-motivation">
                <b>动机：</b>
                {profile.motivation}
              </p>
            )}
            {profile.potentialConflict && (
              <p className="rel-profile-conflict">
                <b>潜在冲突：</b>
                {profile.potentialConflict}
              </p>
            )}
            <div className="rel-interaction-history">
              <div className="rel-interaction-title">
                <span>
                  <HeartHandshake size={15} /> 与主角的交互历史
                </span>
                <small>{interactionHistory.length} 个关系节点</small>
              </div>
              {interactionHistory.length ? (
                <div className="rel-interaction-timeline">
                  {interactionHistory.map((item) => {
                    const eventType =
                      RELATION_EVENT_TYPES[item.kind] ||
                      RELATION_EVENT_TYPES.interaction;
                    return (
                      <article
                        className={`tone-${eventType.tone}`}
                        key={item.id}
                      >
                        <i />
                        <div>
                          <span>
                            <small>{item.age}岁</small>
                            <em>{eventType.label}</em>
                            {item.delta !== 0 && (
                              <strong
                                className={item.delta > 0 ? "up" : "down"}
                              >
                                {item.delta > 0 ? "+" : ""}
                                {item.delta}
                              </strong>
                            )}
                          </span>
                          <b>{item.title}</b>
                          <p>{item.detail}</p>
                          {item.status && (
                            <small>关系状态：{item.status}</small>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <p className="rel-interaction-empty">
                  尚无可追溯事件，后续互动会在这里持续记录。
                </p>
              )}
            </div>
            {npcConnections.length > 0 && (
              <div className="rel-npc-connections">
                <b>与其他人物</b>
                {npcConnections.slice(0, 5).map((edge, index) => (
                  <span key={`${edge.source}-${edge.target}-${index}`}>
                    {edge.source === selectedNode.name
                      ? edge.target
                      : edge.source}
                    <em>
                      {edge.status || "关系未定义"} · {edge.value ?? 50}
                    </em>
                  </span>
                ))}
              </div>
            )}
          </div>
        ) : selectedNode?.isMe ? (
          <div className="rel-profile protagonist-rel-profile">
            <div className="rel-profile-head">
              <span className="rel-profile-emoji">{selectedNode.emoji}</span>
              <div>
                <b>{settings.name}</b>
                <span className="rel-profile-status">
                  主角 · {protagonistPersonality.mbti || "人格形成中"}
                </span>
              </div>
            </div>
            <div className="protagonist-personality-summary">
              <Brain size={17} />
              <p>
                {protagonistPersonality.currentSummary ||
                  settings.bio.personality ||
                  "性格仍在经历中形成。"}
              </p>
            </div>
            {(protagonistPersonality.adaptations || []).length > 0 && (
              <div className="protagonist-adaptation-list">
                {protagonistPersonality.adaptations.map((item) => (
                  <span key={item.key}>
                    <b>{item.title}</b>
                    <small>{item.tendency}</small>
                  </span>
                ))}
              </div>
            )}
            <div className="rel-interaction-history protagonist-history">
              <div className="rel-interaction-title">
                <span>
                  <Clock3 size={15} /> 性格形成经历
                </span>
                <small>
                  {(protagonistPersonality.history || []).length} 个节点
                </small>
              </div>
              <div className="rel-interaction-timeline">
                {(protagonistPersonality.history || []).map((item) => (
                  <article className="tone-neutral" key={item.id}>
                    <i />
                    <div>
                      <span>
                        <small>{item.age}岁</small>
                        <em>
                          {item.kind === "baseline" ? "初始画像" : "经历修正"}
                        </em>
                      </span>
                      <b>{item.title}</b>
                      <p>{item.detail}</p>
                      {item.trigger && <small>触发经历：{item.trigger}</small>}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <p className="rel-graph-hint">
            点击任意人物节点查看详细档案，可拖拽节点调整布局
          </p>
        )}

        <div className="rel-graph-legend">
          {RELATIONSHIP_BANDS.map((band) => (
            <span key={band.label}>
              <i style={{ background: band.color }} /> {band.label} (
              {band.range})
            </span>
          ))}
          <span className="npc-edge-legend">虚线 = NPC 彼此关系</span>
          <span className="history-edge-legend">点线 = 已淡出关系</span>
        </div>
      </div>
    </div>
  );
}
