const thinkingOverride = (endpoint, model) => {
  const isDeepSeek =
    String(endpoint || "")
      .toLowerCase()
      .includes("deepseek") ||
    /^(?:deepseek|ds)(?:[-_./:]|$)/i.test(String(model || ""));
  return isDeepSeek ? { thinking: { type: "disabled" } } : {};
};

const parseJson = (text) =>
  JSON.parse(String(text || "").replace(/^```json\s*|\s*```$/g, ""));

const plannerPrompt = (
  context,
) => `你是人生模拟器的事件规划器。你不写故事，不决定成败，只提出尚未结算的现实处境。

本轮可使用的结构化事实：
${JSON.stringify(context)}

规则：
1. 返回6到10个彼此机制不同的候选；不要围绕同一职业、技能、关系或矛盾改写多个版本。
2. 每个候选必须通过sourceFactIds引用上面真实存在的事实ID。优先引用两个以上事实；不得为戏剧性改写人物身份和经历。
3. 可以增加普通偶然事实，但必须放入newFactsRequired。出现上下文以外的新人物时必须填写newActorJustification，说明现实入口。
4. 事件必须以未解决处境结束，不能预先写成功、失败、收获或损失。
5. 能力只描述此事件真正需要的条件。demands只允许使用颜值、运动、智力、天赋、财商、社交，权重范围0到0.8；无关能力不要填写。
6. choices提供2到4个角色现实中可能采取的行为。drives只允许好奇、安全、家庭、自主、归属，取值-0.8到0.8；不保证角色选择最优行为。
7. 避免职业跃迁、突然掌握技能、凭空出现贵人、重复旧争执。潜在冲突不是已经发生的冲突。
8. 不要使用固定人生模板，不要因为某项能力高就强迫人物进入对应职业。
9. 兴趣是动态倾向而不是必做任务。现实条件允许时，部分候选应通过interestLinks连接已有兴趣ID；同时保留与兴趣无关的普通生活候选。新兴趣只能由具体接触产生，mode写discovery并说明reason。
10. choice若会投入、探索、回避或放下一项兴趣，必须在interestEffects中写对应的engage、explore、avoid或abandon。兴趣影响人物是否愿意做，不保证事情成功。
11. 每个候选提供3到5个developmentBeats，描述同一因果线在这${context.date.monthsPerTurn}个月内可能经过的连续生活节点。节点不能预写结果，也不能引入第二条主线。

只输出JSON对象：
{"candidates":[{"id":"稳定短ID","premise":"具体但未结算的处境","actors":["主角"],"location":"现实地点","sourceFactIds":["事实ID"],"newFactsRequired":[],"newActorJustification":"","continuationOf":null,"triggerMechanism":"事件如何发生","dramaticQuestion":"本轮需要面对的问题","developmentBeats":[{"phase":"时间阶段","situation":"尚未结算的具体进展","causalLink":"与上一节点的因果"}],"interestLinks":[{"interestId":"已有兴趣ID或空","label":"兴趣名称","mode":"existing/discovery","relevance":0.6,"reason":"为何相关"}],"choices":[{"id":"短ID","action":"具体行为","motivations":[],"barriers":[],"drives":{},"interestEffects":[{"interestId":"","label":"","action":"engage/explore/avoid/abandon","intensity":0.6}],"effort":0.5}],"demands":{"exposure":{},"performance":{},"consequence":{}},"difficulty":0.5,"stakes":0.4,"signature":{"actors":[],"setting":"","mechanism":"","issue":""},"processUpdate":null}]}`;

const fallbackCandidate = (context) => {
  const process = context.activeProcesses[0];
  const interest = context.protagonist.interests?.find(
    (item) => item.status === "active",
  );
  const factIds = context.facts.slice(0, 3).map((fact) => fact.id);
  return {
    id: "routine_continuation",
    premise:
      process?.unresolvedQuestion ||
      "当前生活节奏中出现了一个需要当下处理的小变化",
    actors: ["主角"],
    location: process?.location || "当前生活圈",
    sourceFactIds: factIds,
    newFactsRequired: [],
    newActorJustification: "",
    continuationOf: process?.id || null,
    triggerMechanism: "既有日常自然推进",
    dramaticQuestion:
      process?.unresolvedQuestion || "主角会维持节奏还是做出小幅调整",
    developmentBeats: [
      {
        phase: "前段",
        situation: "既有日常继续推进，人物注意到需要处理的小变化",
        causalLink: "来自当前生活进程",
      },
      {
        phase: "中段",
        situation: "人物尝试维持原有节奏，但时间与精力开始重新分配",
        causalLink: "前段变化进入实际生活安排",
      },
      {
        phase: "后段",
        situation: "变化逐渐影响时间、精力或身边关系",
        causalLink: "此前的小变化没有自动消失",
      },
    ],
    interestLinks: interest
      ? [
          {
            interestId: interest.id,
            label: interest.label,
            mode: "existing",
            relevance: 0.35,
            reason: "当前日常可能挤压或容纳既有兴趣",
          },
        ]
      : [],
    choices: [
      {
        id: "maintain",
        action: "维持目前做法并观察变化",
        motivations: ["降低额外负担"],
        barriers: [],
        drives: { 安全: 0.4 },
        interestEffects: interest
          ? [
              {
                interestId: interest.id,
                label: interest.label,
                action: "avoid",
                intensity: 0.3,
              },
            ]
          : [],
        effort: 0.25,
      },
      {
        id: "adjust",
        action: "针对眼前问题做一次有限调整",
        motivations: ["改善当前处境"],
        barriers: ["需要额外精力"],
        drives: { 好奇: 0.25, 自主: 0.2 },
        interestEffects: interest
          ? [
              {
                interestId: interest.id,
                label: interest.label,
                action: "engage",
                intensity: 0.4,
              },
            ]
          : [],
        effort: 0.5,
      },
    ],
    demands: { exposure: {}, performance: {}, consequence: {} },
    difficulty: 0.35,
    stakes: 0.2,
    signature: {
      actors: ["主角"],
      setting: process?.location || "当前生活圈",
      mechanism: "日常自然推进",
      issue: process?.unresolvedQuestion || "是否调整当前节奏",
    },
    processUpdate: null,
  };
};

export async function generateEventCandidates(
  { apiKey, endpoint, model },
  context,
) {
  const url = endpoint.replace(/\/$/, "") + "/chat/completions";
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      ...thinkingOverride(endpoint, model),
      messages: [
        {
          role: "system",
          content:
            "只提出有状态依据、尚未结算的人生事件候选。不要写完整故事，不要选择结果。",
        },
        { role: "user", content: plannerPrompt(context) },
      ],
      ...(url.includes("api.deepseek.com")
        ? { response_format: { type: "json_object" } }
        : {}),
      max_tokens: 2600,
      temperature: 0.92,
    }),
  });
  if (!response.ok) throw new Error(`事件候选请求失败（${response.status}）`);
  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error("模型没有返回事件候选");
  try {
    const parsed = parseJson(text);
    const candidates = Array.isArray(parsed.candidates)
      ? parsed.candidates
      : [];
    return candidates.length
      ? candidates.slice(0, 10)
      : [fallbackCandidate(context)];
  } catch {
    return [fallbackCandidate(context)];
  }
}
