let audioContext;

const getAudioContext = () => {
  if (typeof window === "undefined") return null;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return null;
  audioContext ||= new AudioContext();
  if (audioContext.state === "suspended") audioContext.resume();
  return audioContext;
};

const tone = (context, start, frequency, duration, options = {}) => {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = options.type || "sine";
  oscillator.frequency.setValueAtTime(frequency, start);
  if (options.to) {
    oscillator.frequency.exponentialRampToValueAtTime(options.to, start + duration);
  }
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(options.volume || 0.035, start + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
};

export function playUiSound(kind = "click", enabled = true) {
  if (!enabled) return;
  const context = getAudioContext();
  if (!context) return;
  const now = context.currentTime;

  if (kind === "turn") {
    tone(context, now, 180, 0.11, { type: "triangle", to: 260, volume: 0.045 });
    tone(context, now + 0.08, 360, 0.16, { type: "sine", to: 520, volume: 0.03 });
    return;
  }
  if (kind === "success") {
    [440, 554, 659].forEach((frequency, index) =>
      tone(context, now + index * 0.065, frequency, 0.2, { volume: 0.032 }),
    );
    return;
  }
  if (kind === "low") {
    tone(context, now, 220, 0.22, { type: "triangle", to: 145, volume: 0.04 });
    return;
  }
  if (kind === "reveal") {
    tone(context, now, 330, 0.12, { type: "triangle", to: 440, volume: 0.03 });
    tone(context, now + 0.07, 495, 0.18, { volume: 0.025 });
    return;
  }
  if (kind === "toggle") {
    tone(context, now, 520, 0.08, { type: "sine", to: 650, volume: 0.025 });
    return;
  }
  tone(context, now, 760, 0.045, { type: "sine", to: 620, volume: 0.018 });
}
