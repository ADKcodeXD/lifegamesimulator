import React from "react";
import { Check, Compass } from "lucide-react";

export default function DirectionChoices({ directionField, onSelect, disabled }) {
  if (!directionField?.choices?.length) return null;
  return (
    <section className="direction-choices" aria-labelledby="direction-title">
      <div className="direction-heading">
        <span>
          <Compass size={15} />
          <b id="direction-title">人生方向</b>
        </span>
        <small>{directionField.stage}</small>
      </div>
      <div className="direction-grid">
        {directionField.choices.slice(0, 4).map((choice) => {
          const selected = directionField.selectedId === choice.id;
          return (
            <button
              key={choice.id}
              className={`direction-option tone-${choice.tone}${selected ? " selected" : ""}`}
              onClick={() => onSelect(choice.id)}
              disabled={disabled}
              title={choice.description}
            >
              <span className="direction-icon">{choice.icon}</span>
              <span className="direction-copy">
                <b>{choice.label}</b>
              </span>
              <span className="direction-fit">
                {selected ? <Check size={12} /> : null}
                {choice.fit}%
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
