import { calculateFinancialSummary } from "../simulation/financeModel";

const money = (value) =>
  new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 0 }).format(
    value || 0,
  );

function drawWrapped(ctx, text, x, y, maxWidth, lineHeight, maxLines = 99) {
  let line = "",
    lines = 0;
  for (const char of String(text || "")) {
    const test = line + char;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, y);
      y += lineHeight;
      line = char;
      lines++;
      if (lines >= maxLines) return y;
    } else line = test;
  }
  if (line && lines < maxLines) {
    ctx.fillText(line, x, y);
    y += lineHeight;
  }
  return y;
}

export function exportLifePoster(summary, { age, state, settings, logs }) {
  const netWorth = calculateFinancialSummary(state).netWorth;
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1440;
  const c = canvas.getContext("2d");
  const g = c.createLinearGradient(0, 0, 1080, 1440);
  g.addColorStop(0, "#171934");
  g.addColorStop(0.55, "#342f66");
  g.addColorStop(1, "#f17d62");
  c.fillStyle = g;
  c.fillRect(0, 0, 1080, 1440);
  c.globalAlpha = 0.18;
  c.fillStyle = "#fff";
  for (let i = 0; i < 18; i++) {
    c.beginPath();
    c.arc(
      (i * 193) % 1080,
      (i * 317) % 1440,
      18 + (i % 4) * 11,
      0,
      Math.PI * 2,
    );
    c.fill();
  }
  c.globalAlpha = 1;
  c.fillStyle = "#ff9b78";
  c.font = "700 24px sans-serif";
  c.fillText("LIFE BRANCH · AI SIMULATION", 72, 90);
  c.fillStyle = "#fff";
  c.font = "900 76px sans-serif";
  c.fillText(summary.title || "我的这一生", 72, 200);
  c.font = "500 30px sans-serif";
  c.fillStyle = "#deddf0";
  drawWrapped(c, summary.epitaph, 74, 260, 920, 46, 2);
  c.fillStyle = "rgba(255,255,255,.1)";
  c.beginPath();
  c.roundRect(60, 350, 960, 205, 30);
  c.fill();
  c.fillStyle = "#fff";
  c.font = "800 26px sans-serif";
  c.fillText(`${settings.name} · ${settings.gender} · ${age} 岁`, 94, 407);
  c.font = "500 23px sans-serif";
  c.fillStyle = "#d6d4e7";
  drawWrapped(c, summary.overview, 94, 455, 880, 36, 3);
  const stats = [
    ["净资产", `¥${money(netWorth)}`],
    ["健康", state.health],
    ["事业", state.career],
    ["人生月数", logs.length - 1],
  ];
  stats.forEach((s, i) => {
    const x = 72 + i * 245;
    c.fillStyle = "#ffb093";
    c.font = "700 20px sans-serif";
    c.fillText(s[0], x, 635);
    c.fillStyle = "#fff";
    c.font = "900 36px sans-serif";
    c.fillText(String(s[1]), x, 680);
  });
  c.fillStyle = "#fff";
  c.font = "900 30px sans-serif";
  c.fillText("人生章节", 72, 770);
  let y = 825;
  for (const ch of (summary.chapters || []).slice(0, 4)) {
    c.fillStyle = "#ffad8e";
    c.font = "800 20px sans-serif";
    c.fillText(`${ch.age}  ${ch.title}`, 74, y);
    c.fillStyle = "#e1dfec";
    c.font = "500 20px sans-serif";
    y = drawWrapped(c, ch.text, 74, y + 34, 900, 31, 2) + 24;
  }
  c.fillStyle = "rgba(17,18,40,.45)";
  c.beginPath();
  c.roundRect(60, 1190, 960, 150, 28);
  c.fill();
  c.fillStyle = "#fff";
  c.font = "800 23px sans-serif";
  c.fillText("如果重来一次", 92, 1240);
  c.font = "500 20px sans-serif";
  c.fillStyle = "#dedcea";
  drawWrapped(c, summary.advice, 92, 1280, 880, 30, 2);
  c.font = "600 18px sans-serif";
  c.fillStyle = "rgba(255,255,255,.65)";
  c.fillText("由「人生分岔口」LLM 社会模拟器生成", 72, 1390);
  const a = document.createElement("a");
  a.download = `${settings.name}-${age}岁-人生海报.png`;
  a.href = canvas.toDataURL("image/png");
  a.click();
}
