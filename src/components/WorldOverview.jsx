import React from "react";
import { Activity, Globe2 } from "lucide-react";

export default function WorldOverview({ worldState }) {
  return (
    <section className="world-overview" aria-label="当前世界概况">
      <div className="world-overview-inner">
        <div className="world-overview-title">
          <span>
            <Globe2 size={17} /> 世界概况
          </span>
          <b>{worldState.date.label}</b>
          <small>{worldState.region}</small>
        </div>
        <div className="world-overview-summary">
          <b>{worldState.climate}</b>
          <p>{worldState.summary}</p>
        </div>
        <div className="world-event-strip">
          {worldState.events.slice(0, 3).map((event) => (
            <span className={`tone-${event.tone}`} key={event.id} title={event.description}>
              <Activity size={13} />
              <b>{event.title}</b>
              <small>{event.phase}</small>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
