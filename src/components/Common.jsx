import React from "react";
import { Compass } from "lucide-react";

export function Logo() {
  return (
    <div className="brand">
      <div className="brand-mark">
        <Compass size={21} />
        <i />
      </div>
      <div>
        <b>人生分岔口</b>
        <span>LIFE BRANCH · 人生模拟</span>
      </div>
    </div>
  );
}

export function IconButton({ children, ...props }) {
  return (
    <button className="icon-btn" {...props}>
      {children}
    </button>
  );
}

export function Stat({ icon: Icon, label, value, color }) {
  return (
    <div className="stat">
      <span className={`stat-icon ${color}`}>
        <Icon size={17} />
      </span>
      <div>
        <small>{label}</small>
        <b>{value}</b>
      </div>
    </div>
  );
}
