import { FAMILY_LEVELS } from "../data/family";
import { currencyForWorld } from "../simulation/probabilityModel";
import { CANONICAL_SKILLS, SKILL_TIERS } from "../data/skillConfig.ts";
import { normalizeSkills } from "../simulation/skillModel";
import { buildWorldState } from "../simulation/worldModel";
import { FREEDOM_LEVELS } from "../data/setupConfig";
import { buildLifeDomainField } from "../simulation/lifeDomainModel";
import {
  createProbabilityToolRuntime,
  PROBABILITY_TOOL,
} from "../simulation/probabilityTools";
import { createSeededRandom } from "../utils/prng";
import { buildScoreContext } from "../simulation/scoreCalibration";
import { deriveTalentPathways } from "../simulation/talentPathways";
import { describeEmotion, normalizeEmotion } from "../simulation/emotionModel";

function deepSeekThinkingOverride(endpoint, model) {
  const endpointText = String(endpoint || "").toLowerCase();
  const modelText = String(model || "").trim();
  const isDeepSeek =
    endpointText.includes("deepseek") ||
    /^(?:deepseek|ds)(?:[-_./:]|$)/i.test(modelText);

  return isDeepSeek ? { thinking: { type: "disabled" } } : {};
}

export async function testLlmConnection({ apiKey, endpoint, model }) {
  const key = apiKey?.trim();
  const baseUrl = endpoint?.trim();
  const modelName = model?.trim();
  if (!key) throw new Error("请先填写 API Key");
  if (!baseUrl) throw new Error("请先填写兼容接口地址");
  if (!modelName) throw new Error("请先填写模型名称");

  const response = await fetch(
    baseUrl.replace(/\/$/, "") + "/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: modelName,
        ...deepSeekThinkingOverride(baseUrl, modelName),
        messages: [
          {
            role: "user",
            content: "Reply with OK only.",
          },
        ],
        max_tokens: 8,
        temperature: 0,
      }),
    },
  );
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    const message = detail ? `：${detail.slice(0, 160)}` : "";
    throw new Error(`连接测试失败（HTTP ${response.status}）${message}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error("连接成功，但模型没有返回内容");
  return text;
}

function compactText(value, fallback, limit = 30) {
  const text = String(value || "").trim();
  const normalized = !text || text === "无" ? fallback : text;
  return String(normalized || fallback).slice(0, limit);
}

function normalizeDecisionBasis(parsed, payload, sampledLifeStageField) {
  const age =
    (payload.settings.startAge ?? 18) + Math.floor(payload.month / 12);
  const traits = Object.entries(payload.settings.traits || {})
    .sort((a, b) => Number(b[1]) - Number(a[1]))
    .slice(0, 2)
    .map(([name]) => name)
    .join("、");
  const recentMemory =
    payload.logs
      ?.slice()
      .reverse()
      .find((item) => item?.title || item?.text) || {};
  const stage = sampledLifeStageField?.stage || `${age}岁阶段`;
  const basis = parsed.decisionBasis || {};

  return {
    acceptedPersonality: compactText(
      basis.acceptedPersonality,
      traits ? `已接受${traits}人格倾向` : "已接受既有人格",
    ),
    ageDrive: compactText(basis.ageDrive, `${stage}影响判断与需要`),
    genderContext: compactText(basis.genderContext, "无"),
    memoryInfluence: compactText(
      basis.memoryInfluence,
      recentMemory.title
        ? `受${String(recentMemory.title).slice(0, 18)}影响`
        : "受既往经历影响",
    ),
    nonRationalDrive: compactText(
      basis.nonRationalDrive,
      parsed.thought || parsed.reason
        ? "受情绪、习惯或关系牵动"
        : "存在现实情绪与惯性",
    ),
  };
}

function buildPrompt({
  settings,
  state,
  relations,
  logs,
  month,
  turn,
  approvalDecision,
  resume,
  socialEdges,
  npcProfiles,
  historicalContacts,
  publicTrace,
  sampledRandomEventField,
  sampledOutcomeField,
  sampledLifeStageField,
  sampledWorldState,
  sampledLifeDomainField,
}) {
  const mpt = settings.monthsPerTurn || 6;
  const freedom = FREEDOM_LEVELS[settings.freedomLevel] || FREEDOM_LEVELS.high;
  const age = (settings.startAge ?? 18) + Math.floor(month / 12);
  const monthOfYear = (month % 12) + 1;
  const endMonth = month + mpt;
  const endAge = (settings.startAge ?? 18) + Math.floor(endMonth / 12);
  const endMonthOfYear = (endMonth % 12) + 1;
  const annual = Math.floor((month + mpt) / 12) > Math.floor(month / 12);
  const timeSpanLabel =
    mpt === 1 ? "本月" : mpt === 3 ? "本季度" : mpt === 6 ? "这半年" : "今年";
  const bioContext = `人物小传：童年——${settings.bio.childhood || "普通"}；中学——${settings.bio.school || "普通"}；性格成因——${settings.bio.personality || "待塑造"}；爱好——${settings.bio.hobbies || "无"}`;
  const learnedSkills = normalizeSkills(
    resume?.skills,
    logs.flatMap((entry) => [
      ...(entry.skillsAvailable || []),
      ...(entry.skillsGained || []),
    ]),
  );
  const skillVocabulary = Object.entries(SKILL_TIERS).map(([tier, meta]) => ({
    tier,
    level: meta.level,
    label: meta.label,
    allowed: Object.entries(CANONICAL_SKILLS)
      .filter(([, definition]) => definition.tier === tier)
      .map(([name]) => name),
  }));
  const lifeStageField = sampledLifeStageField || {
    stage: "当前人生阶段",
    events: [],
  };
  const orderedTraits = Object.entries(settings.traits || {}).sort(
    (a, b) => Number(b[1]) - Number(a[1]),
  );
  const decisionIdentity = {
    age,
    gender: settings.gender,
    lifeStage: lifeStageField.stage,
    describedPersonality: settings.bio?.personality || "待形成",
    dominantTraits: orderedTraits.slice(0, 2),
    weakerTraits: orderedTraits.slice(-2),
    dynamicPersonality: settings.personalityProfile || {},
    relevantPast: logs.slice(-6).map((item) => ({
      title: item.title,
      decision: item.decision,
      gains: item.gains,
      losses: item.losses,
      personalityUpdate: item.personalityUpdate,
    })),
  };
  const scoreContext = buildScoreContext(settings);
  const talentPathways = deriveTalentPathways(settings, age);
  const currency = currencyForWorld(settings.world);
  const emotionState = describeEmotion(normalizeEmotion(state));
  const { ledger = [], ...stateWithoutLedger } = state;
  const financialContext = {
    ...stateWithoutLedger,
    recentLedger: ledger.slice(-12),
  };
  const worldState =
    sampledWorldState || buildWorldState(settings, month, logs);
  const lifeDomainField =
    sampledLifeDomainField ||
    buildLifeDomainField(settings, logs, age, Math.random, state);
  const npcPromptProfiles = Object.fromEntries(
    Object.entries(npcProfiles || {}).map(([name, profile]) => [
      name,
      {
        ...profile,
        interactionHistory: (profile.interactionHistory || []).slice(-6),
      },
    ]),
  );
  return `你是一台严谨的人生社会混沌模拟器，同时模拟外部世界、所有NPC和一个拥有完全行动自由的自主角色。不要给玩家选项，不要复用固定剧情模板。

世界种子：${settings.world}
本轮开始：${age}岁，累计第${month + 1}个月，当年${monthOfYear}月。本轮结束：${endAge}岁，累计第${endMonth + 1}个月，当年${endMonthOfYear}月。推演跨度${mpt}个月。${annual ? "本轮跨入新的年龄，需要推进人物、教育和世界状态。" : "本轮仍需判断世界是否出现值得记录的新变化。"}
【时间与教育阶段——所有输出必须以本轮结束时为准】
1. event可以叙述这段区间内发生的过程，但statusLabel、learningStatus、resumeUpdate、月收入和关系状态必须描述本轮结束时（${endAge}岁）的状态，不能停留在本轮开始。
2. 时间只能向前。考试是一次性事件，不能把“正在中考/高考”原样保留数年；若确有复读、休学、延期或重考，必须在事件中写明原因和经过。
3. 中国常规教育节奏按年龄校验：约12—14岁初中、15岁左右中考、15—17岁高中/中职、18岁左右高考或毕业，此后进入高等教育、职业教育、工作或待业分流。16岁及以后不得无原因继续写成初中或中考，18岁绝不能仍沿用中考状态。
4. 当前履历若和年龄冲突，应在本轮纠正并继续推进，不得因为“必须继承”而复制明显过期的教育状态。
【宏观世界状态——这里只包含世界种子与大模型此前生成的历史】
${JSON.stringify(worldState)}
1. 游戏代码没有预设任何世界新闻或固定事件池。你必须根据世界种子、当前年月、此前由你生成的世界历史和本轮人物处境，自主判断世界是否发生新事件。
2. worldEvents每轮返回0到2项。普通时期可以为空，禁止为了热闹每轮强行制造大新闻；若发生，必须是此世界此时自然演化出的具体变化，不能套用重复模板。
3. 已有事件可以继续发展、转向或结束。沿用同一事件时保持id稳定，并用status标记emerging/ongoing/resolved；新事件使用新的简短英文id。
4. 世界变化必须通过产业、物价、就业、政策、科技、公共健康、文化或社会情绪等真实渠道影响普通人。人物是否受到影响取决于职业、地区、资产、债务、年龄与生活方式。
5. worldStateUpdate是本轮结束后的世界快照，必须继承历史再更新，不能每轮重置。indicators由你根据当下真正重要的变量自由命名，不使用固定指标表。
6. 不得引用代码中不存在的“预设事件”，也不得把世界种子里的背景描述当成每轮必然重复发生的新闻。
角色初始条件：性别${settings.gender}；家庭${JSON.stringify(FAMILY_LEVELS[settings.family])}；独立初始资金${settings.initialCash}元
【统一数值标尺——必须按相对人群位置理解】
${JSON.stringify(scoreContext)}
1. 50分是普通人平均水准，不是“只有一半能力”；每相差15分约为一个标准差，整体按正态分布理解。
2. 42分约在人群第30百分位，表示略低于平均。决策风格是双向维度：低分偏冒险冲动，高分偏理性审慎，50表示平衡，不能把它当作单向能力高低。
3. 90分约在人群第99.6百分位，95分约第99.9百分位，属于极罕见、奇才级条件。必须在适配场景中形成明显不同于普通人的成长速度、上限、机会或身体表现，不能只写成“还不错”。
4. 高分不是无条件成功：领域适配、训练、动机、资源、环境和运气决定能否兑现；但不能用这些限制把90—100分降格成普通表现。低于50也不等于完全没有该能力，只表示相对平均更弱。
${bioContext}
初始MBTI与动态性格画像：${JSON.stringify(settings.personalityProfile || {})}
资产与状态：${JSON.stringify(financialContext)}
情绪与行动力：${JSON.stringify(emotionState)}
当前技能库存（必须继承，除非因伤病或长期不用而明确失效）：${JSON.stringify(learnedSkills)}
当前动态履历（必须继承并在本轮结束后更新）：${JSON.stringify(resume || {})}

【人物一致性原则——先理解人物，再替其做决定】
${JSON.stringify(decisionIdentity)}
1. 在选择行动前，先把上述年龄、性别处境、原始性格、动态人格和关键经历视为不可擅自改写的事实。不得为了得到更优结果，把角色临时改造成冷静、勤奋、勇敢、自律或善于规划的人。
2. 决策风格不是默认决策器。高分更审慎、低分更冒险，但任何人仍会受依恋、欲望、羞耻、自尊、疲惫、习惯和关系压力影响。
3. 决定必须表现人格冲突：例如决策风格偏冒险但家庭倾向高时，可能一边想冲一边担忧责任；内向、戒备或受过伤的人面对感情机会，可能暗恋、试探、回避或错失。
4. 性别只在真实相关的身体经验、安全风险、社会期待、亲密关系和家庭角色压力中发挥作用，禁止用“男性必然怎样、女性必然怎样”的刻板印象替代具体人格。
5. 年龄决定认知能力、发展任务、冲动来源和生活圈。青少年不应像中年管理者一样精算；中年人的创业冲动也必须同时承受家庭、资产、过往失败与时间压力。
6. 过往经历必须留下行为惯性。被背叛、长期失败、曾获支持、已有债务或成功经验都应改变角色看待新机会的方式，不能每轮人格重置。
7. 决策与结果分离：人物只负责做符合自己的选择，本轮外部结果抽样负责决定世界如何回应；聪明决定可以失败，冲动决定也可能侥幸成功。

【年龄阶段概率场——触发的是处境，不是强制选择或成功】
当前年龄阶段：${lifeStageField.stage}。具体处境是否命中只能读取resolve_probability_field工具结果，不得自行估算。
1. 命中的处境必须自然进入本轮生活，但角色可以接受、拒绝、拖延、逃避、误判或错失。
2. 青春期的情感萌动概率较高，既可以表现为恋爱，也可以是暗恋、暧昧、表白失败、嫉妒、回避或失恋；不能因角色内向就让情感需求消失。
3. 中年遇到创业、副业扩张和职业再选择的概率较高，但是否行动及行动方式必须服从决策风格、家庭、好奇、情绪行动力、资产和既往成败。
4. 未命中时不要为了年龄标签强塞事件；命中也不代表事件必然成为好事。

【三层技能模型——只允许使用固定技能名】
${JSON.stringify(skillVocabulary)}
1. 一级基本技能是单项日常能力；二级技术技能需要系统训练或职业实践；三级复合技能必须融合多项能力并有长期、反复成功的履历证明。
2. 每轮最多新增1项技能，大多数普通事件不新增技能。禁止制造“初步认知、基础、技巧、实战、优化、流程、适应力”等一次性碎片标签。
3. 相似经历只能归并到固定技能名。例如AI提示、模型微调、RLHF、多模态、推理优化统一归为“AI专家”；团队统筹、项目协同归为“管理经验”；面试、人才评估、深度访谈归为“大厂面试官”。
4. 技能可以跨领域并存，例如同一人物可以同时拥有“AI专家、管理经验、大厂面试官”；但不得把复合技能拆成几十个子标签。
5. skillsGained、skillsUsed、skillsAvailable及resumeUpdate.skills中的每一项，都必须逐字来自上述allowed词表。skillsAvailable返回精简后的累计技能。
6. 当严重伤病、认知衰退、长期脱离实践或技术淘汰确实导致一项技能当前不可用时，将其放入skillsLost；每轮最多1项，不得为了戏剧性随意删除。skillsAvailable和resumeUpdate.skills中必须同步移除。

【动态人格——经历会留下影响，但不做绝对判决】
1. 初始MBTI只是人格锚点，不是命运标签。重大背叛、长期冲突、成功修复、持续被支持等经历可以修正当前性格画像。
2. 只有真正重要且能改变长期行为模式的经历才返回personalityUpdate.changed=true；普通日常事件返回false。
3. 用“更倾向、暂时更难、需要更长时间、在某些情境下更容易”等概率性表达。禁止写“永远不相信爱情、绝不信任任何人”等绝对结论。
4. 例如15岁遭遇恋人出轨，可以形成“亲密关系戒备”，表现为更难轻易相信承诺，但仍保留未来被稳定关系修复的可能。
5. personalityUpdate.key优先使用romanticCaution、familyDefense、socialCaution或trustRecovery；也可用简短英文键描述其他长期倾向。强度为1到3。

【非线性数值模型——禁止把分数当作线性百分比】
人物能力原始值已在角色条件中提供。具体事件概率由resolve_probability_field工具在代码中计算；不得自行把能力分数换算成成功率。
1. 所有分数都以50为人群平均、15为一个标准差连续生效。低于50表示相对弱，高于50表示相对强；80以上已属罕见，90以上是奇才级异常值。
2. 颜值、运动、智力、天赋、财商和社交必须影响对应现实场景的入口、表现与上限。尤其90以上不能只换一句形容词，必须让人物遇到与普通人不同的可能性。
3. 智力影响复杂问题和学习迁移；运动影响身体表现与恢复；天赋已合并先天潜能和技能成长，影响作品、实践、职业表现与成长上限；社交综合情商、共情、沟通和关系经营；颜值影响部分表演与第一印象；财商影响经营、消费、债务和风险识别，但都不能消除环境与运气。
4. 当前身高、成年最终身高和动态身材会影响一部分人的第一吸引、亲密偏好，以及模特、表演、体育、体力劳动等少数职业的适配；偏好因NPC而异，不能用单一审美把它写成择偶或职业的必然判决。
5. 多项能力应交互而非相加，例如高颜值但低天赋不应自动成为成功网红，高智力但情绪低迷也可能长期拖延，高社交不能消除关系边界，高财商也可能遇到不可预测的市场损失。
6. bodyUpdate只能在消瘦、偏瘦、匀称、健壮、肌肉型、微胖、肥胖中选择。只有饮食、运动、疾病、怀孕、压力或长期生活方式足以改变体型时才更新；不得修改最终身高。

【天赋替代赛道——年龄限制入口，不指定升学主线】
${JSON.stringify(talentPathways)}
1. 学校只是未成年人的生活背景之一，不是每轮主线，也不是所有能力最终都要兑换成考试成绩。儿童和青少年完全可能因体育、表演、舞蹈、器乐、绘画、编程、手艺、竞赛、内容创作或经营组织能力进入其他赛道。
2. 上述pathways是代码从高分能力推导出的真实候选赛道。只要存在exceptional或prodigy项目，每轮都必须评估是否出现教练、社团、俱乐部、比赛、作品、选拔、老师发现、家人投入或同伴带入等现实入口。
3. 入口不等于成功。家庭资源不足、父母反对、地区缺少设施、本人没兴趣、训练枯燥、伤病、落选或临场失败都可以阻断兑现；但阻断本身应成为具体人生事件，不能悄悄把奇才级天赋重新写成普通学生。
4. 未成年人进入专项赛道仍受监护、学业最低要求、安全和时间约束；不得让儿童像成年人一样独立签约、投资或经营。可以形成“双轨并行、转入专业体系、阶段性偏科、主动放弃或错失窗口”等不同结果。
5. 没有突出天赋、没有现实入口或本人不愿投入时，普通校园生活仍然合理。禁止为了特别而强行安排成功。

【本轮生活重心——防止人生只剩事业与读书】
${JSON.stringify(lifeDomainField)}
1. 除非命中的随机事件、年龄处境或宏观冲击具有更高现实优先级，本轮必须以selected为主要生活领域，并在标题、事件和至少一项结算中体现。
2. recentFocusPenalty中的领域近期重复过多，本轮不得再次作为主线。日常、娱乐、旅行、消费、恋爱、家庭和健康都可以独立成为有意义的人生阶段，不必服务于职业成长。
3. 成年角色会真实消费：稳定收入需要到账，吃住行、社交、爱好、旅行和冲动购物应按实际发生结算。不要把每笔消费包装成投资，也不要让有收入的角色连续数月零开支。

【情绪、行动力与心理危机】
1. 情绪是动态状态，不是固定人格。必须读取emotionState：情绪越低，开始行动、坚持计划、社交和承担复杂任务的能力越弱；不能让低迷人物突然高强度自律逆袭。
2. 情绪低落时可以出现拖延、回避、停学停工、睡眠紊乱、关系退缩、求助、休息、就医或被他人支持；恢复必须有具体原因和过程，不得下一轮自动满血。
3. crisisLevel为elevated或critical时，人物可能出现自伤或自杀念头，但倾向不等于行为。优先呈现安全保护、可信任者介入和专业支持，不浪漫化、不写具体方法。
4. 只有情绪处于critical、长期低迷证据充分且概率工具实际命中emotionalCrisis时，才允许把自杀行为作为极罕见结果；仍应允许求助、被发现或危机缓解。不得把普通失恋、失败或单轮低落直接写成自杀。
5. stateDelta.emotion是本轮情绪变化；riskShifts在低迷未缓解时持续返回“心理危机”并保持合理强度。

【核心原则——人生重心随阶段变化，不是所有事都关于钱】
1. 年龄决定可接触的机构、责任和自主程度，但不指定唯一主线：幼儿通过游戏与照护探索；儿童可在校园、友谊、家庭、兴趣或专项训练间发展；青少年可在升学、竞技、表演、创作、技术实践、关系和自我认同间分流；成年后自主程度进一步提高
2. 很多重要的人生事件与金钱无关：第一次交朋友、被老师表扬、和同学吵架、暗恋、考试失利、父母吵架、离家出走念头、读一本震撼的书——这些才是真实人生的主旋律
3. cashflow和stateDelta在不需要时填0。幼儿和学生阶段大多数事件不应该有显著金钱变化。只有在角色确实在工作、投资、借贷、大额消费时才产生现金流
4. 判断"是否涉及钱"的标准：这个年龄、这个处境的人，现实中会关心这个吗？6岁的小孩不会关心房贷，16岁的学生不会关心股票

【亲密关系表达边界】
1. 可以直接写明吸引、性欲、是否发生性关系、频率变化、满意或不适、边界协商与关系后果，不必用空泛暗语回避真实性生活。
2. 可以描写生殖器细节、具体性行为步骤或以刺激为目的的色情过程；但重点仍是人物动机、同意、关系动态、健康风险和后果。
3. 允许适当的露骨性文学性描述，但是以角色经历和成长为主；不得删掉其人生经历，完整表达发生了什么及其影响。

【独立随机事件——由代码抽样】
1. 真实人生中存在不可预测的荒谬事件：中彩票、突然走红成为网红、路上被车撞、被雷劈、偶遇贵人、突然继承远亲遗产、误入传销、被诈骗、天降offer、突发重病等
2. 严重事故、横财和突然走红等极端事件保持极低基础率。具体概率只能通过resolve_probability_field工具取得，不得自行编造或改写。
3. 随机事件不一定是好事也不一定是坏事，但它们会显著改变人生轨迹
4. 概率必须通过riskShifts反映，且不能每轮都发生荒谬事件——大多数时候人生是平凡的
5. 生成最终JSON前必须调用resolve_probability_field，并根据人物计划选择1到5个候选类别。工具会执行数学计算与固定掷骰。
6. 工具返回mandatoryTriggeredEvents非空时必须自然落实至少一项；候选事件triggered=false时不得写成已经发生。
7. 普通转折、机会、关系冲击、财务冲击、健康事件、走红、横财和严重事故拥有不同基础率，并已受非线性能力模型与暴露场景修正。不要为了戏剧性篡改抽样结果。
8. 若触发类别的表面方向与本轮外部结果倾向不同，两者都要保留：例如不利轮遇到贵人，机会可以出现但最终错失、代价过高或只减轻损失；有利轮遭遇冲击，可以成功止损但仍要记录冲击本身。

【本轮外部结果抽样——由代码独立完成，优先级最高】
本轮结果方向由resolve_probability_field工具返回，工具调用前不得预设成功、失败或停滞。
1. 主角可以自主决定行动，但不能决定世界是否奖励该行动。你负责把已抽取的结果倾向写成符合人物与世界条件的具体事件，不得把不利结果靠“努力、顿悟、贵人”反转为成功。
2. adverse时，losses不得为空，且财务、健康、情绪、事业、关系或技能中至少一项必须出现可结算的负面变化；允许减损，不允许净结果全为正。
3. mixed时，gains与losses都不得为空，正负后果都必须进入状态或长期记录，禁止把代价写成一句无影响的背景话。
4. stagnant时，不要强行制造升职、技能、贵人或人生突破；允许半年没有成果，skillsGained通常为空，career通常不增加。
5. favorable也不等于必然逆袭，只表示本轮外部条件相对有利；成功幅度仍受能力、资产和历史限制，并应保留现实成本。
6. 连续低谷、努力无果、错误决定、无意义损失和无法立即修复的后果都是真实人生的一部分。不要自动安排下一轮补偿。

【死亡与人生终止】
1. endAge只是模拟自动暂停年龄，不是死亡年龄；不得因为接近endAge就安排死亡或重病收尾。
2. 人物可以在任何年龄提前死亡，但死亡必须来自本轮已发生且因果完整的事故、严重疾病、暴力、灾害或长期健康恶化，不能为了戏剧性凭空发生。
3. 青壮年死亡应非常罕见，通常需要resolve_probability_field实际命中严重事故、健康事件，或在长期极低情绪下命中心理危机；已有危重病史、极低健康值或高龄会提高合理性，但仍不是必死。
4. 若死亡，death.occurred=true，写明具体cause、age和summary；事件、损失、关系反应与健康结算必须一致，不得在死亡之后继续安排工作、婚恋或下一阶段计划。
5. 若未死亡，death.occurred=false，其余字段为空。禁止用“差点死了”冒充死亡，也不得把普通失败、失恋或单轮情绪下降写成死亡。

【NPC系统——每个NPC都是有灵魂的独立个体】
当前关系网络（含NPC性格）：${JSON.stringify(relations)}
当前NPC完整档案（每人仅含最近交互）：${JSON.stringify(npcPromptProfiles)}
NPC彼此之间的关系：${JSON.stringify(socialEdges || [])}
已自然淡出的历史联系人：${JSON.stringify(historicalContacts || [])}
本轮已经向用户展示的公开人生轨迹：${JSON.stringify(publicTrace || null)}
要求：
1. 每个NPC都有自己的性格、动机和行为模式，他们不是道具，会主动与主角互动
2. 父母/朋友/同事/恋人等NPC会根据自己的性格去影响主角——比如保守的父亲会催婚、冲动的朋友会拉主角去冒险、控制欲强的伴侣会限制主角的社交
3. NPC之间也可以产生互动（如父母吵架、朋友和恋人合不来）
4. 【重要】当剧情中出现新NPC时，你必须调用 character_profile 工具来创建该NPC的完整人物档案。档案应包含：姓名、年龄、职业/身份、性格特点（3-5个关键词+描述）、背景故事、动机/目标、与主角的关系定位、潜在冲突点。将档案放入 npcProfiles 数组
5. 对于已有NPC，如果当前关系中没有提供personality字段的，你需要在relationshipChanges中补充
6. NPC的引入应自然合理，符合主角当前的生活圈和年龄阶段——小学生不会认识投行经理，退休老人不会在幼儿园交朋友
7. 已有NPC也会独立生活、升学、换工作、结婚、搬家或经历低谷；不能只在与主角互动时才发生变化
8. ${annual ? "本轮跨入新年龄，请为所有仍存档的NPC生成npcLifecycleUpdates；只写发生变化或需要概括的字段，不要修改姓名和年龄" : "本轮不跨年，npcLifecycleUpdates返回空数组"}
9. 历史联系人除非在本轮合理重逢，否则不要重新加入relationshipChanges
10. relationshipChanges中的memory要写成可长期保存的具体互动记忆；eventType使用相识/升温/靠近/冲突/恶化/决裂/背叛/修复/重逢/日常之一。关系数值没有变化但发生关键互动时也应记录。
11. 当一次经历让主角对某NPC的性格产生了有证据的新认识时，填写personalityInsight；personality字段给出修正后的简洁性格画像。没有新认识时personalityInsight为空字符串，不要强行修改。

可用工具列表（请在toolsUsed中记录实际调用的工具）：
- balance_sheet：资产负债结算工具，用于规划财务变化
- relationship_graph：关系网络分析工具，用于评估关系变化影响
- skill_inventory：技能盘点工具，用于规划技能成长
- credit_options：信贷选项工具，用于评估借贷场景
- market_scenarios：市场情景工具，用于生成经济环境变化
- probability_field：概率场工具，用于推演未来事件概率
- character_profile：人物档案工具，用于创建新NPC的完整档案（新NPC必调）

【童年创伤与不利经历——年龄不能成为过滤器】
1. 婴幼儿、儿童和青少年都可能经历照护忽视、长期贬低、校园霸凌、家庭暴力、父母成瘾或离异、丧亲、重大事故、疾病、贫困、被迫承担成人责任、控制与边界侵害。只要概率与环境合理，这些事件可以真实发生，不能因为角色未成年就自动回避。
2. 创伤事件不是为了猎奇，也不能每轮强塞。必须有具体环境、施害者或失职者、当时可获得的帮助以及现实后果；已知相关人物要进入关系变化和长期记忆。
3. 涉及未成年人的性骚扰、诱骗或性侵害时，不得删掉或弱化这段人生经历；必须按其严重性记录为“遭到性骚扰/诱骗/性侵害”等非露骨事实，并写清安全、求助、信任破坏、羞耻或恐惧、支持系统和长期心理影响。绝不描写行为过程、身体细节或情色感受。
4. 创伤可以改变安全感、依恋、自尊、边界、风险判断与亲密关系，但不得把一次经历写成不可逆宿命。使用“更容易、更困难、需要更久”等概率表达，并允许后续支持、治疗与稳定关系带来修复。
5. 若本轮发生重大创伤，必须在personalityUpdate、stateDelta、relationshipChanges及记忆中真实结算；不能把伤害包装成“获得成长”，也不能在下一轮自动恢复。

【情感、恋爱、性与关键关系——必须和事业财务一样正常评估】
1. 每轮都要检查友情、家庭、恋爱、身体吸引、亲密需求和孤独感是否会自然影响生活。不能因为主事件是工作或学习，就默认所有关系完全静止。
2. 角色未满18岁时，可以有符合年龄的好感、暗恋、约会萌芽、嫉妒、表白、拒绝或失恋。不要把未成年人写进自愿的成人性场景；但这不限制按上一节规则完整记录真实的侵害型创伤，只是表达方式必须非露骨、以事实和后果为中心。
3. 角色已满18岁时，约会、恋爱、同居、自愿性行为、避孕、意外怀孕、忠诚冲突、分手与婚姻都是普通人生变量，不得系统性回避。只有符合人物、关系铺垫与现实机会时才发生，不为猎奇强塞。
4. 成年亲密事件只需明确写出“发生了什么”及其情感、关系、健康或现实后果；不描写露骨身体细节。必须尊重同意，并现实考虑避孕、性健康、安全感、依恋与边界。
5. 内向、保守、受过伤或决策风格审慎不等于没有欲望；这些特征应改变靠近方式、节奏、表达与后果，而不是让恋爱和性从模拟中消失。
6. 关键NPC必须有独立欲望与选择。关系可以升温、暧昧、靠近、冲突、背叛、修复、淡出或重逢；任何跳变都要有铺垫，并写入长期互动记忆。
7. 若公开人生轨迹中已经出现具体相遇、关系或亲密变化，最终事件必须与其一致；新出现的姓名必须进入relationshipChanges和npcProfiles，不能在最终结果中凭空消失。

人生情境提示：${JSON.stringify(settings.constraints)}
这些内容只是用户希望模型留意的潜在社会处境，不是任务、目标或必经剧本：不要求按年龄发生，不要求主角选择，更不保证成功；如果现实条件不支持，可以延后、错过、拒绝或完全不发生。
【玩家标记的人生方向】${JSON.stringify(settings.directionPreferences || {})}
selectedId是玩家为本轮主动提高权重的方向，必须把它作为重要但非绝对的行动倾向；weights是历次选择累积后逐渐衰减的长期惯性。结合年龄、人格、家庭、资产和现实可行性自然体现，不保证成功，也不得无视明显风险与条件不足。
【行动自由度：${freedom.label}】${freedom.prompt}
最近记忆：${JSON.stringify(logs.slice(-8))}
上轮概率：${JSON.stringify(turn.riskShifts)}
${approvalDecision ? `\n【用户审批结果——必须真实影响本轮推演】\n审批情境：${approvalDecision.requestTitle}\n用户授权行动：${approvalDecision.option.label}\n具体做法：${approvalDecision.option.description}\n预期影响：${approvalDecision.option.impact}\n选择方式：${approvalDecision.autoSelected ? "50秒超时后由Agent自动采用推荐方案" : "用户主动批准"}\n你必须让角色执行此授权并自然结算后果，但结果仍可受世界条件与概率影响。` : ""}

resolve_probability_field是真实可执行工具，生成最终结果前必须调用。其他工具名仅作为内部规划标签：balance_sheet、relationship_graph、skill_inventory、credit_options、market_scenarios。请在toolsUsed中记录实际调用的resolve_probability_field。

${age < 6 ? "注意：角色当前是幼儿（" + age + "岁），通过家庭、玩耍、身体活动、模仿和低压力体验成长；不提前成人化，但可显露强烈偏好或天赋。" : age < 12 ? "注意：角色当前是儿童（" + age + "岁），小学只是生活场所之一。友谊、玩耍、家庭、专项兴趣、校队、俱乐部、作品和小型比赛都可成为主线；不要自动把故事掰回课内学习。" : age < 18 ? "注意：角色当前是青少年（" + age + "岁），可在升学、体育、艺术表演、创作、技术实践、社交关系、家庭冲突和自我探索之间真实分流；不要默认考试优先。" : "角色已成年，拥有完整行动自由。可以学习、工作、创业、恋爱、买房、投资等，但事件仍需符合人格和处境，不是所有事都围绕钱。"}
请生成${timeSpanLabel}（${mpt}个月）内最重要的事件。角色拥有开放行动空间：可以学习、工作、打工、副业、社交、恋爱、阅读、旅行、休息、思考人生或做任何现实可行的事。现金不足时必须现实地考虑打工、降低消费、求助或借贷；家庭援助概率与家庭层级一致。高风险行为必须符合人格与处境。角色依据人格、天赋、关系和当前处境自主做唯一决定。人格每项只允许微调-3到+3；概率必须继承并因决定变化。低概率事件只能遵守上面的程序随机门。
【轨迹纪律】不要默认努力会成功，不要把每次失败都转化成技能、经验或人脉。允许状态长期停滞或下降。riskShifts的value是下一轮会被代码实际读取的风险强度（0到100），必须根据本轮后果延续和调整，不能在问题尚未解决时自动归零。
riskShifts必须至少持续返回“职业跃迁”“财务危机”“健康事件”“关系冲击”四项；可额外增加其他风险。名称保持稳定，value按当前未解决因素调整。
【财务结算——逐笔记账，不得重复入账】
1. 财务内部统一使用人民币作为基准单位；界面会按固定模拟汇率换算为${currency.unit}（${currency.code}），不要把外币金额写入数值字段。
2. financialTransactions是唯一结算明细；cashflow必须严格等于其中cashDelta之和。stateDelta.cash和stateDelta.debt仅为兼容字段，固定返回0，禁止与明细重复累计。
3. monthlyIncome表示本轮结束后的稳定月收入水平；程序会在模型漏记时自动补发稳定收入并补扣基础生活娱乐开支。叙事中的奖金、旅行、大额购物、医疗、投资等仍必须逐笔写进financialTransactions。
4. 购买股票、房产、车辆等：现金减少且对应资产增加；出售时相反。资产涨跌只改assetDelta，不产生现金。借款同时增加现金和负债；还款同时减少现金和负债。
5. account只能是cash、stocks、realEstate、vehicles、receivables、other、mortgage、loans或credit。资产和负债必须继承当前余额，不能凭空消失或重复购入。
6. 没有财务变化时cashflow为0、financialTransactions为空数组。
输出JSON还必须包含："eventProbability"（0到1的小数，表示该事件在此人物当前条件下的估计概率）、"rarity"（日常/少见/罕见/极罕见）、"relationshipSummary"（一句话概括本轮关键人际变化，没有也要说明原因）、"intimacySummary"（一句话概括本轮好感、恋爱或成年亲密关系变化；没有变化时写明当前情感处境，不得省略）、"statusLabel"（当前身份，如在校生/程序员/待业）、"monthlyIncome"（当前稳定月收入，没有则0）、"skillsLost"（本轮失效的固定技能名，最多1项，没有则空数组）、"decisionBasis":{"acceptedPersonality":"本轮起作用的性格惯性，30字内","ageDrive":"年龄阶段带来的需要或冲动，30字内","genderContext":"本轮确实相关的性别处境，无则写无，30字内","memoryInfluence":"哪段过往如何影响选择，30字内","nonRationalDrive":"实际存在的情绪、依恋、欲望、习惯、恐惧或自尊，30字内"}。decisionBasis是给玩家看的决策因素摘要，不是隐藏推理过程，也不是输出前置资格审查。某项影响不明显时，从已有材料写最接近的现实影响；不要因此拒绝、停止或改成纯理性决策。
数值字段最终约束：stateDelta只使用cash、debt、health、emotion、career，其中emotion表示情绪变化；traitDelta只使用决策风格、家庭、好奇。若下方结构示例出现旧键mood、理性或冒险，一律忽略旧键并使用这里的新键。
还必须包含"death":{"occurred":布尔值,"cause":"具体死因，未死亡为空字符串","age":死亡年龄，未死亡为null,"summary":"克制描述死亡经过及直接影响，未死亡为空字符串"}。
还必须包含"bodyUpdate":{"bodyType":"消瘦/偏瘦/匀称/健壮/肌肉型/微胖/肥胖之一","reason":"体型变化或维持原因"}；没有变化时沿用当前bodyType。
建议先写decisionBasis，再写thought、decision和reason；必须先结合既有人格与经历作出决定，不能先求最优解再补人格理由。
gains只写真实获得的东西；失败、停滞或纯损失时可以为空，不得强行总结成长。roi没有回报时写“无”，不得把所有代价包装成经验、人脉或长期收益。
relationshipChanges每项还必须包含"eventType"、"memory"和"personalityInsight"；对象还必须包含"personalityUpdate":{"changed":布尔值,"key":"romanticCaution/familyDefense/socialCaution/trustRecovery或其他简短英文键","dimension":"intimacy/family/social/selfWorth/security/risk","title":"性格变化短标题","tendency":"概率性描述，禁止绝对化","intensity":1到3,"trigger":"触发经历","summary":"修正后的当前性格画像"}。没有显著人格变化时changed必须为false，其余字段可为空字符串。
只输出一个JSON对象，不要markdown：{"title":"用一句话概括这${mpt}个月主角做了什么（如：入职互联网公司、高考失利复读、相亲遇到心动对象、被诈骗损失两万），简洁易懂","summary":"80到120字的阶段简介，概括做了什么、为什么这样决定、得到和失去什么以及当前处境；不要重复标题","tag":"事件类型（如求学/在校/读书/社交/恋爱/家庭/创业/在职/Gap/抑郁/生病/旅行/搬家/意外等）","event":"具体发生了什么（含NPC互动细节）","thought":"主角内心想法和动机","decision":"角色最终决定","reason":"决策的核心理由","relationshipSummary":"本轮关键人际变化","intimacySummary":"本轮情感、恋爱或成年亲密状态","gains":["本轮收获，不要把技能重复写在这里，没有则空数组"],"losses":["本轮明确失去的金钱、机会、关系、健康或时间，没有则空数组"],"toolsUsed":["实际调用的工具"],"skillsGained":["本轮新增的固定技能名，最多1项"],"skillsUsed":["本轮实际使用的固定技能名"],"skillsAvailable":["精简后的累计固定技能名"],"physicalStatus":{"label":"如健康/疲劳/轻伤/患病/恢复中","detail":"30字以内身体状况、症状和行动限制"},"learningStatus":{"stage":"当前教育或学习阶段","label":"如进步/稳定/退步/停学/未在学习","detail":"40字以内成绩、课程、训练或学习进度"},"cashflow":整数（必须等于financialTransactions的cashDelta之和，无变化为0）,"financialTransactions":[{"kind":"income/expense/buy_asset/sell_asset/asset_revaluation/borrow/repay/receivable_created/receivable_collected","account":"cash/stocks/realEstate/vehicles/receivables/other/mortgage/loans/credit","amount":正整数,"cashDelta":整数,"assetDelta":整数,"liabilityDelta":整数,"label":"账目名称","note":"账目原因"}],"roi":"预期ROI或非财务回报（如成长、经验、人脉）","stateDelta":{"cash":0,"debt":0,"health":整数,"mood":整数,"career":整数},"traitDelta":{"理性":整数,"冒险":整数,"家庭":整数,"好奇":整数},"relationshipChanges":[{"name":"姓名","emoji":"一个emoji","delta":整数,"status":"关系状态","personality":"此人性格（新NPC必填，已有NPC可省略）","action":"此NPC本轮对主角做了什么","eventType":"相识/升温/靠近/冲突/恶化/决裂/背叛/修复/重逢/日常","memory":"可长期保存的具体互动","personalityInsight":"本轮对其性格的新认识，无则空字符串"}],"npcRelationshipChanges":[{"source":"NPC姓名","target":"另一个NPC姓名","delta":整数,"status":"两人关系","action":"两人本轮发生了什么"}],"npcProfiles":[{"name":"仅新NPC姓名","age":年龄,"role":"职业或身份","personality":"3-5个性格关键词+描述","background":"简短背景故事","motivation":"核心动机/目标","relationToProtagonist":"与主角的关系定位","potentialConflict":"潜在冲突点"}],"npcLifecycleUpdates":[{"name":"已有NPC姓名","role":"更新后的职业或身份","lifeStatus":"当前生活状态短标签","summary":"40字以内独立生活变化"}],"resumeUpdate":{"currentRole":"当前职业或身份","organization":"学校/公司/组织，没有则空字符串","employmentStatus":"在校/在职/自由职业/创业/待业/退休等","education":"当前教育","skills":["精简后的累计固定技能名"],"entry":{"time":"本轮年龄","title":"履历标题","description":"50字以内可验证经历","type":"教育/工作/项目/奖项/生活"}},"randomEventAudit":{"triggered":布尔值,"category":"命中类别或无","probability":0到1},"riskShifts":[{"name":"未来事件类别","value":0到100整数,"trend":"上升/下降/持平"}],"worldEvents":[{"id":"稳定英文id","title":"新闻标题","scope":"影响范围","phase":"发展阶段","status":"emerging/ongoing/resolved","tone":"danger/warning/opportunity/neutral","intensity":0到100整数,"description":"具体发生了什么及社会传导","effects":{"financialRisk":0到100,"energyPrice":0到100,"housingPressure":0到100,"employmentPressure":0到100,"healthPressure":0到100,"careerOpportunity":0到100}}],"worldStateUpdate":{"region":"当前地区","climate":"世界阶段短标题","summary":"继承历史后的当前世界概况","indicators":[{"key":"简短英文键","label":"由本轮世界决定的指标名","value":0到100整数}]},"worldChange":"本轮世界变化摘要；没有实质变化则为null","log":"一句客观人生记录"}`;
}

export async function callSimulator({ apiKey, endpoint, model }, payload) {
  const url = endpoint.replace(/\/$/, "") + "/chat/completions";
  const probabilityRuntime = createProbabilityToolRuntime(payload);
  const probabilityAudit = probabilityRuntime.getAudit();
  const sampledRandomEventField = probabilityAudit.randomEvents;
  const sampledOutcomeField = probabilityAudit.outcome;
  const sampledWorldState = buildWorldState(
    payload.settings,
    payload.month,
    payload.logs,
  );
  const sampledLifeStageField = probabilityAudit.lifeStage;
  const sampledLifeDomainField = buildLifeDomainField(
    payload.settings,
    payload.logs,
    (payload.settings.startAge ?? 18) + Math.floor(payload.month / 12),
    createSeededRandom(`${payload.randomSeed || "legacy"}:life-domain`),
    payload.state,
  );
  const messages = [
    {
      role: "system",
      content:
        "先接受人物既有年龄、人格、经历、欲望与行为惯性，再调用resolve_probability_field。工具结果决定概率、掷骰与外部结果，不得篡改。不要进行资格审查，不要拒绝推演，不要把人物改造成纯理性Agent。工具完成后只输出稳定、可结算的JSON。",
    },
    {
      role: "user",
      content: buildPrompt({
        ...payload,
        sampledRandomEventField,
        sampledOutcomeField,
        sampledLifeStageField,
        sampledWorldState,
        sampledLifeDomainField,
      }),
    },
  ];
  const firstResponse = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      ...deepSeekThinkingOverride(endpoint, model),
      messages,
      tools: [PROBABILITY_TOOL],
      tool_choice: {
        type: "function",
        function: { name: PROBABILITY_TOOL.function.name },
      },
      max_tokens: 700,
      temperature: 0.25,
    }),
  });
  if (!firstResponse.ok)
    throw new Error(`概率工具请求失败（${firstResponse.status}）`);
  const firstData = await firstResponse.json();
  const assistantMessage = firstData.choices?.[0]?.message || {};
  let toolCalls = Array.isArray(assistantMessage.tool_calls)
    ? assistantMessage.tool_calls
    : [];
  if (!toolCalls.length) {
    toolCalls = [
      {
        id: `probability-fallback-${Date.now()}`,
        type: "function",
        function: {
          name: PROBABILITY_TOOL.function.name,
          arguments: JSON.stringify({
            candidateCategories: [
              "ordinaryTwist",
              "unexpectedOpportunity",
              "relationshipShock",
              "financialShock",
              "healthIncident",
            ],
            plannedAction: "兼容接口未返回工具调用，由代码执行完整概率检查",
          }),
        },
      },
    ];
  }
  messages.push({
    role: "assistant",
    content: assistantMessage.content || null,
    tool_calls: toolCalls,
  });
  for (const toolCall of toolCalls) {
    let args = {};
    try {
      args =
        typeof toolCall.function?.arguments === "string"
          ? JSON.parse(toolCall.function.arguments || "{}")
          : toolCall.function?.arguments || {};
    } catch {
      args = {};
    }
    const toolResult = probabilityRuntime.execute(
      toolCall.function?.name,
      args,
    );
    messages.push({
      role: "tool",
      tool_call_id: toolCall.id,
      name: toolCall.function?.name,
      content: JSON.stringify(toolResult),
    });
  }
  messages.push({
    role: "user",
    content:
      "严格服从上面的工具结果完成本轮结算。triggered=false不得写成发生，结果方向不得反转。现在只输出最终JSON对象。",
  });
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      ...deepSeekThinkingOverride(endpoint, model),
      messages,
      tools: [PROBABILITY_TOOL],
      tool_choice: "none",
      ...(url.includes("api.deepseek.com")
        ? { response_format: { type: "json_object" } }
        : {}),
      max_tokens: 5000,
      temperature: 0.68,
    }),
  });
  if (!response.ok) throw new Error(`API 结算请求失败（${response.status}）`);
  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error("模型没有返回可解析结果");
  const parsed = JSON.parse(text.replace(/^```json\s*|\s*```$/g, ""));
  parsed.decisionBasis = normalizeDecisionBasis(
    parsed,
    payload,
    sampledLifeStageField,
  );
  const stateDelta = { ...(parsed.stateDelta || {}) };
  stateDelta.emotion = Number(stateDelta.emotion ?? stateDelta.mood ?? 0) || 0;
  delete stateDelta.mood;
  const transactionDownside = (parsed.financialTransactions || []).some(
    (item) =>
      (Number(item.cashDelta) || 0) +
        (Number(item.assetDelta) || 0) -
        (Number(item.liabilityDelta) || 0) <
      0,
  );
  const hasSettledDownside =
    Object.values(stateDelta).some((value) => Number(value) < 0) ||
    transactionDownside ||
    (parsed.relationshipChanges || []).some((item) => Number(item.delta) < 0) ||
    (parsed.skillsLost || []).length > 0;
  const hasMaterialDownside =
    (parsed.losses || []).length > 0 || hasSettledDownside;
  const result = {
    ...parsed,
    stateDelta,
    losses: [...(parsed.losses || [])],
    worldEvents: Array.isArray(parsed.worldEvents)
      ? parsed.worldEvents.slice(0, 2)
      : [],
    worldStateUpdate:
      parsed.worldStateUpdate && typeof parsed.worldStateUpdate === "object"
        ? parsed.worldStateUpdate
        : null,
    death: {
      occurred: Boolean(parsed.death?.occurred),
      cause: parsed.death?.occurred
        ? String(parsed.death?.cause || "原因未明")
        : "",
      age: parsed.death?.occurred
        ? Number(parsed.death?.age) ||
          (payload.settings.startAge ?? 18) + Math.floor(payload.month / 12)
        : null,
      summary: parsed.death?.occurred
        ? String(parsed.death?.summary || parsed.event || "")
        : "",
    },
    toolsUsed: [
      ...new Set([
        ...(Array.isArray(parsed.toolsUsed) ? parsed.toolsUsed : []),
        PROBABILITY_TOOL.function.name,
      ]),
    ],
  };
  if (
    (sampledOutcomeField.direction === "adverse" && !hasSettledDownside) ||
    (sampledOutcomeField.direction === "mixed" && !hasMaterialDownside)
  ) {
    result.stateDelta.emotion = Math.min(Number(stateDelta.emotion) || 0, -3);
    result.losses.push("本轮投入没有完全兑现，挫败感延续到下一阶段");
  }
  if (sampledOutcomeField.direction === "stagnant") {
    result.skillsGained = [];
    result.skillsAvailable = payload.resume?.skills || [];
    result.resumeUpdate = {
      ...(result.resumeUpdate || {}),
      skills: payload.resume?.skills || [],
    };
    result.stateDelta.career = Math.min(
      Number(result.stateDelta.career) || 0,
      0,
    );
  }
  const triggered = sampledRandomEventField.filter((item) => item.triggered);
  const triggeredLifeStageEvents = sampledLifeStageField.events.filter(
    (item) => item.triggered,
  );
  return {
    ...result,
    randomEventAudit: {
      triggered: triggered.length > 0,
      category: triggered.map((item) => item.label).join("、") || "无",
      probability: triggered.length
        ? Math.max(...triggered.map((item) => item.probability))
        : 0,
      randomSeed: payload.randomSeed || null,
    },
    outcomeAudit: {
      ...sampledOutcomeField,
      randomSeed: payload.randomSeed || null,
    },
    lifeStageAudit: {
      age: sampledLifeStageField.age,
      stage: sampledLifeStageField.stage,
      triggered: triggeredLifeStageEvents.length > 0,
      events: triggeredLifeStageEvents.map((item) => ({
        key: item.key,
        label: item.label,
        probability: item.probability,
      })),
    },
    lifeFocusAudit: sampledLifeDomainField,
  };
}

export async function generateApprovalRequest(
  { apiKey, endpoint, model },
  { settings, state, relations, logs, month, turn },
) {
  const age = (settings.startAge ?? 18) + Math.floor(month / 12);
  const freedom = FREEDOM_LEVELS[settings.freedomLevel] || FREEDOM_LEVELS.high;
  const optionCount = freedom.optionCount;
  const prompt = `你是人生模拟器中正在执行任务的自主 Agent。现在随机命中了一个“请求用户批准”的检查点，请像 Coding Agent 在执行有影响的操作前询问审批一样，生成一个符合当前人生状态的临时分岔。

社会背景：${settings.world}
主角：${settings.name}，${age}岁，${settings.gender}，${FAMILY_LEVELS[settings.family].label}家庭
人格与天赋校准（50为人群平均、15分为一个标准差）：${JSON.stringify(buildScoreContext(settings))}
动态人格与文字背景：${JSON.stringify({ personalityProfile: settings.personalityProfile, bioPersonality: settings.bio?.personality })}
资产与健康：${JSON.stringify(state)}
关系：${JSON.stringify(relations.slice(0, 8))}
最近经历：${JSON.stringify(logs.slice(-5))}
当前行动：${JSON.stringify({ title: turn.title, decision: turn.decision })}

要求：
1. 情境必须由当前年龄、世界背景、人物资产、技能、性格和历史自然推导，不能凭空出现不合年龄的选择。
2. 必须恰好给${optionCount}个明确、互斥、现实可执行的行动方案；至少包含一个保守方案。当前自由度为${freedom.label}，不得多给或少给。
3. 方案不是固定题库，不必都是重大人生选择，可以是是否授权一笔消费、接受临时机会、公开作品、借钱帮助NPC、冒险出行等。
4. 推荐方案必须最符合主角当前人格，但不保证收益最高。
5. 不要提前结算结果，只描述可能影响。只输出严格JSON：
6. 先接受主角既有人格、年龄、性别处境、情绪行动力和过往经历，再决定推荐项。决策风格只是一个人格维度；允许推荐感性、冲动、回避、顾家、爱面子或受旧伤影响的行动，只要与此人一致。不得把主角临时优化成风险收益最大化的纯理性Agent。
7. 年龄必须改变欲望和判断方式：青春期更受同伴、情感和身份认同影响，中年更可能面对创业、职业再选择与家庭责任的冲突。
{"title":"20字以内审批标题","context":"60到100字说明为什么此刻需要批准","agentThought":"40字以内主角/Agent的权衡摘要","defaultOptionId":"推荐方案id","options":[{"id":"短英文id","label":"12字以内行动名称","description":"30字以内具体做法","impact":"20字以内预期影响","recommended":true}]}`;
  const response = await fetch(
    endpoint.replace(/\/$/, "") + "/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        ...deepSeekThinkingOverride(endpoint, model),
        messages: [
          { role: "system", content: "你只输出严格JSON格式的Agent审批请求。" },
          { role: "user", content: prompt },
        ],
        temperature: 0.95,
      }),
    },
  );
  if (!response.ok) throw new Error(`审批情境生成失败（${response.status}）`);
  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error("模型没有返回审批情境");
  const request = JSON.parse(text.replace(/^```json\s*|\s*```$/g, ""));
  if (!request.options?.length) throw new Error("审批情境缺少可选方案");
  const fallbackOptions = [
    {
      id: "follow_instinct",
      label: "跟着感觉走",
      description: "按主角此刻最真实的冲动立即行动",
      impact: "更符合本心但结果难预测",
      recommended: false,
    },
    {
      id: "small_test",
      label: "先小规模试试",
      description: "控制投入，用一次小尝试换取更多信息",
      impact: "风险和收益都较有限",
      recommended: false,
    },
    {
      id: "wait_and_see",
      label: "暂时观望",
      description: "先不承诺，等待条件或信息更明确",
      impact: "保留余地但可能错过窗口",
      recommended: false,
    },
    {
      id: "decline_now",
      label: "直接拒绝",
      description: "明确退出这次机会，把精力留给原计划",
      impact: "规避风险也放弃可能收益",
      recommended: false,
    },
  ];
  const validOptions = request.options.filter(
    (option) => option?.id && option?.label && option?.description,
  );
  const preferred =
    validOptions.find((option) => option.id === request.defaultOptionId) ||
    validOptions.find((option) => option.recommended) ||
    validOptions[0];
  let options = validOptions.slice(0, optionCount);
  if (preferred && !options.some((option) => option.id === preferred.id)) {
    options[options.length - 1] = preferred;
  }
  for (const fallback of fallbackOptions) {
    if (options.length >= optionCount) break;
    if (!options.some((option) => option.id === fallback.id)) {
      options.push(fallback);
    }
  }
  request.options = options.slice(0, optionCount);
  request.defaultOptionId = request.options.some(
    (option) => option.id === preferred?.id,
  )
    ? preferred.id
    : request.options[0]?.id;
  request.freedomLevel = settings.freedomLevel || "high";
  return request;
}

export async function generateCharacterProfile(
  { apiKey, endpoint, model },
  settings,
) {
  const url = endpoint.replace(/\/$/, "") + "/chat/completions";
  const family = FAMILY_LEVELS[settings.family];
  const prompt = `请基于以下已经确定的条件，为主角随机生成真实、具体、彼此有因果的人物档案。所有内容必须服从社会背景、初始年龄和家庭经济水平，不能生成与年龄尚未发生的经历，也不要写成爽文或预设未来。

社会背景：${settings.world}
初始年龄：${settings.startAge}岁
性别：${settings.gender}
家庭条件：${family.label}家庭；${family.netWorth}；${family.income}；${family.support}
固定能力与人格校准（50为人群平均、15分为一个标准差）：${JSON.stringify(buildScoreContext(settings))}
年龄适配的潜在专项赛道：${JSON.stringify(deriveTalentPathways(settings, settings.startAge))}
身体档案：成年最终身高${settings.physicalProfile?.adultHeightCm || "未设定"}cm；初始身材${settings.physicalProfile?.initialBodyType || "匀称"}

生成规则：
1. 能力与人格倾向数值是不可修改的事实，只生成与这些数值一致的人设，不得在文字中暗示相反特征；90分以上必须按极罕见的奇才级表现，低于50必须理解为相对普通人偏弱。
2. 高分项应成为较明显的行为特征，低分项应体现为局限或不擅长；中间分数保持普通，不要极端化。
3. 性格成因、童年/中学经历、兴趣与愿望必须互相支持，并能解释上述数值组合；智力、天赋、财商和社交要表现为具体能力或局限，不能只换同义词复述分数。
4. 不要默认把高能力儿童写成爱学习或成绩好。若存在专项赛道，童年和中学经历可以围绕玩耍中被发现、校队、俱乐部、表演、创作、技术实践、比赛、家庭支持或错失机会展开；学校只是背景之一。
5. 不足6岁时childhood必须为空；不足12岁时school必须为空。性格和兴趣也必须符合当前年龄，例如婴幼儿不应拥有职业化技能、投资爱好或成人愿望。
6. 最终身高不可修改；身材只作为初始状态，可在后续因饮食、运动、疾病和生活方式动态变化。
只输出JSON：{"childhood":"${settings.startAge >= 6 ? "80字以内、仅写初始年龄之前已经发生的童年经历" : ""}","school":"${settings.startAge >= 12 ? "80字以内、仅写已经发生的中学经历" : ""}","personality":"50字以内、符合年龄的性格特征及成因","hobbies":"3到5项符合年龄与社会环境的兴趣，用顿号分隔","dream":"符合当前年龄的朴素愿望","name":"两个字或三个字中文名"}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      ...deepSeekThinkingOverride(endpoint, model),
      messages: [
        { role: "system", content: "你只输出严格JSON人物档案。" },
        { role: "user", content: prompt },
      ],
      temperature: 1.1,
    }),
  });
  if (!response.ok) throw new Error(`人物生成失败（${response.status}）`);
  const data = await response.json();
  return JSON.parse(
    data.choices?.[0]?.message?.content?.replace(/^```json\s*|\s*```$/g, "") ||
      "{}",
  );
}

