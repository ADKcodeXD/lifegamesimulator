import React from "react";
import { Check, Compass, Sparkles } from "lucide-react";

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
      <p>结合当前年龄、性格与家庭生成。选择会提高下一轮倾向，并留下长期惯性。</p>
      <div className="direction-grid">
        {directionField.choices.map((choice) => {
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
                <small>{choice.description}</small>
                <i><em style={{ width: `${choice.fit}%` }} /></i>
              </span>
              <span className="direction-fit">
                {selected ? <Check size={13} /> : choice.learnedWeight > 0 ? <Sparkles size={12} /> : null}
                {choice.fit}%
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