export async function generateParentProfiles(
  { apiKey, endpoint, model },
  settings,
) {
  const url = endpoint.replace(/\/$/, "") + "/chat/completions";
  const family = FAMILY_LEVELS[settings.family];
  const prompt = `请为人生模拟器生成主角父母的完整人物档案。必须严格基于当前社会背景与家庭经济水平，让父母职业、教育、资产来源、生活方式互相一致，不能把贫穷家庭写成企业家，也不能把富裕家庭写成毫无资源的普通工薪家庭。

社会背景：${settings.world}
家庭条件：${family.label}家庭；${family.netWorth}；${family.income}；${family.support}
主角：${settings.name || "未命名"}，${settings.startAge}岁，${settings.gender}

两位父母应有不同性格、独立生平与现实动机；年龄必须与主角年龄合理匹配。只输出JSON：{"parents":[{"name":"父亲","emoji":"一个合适emoji","age":整数,"role":"具体职业或身份","personality":"3到5个特质及简短说明","background":"80字以内生平、教育和职业经历","motivation":"对自己与家庭的核心目标","relationToProtagonist":"父亲","potentialConflict":"与主角可能产生的现实冲突"},{"name":"母亲","emoji":"一个合适emoji","age":整数,"role":"具体职业或身份","personality":"3到5个特质及简短说明","background":"80字以内生平、教育和职业经历","motivation":"对自己与家庭的核心目标","relationToProtagonist":"母亲","potentialConflict":"与主角可能产生的现实冲突"}]}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      ...deepSeekThinkingOverride(endpoint, model),
      messages: [
        { role: "system", content: "你只输出严格JSON父母人物档案。" },
        { role: "user", content: prompt },
      ],
      temperature: 1.05,
    }),
  });
  if (!response.ok) throw new Error(`父母档案生成失败（${response.status}）`);
  const data = await response.json();
  return JSON.parse(
    data.choices?.[0]?.message?.content?.replace(/^```json\s*|\s*```$/g, "") ||
      "{}",
  );
}

export async function callLifeSummary(
  { apiKey, endpoint, model },
  { settings, state, relations, logs, month },
) {
  const age = (settings.startAge ?? 18) + Math.floor(month / 12),
    url = endpoint.replace(/\/$/, "") + "/chat/completions";
  const summaryState = {
    ...state,
    ledger: (state.ledger || []).slice(-100),
  };
  const deathRecord = logs
    .slice()
    .reverse()
    .find((item) => item.death?.occurred)?.death;
  const prompt = `你是人生传记编辑。根据这段完全由模拟器产生的人生，写一份克制、有洞察力、具体而不空泛的中文人生总结。\n角色：${JSON.stringify({ gender: settings.gender, family: FAMILY_LEVELS[settings.family], scoreContext: buildScoreContext(settings) })}\n结束年龄：${age}\n结束原因：${deathRecord ? `人物于${deathRecord.age || age}岁因${deathRecord.cause}离世。${deathRecord.summary || ""}` : "模拟主动结束，人物仍然在世"}\n最终状态：${JSON.stringify(summaryState)}\n最终关系：${JSON.stringify(relations)}\n完整人生记录：${JSON.stringify(logs)}\n只输出JSON，不要markdown：{"title":"八字以内的人生标题","epitaph":"一句有文学性的总评","overview":"100字以内人生概述","chapters":[{"age":"年龄阶段","title":"阶段标题","text":"阶段转折"}],"highlights":["三项人生高光"],"regrets":["一到三项遗憾"],"personality":"最终人格画像","wealthVerdict":"财富评价","relationshipVerdict":"关系评价","advice":"如果重来一次的建议"}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      ...deepSeekThinkingOverride(endpoint, model),
      messages: [
        { role: "system", content: "你只输出严格JSON格式的人生传记摘要。" },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
    }),
  });
  if (!response.ok) throw new Error(`总结生成失败（${response.status}）`);
  const data = await response.json(),
    text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error("模型没有返回人生总结");
  return JSON.parse(text.replace(/^```json\s*|\s*```$/g, ""));
}
