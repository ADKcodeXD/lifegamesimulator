import { FAMILY_LEVELS } from "../data/family";
import {
  buildAbilityModel,
  buildLifeStageField,
  buildRandomEventField,
  buildTurnOutcomeField,
  currencyForWorld,
} from "../simulation/probabilityModel";
import { CANONICAL_SKILLS, SKILL_TIERS } from "../data/skillConfig.ts";
import { normalizeSkills } from "../simulation/skillModel";

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
}) {
  const mpt = settings.monthsPerTurn || 6;
  const age = (settings.startAge ?? 18) + Math.floor(month / 12);
  const monthOfYear = (month % 12) + 1;
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
  const abilityModel = buildAbilityModel(settings, state);
  const randomEventField =
    sampledRandomEventField || buildRandomEventField(settings, state, turn);
  const outcomeField =
    sampledOutcomeField || buildTurnOutcomeField(settings, state, turn);
  const lifeStageField =
    sampledLifeStageField ||
    buildLifeStageField(settings, state, age, mpt, logs);
  const triggeredLifeStageEvents = lifeStageField.events.filter(
    (item) => item.triggered,
  );
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
  const triggeredRandomEvents = randomEventField.filter(
    (item) => item.triggered,
  );
  const currency = currencyForWorld(settings.world);
  const { ledger = [], ...stateWithoutLedger } = state;
  const financialContext = {
    ...stateWithoutLedger,
    recentLedger: ledger.slice(-12),
  };
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
当前时间：${age}岁，累计第${month + 1}个月，当年${monthOfYear}月。本轮推演跨度${mpt}个月。${annual ? "这是新一年的开始，必须生成年度社会变化。" : "本轮不需要年度报告。"}
角色初始条件：性别${settings.gender}；家庭${JSON.stringify(FAMILY_LEVELS[settings.family])}；独立初始资金${settings.initialCash}元；天赋${JSON.stringify(settings.talents)}
${bioContext}
人格：${JSON.stringify(settings.traits)}
初始MBTI与动态性格画像：${JSON.stringify(settings.personalityProfile || {})}
资产与状态：${JSON.stringify(financialContext)}
当前技能库存（必须继承，除非因伤病或长期不用而明确失效）：${JSON.stringify(learnedSkills)}
当前动态履历（必须继承并在本轮结束后更新）：${JSON.stringify(resume || {})}

【人物接受协议——必须先接受这个人，再替其决定】
${JSON.stringify(decisionIdentity)}
1. 在选择行动前，先把上述年龄、性别处境、原始性格、动态人格和关键经历视为不可擅自改写的事实。不得为了得到更优结果，把角色临时改造成冷静、勤奋、勇敢、自律或善于规划的人。
2. 理性只是人格维度之一，不是默认决策器。理性低的人不能突然做完美成本收益分析；理性高的人也会受依恋、欲望、羞耻、自尊、冲动、疲惫、习惯和关系压力影响。
3. 决定必须表现人格冲突：例如冒险高但家庭也高时，可能一边想冲一边担忧责任；内向、戒备或受过伤的人面对感情机会，可能暗恋、试探、回避或错失。
4. 性别只在真实相关的身体经验、安全风险、社会期待、亲密关系和家庭角色压力中发挥作用，禁止用“男性必然怎样、女性必然怎样”的刻板印象替代具体人格。
5. 年龄决定认知能力、发展任务、冲动来源和生活圈。青少年不应像中年管理者一样精算；中年人的创业冲动也必须同时承受家庭、资产、过往失败与时间压力。
6. 过往经历必须留下行为惯性。被背叛、长期失败、曾获支持、已有债务或成功经验都应改变角色看待新机会的方式，不能每轮人格重置。
7. 决策与结果分离：人物只负责做符合自己的选择，本轮外部结果抽样负责决定世界如何回应；聪明决定可以失败，冲动决定也可能侥幸成功。

【年龄阶段概率场——触发的是处境，不是强制选择或成功】
${JSON.stringify(lifeStageField)}
本轮命中的年龄处境：${JSON.stringify(triggeredLifeStageEvents)}
1. 命中的处境必须自然进入本轮生活，但角色可以接受、拒绝、拖延、逃避、误判或错失。
2. 青春期的情感萌动概率较高，既可以表现为恋爱，也可以是暗恋、暧昧、表白失败、嫉妒、回避或失恋；不能因角色内向就让情感需求消失。
3. 中年遇到创业、副业扩张和职业再选择的概率较高，但是否行动及行动方式必须服从冒险、家庭、理性、好奇、资产和既往成败。
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
${JSON.stringify(abilityModel)}
1. 50分以下通常只是普通差异，不能频繁改变命运；跨过60、70、80等阈值后才逐级解锁明显机会。
2. 颜值低于50基本不形成优势；50以上略增桃花；60以上明显改善社交；70以上才允许依靠形象变现；80以上才属于稀缺优势。
3. 技能、运动、人格同样按模型区间和乘数生效；极高或极低值才产生强烈路径依赖。
4. 多项能力应交互而非相加，例如高颜值但低技能不应自动成为成功网红，高技能但健康很差会限制产出。

【核心原则——人生重心随阶段变化，不是所有事都关于钱】
1. 不同人生阶段有完全不同的重心：幼儿期围绕家庭、健康、成长；儿童期围绕校园、友谊、好奇心；青少年期围绕学业、青春期、家庭冲突、自我认同；成年后才逐渐涉及职业、财务、独立生活
2. 很多重要的人生事件与金钱无关：第一次交朋友、被老师表扬、和同学吵架、暗恋、考试失利、父母吵架、离家出走念头、读一本震撼的书——这些才是真实人生的主旋律
3. cashflow和stateDelta在不需要时填0。幼儿和学生阶段大多数事件不应该有显著金钱变化。只有在角色确实在工作、投资、借贷、大额消费时才产生现金流
4. 判断"是否涉及钱"的标准：这个年龄、这个处境的人，现实中会关心这个吗？6岁的小孩不会关心房贷，16岁的学生不会关心股票

【独立随机事件——由代码抽样】
1. 真实人生中存在不可预测的荒谬事件：中彩票、突然走红成为网红、路上被车撞、被雷劈、偶遇贵人、突然继承远亲遗产、误入传销、被诈骗、天降offer、突发重病等
2. 严重事故、横财和突然走红等极端事件概率通常仅0.01%到0.1%；普通机会、骗局、健康或财务冲击可达到百分比级。具体概率已由代码根据角色状态和上轮风险算好，不得自行改写
3. 随机事件不一定是好事也不一定是坏事，但它们会显著改变人生轨迹
4. 概率必须通过riskShifts反映，且不能每轮都发生荒谬事件——大多数时候人生是平凡的
5. 本轮已完成独立随机抽样：${JSON.stringify(randomEventField)}。
6. 命中的随机类别：${JSON.stringify(triggeredRandomEvents)}。若列表非空，必须自然地让至少一个命中类别进入本轮；若为空，不得凭空加入彩票、爆火、严重事故等极低概率事件。
7. 普通转折、机会、关系冲击、财务冲击、健康事件、走红、横财和严重事故拥有不同基础率，并已受非线性能力模型与暴露场景修正。不要为了戏剧性篡改抽样结果。
8. 若触发类别的表面方向与本轮外部结果倾向不同，两者都要保留：例如不利轮遇到贵人，机会可以出现但最终错失、代价过高或只减轻损失；有利轮遭遇冲击，可以成功止损但仍要记录冲击本身。

【本轮外部结果抽样——由代码独立完成，优先级最高】
${JSON.stringify(outcomeField)}
1. 主角可以自主决定行动，但不能决定世界是否奖励该行动。你负责把已抽取的结果倾向写成符合人物与世界条件的具体事件，不得把不利结果靠“努力、顿悟、贵人”反转为成功。
2. adverse时，losses不得为空，且财务、健康、心情、事业、关系或技能中至少一项必须出现可结算的负面变化；允许减损，不允许净结果全为正。
3. mixed时，gains与losses都不得为空，正负后果都必须进入状态或长期记录，禁止把代价写成一句无影响的背景话。
4. stagnant时，不要强行制造升职、技能、贵人或人生突破；允许半年没有成果，skillsGained通常为空，career通常不增加。
5. favorable也不等于必然逆袭，只表示本轮外部条件相对有利；成功幅度仍受能力、资产和历史限制，并应保留现实成本。
6. 连续低谷、努力无果、错误决定、无意义损失和无法立即修复的后果都是真实人生的一部分。不要自动安排下一轮补偿。

【结束年龄不等于死亡】
1. endAge只是模拟结束的年龄，不是角色的死亡年龄。角色到达endAge后仍在继续生活，只是不再推演
2. 不要因为接近endAge就开始安排死亡、重病等收尾事件，除非这是自然发展的结果

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
3. 涉及未成年人的性骚扰、诱骗或性侵害时，只能用“遭到性骚扰/诱骗/性侵害”等非露骨事实表述，绝不描写行为过程、身体细节或情色感受。叙事重点放在安全、求助、信任破坏、羞耻或恐惧、支持系统和长期心理影响。
4. 创伤可以改变安全感、依恋、自尊、边界、风险判断与亲密关系，但不得把一次经历写成不可逆宿命。使用“更容易、更困难、需要更久”等概率表达，并允许后续支持、治疗与稳定关系带来修复。
5. 若本轮发生重大创伤，必须在personalityUpdate、stateDelta、relationshipChanges及记忆中真实结算；不能把伤害包装成“获得成长”，也不能在下一轮自动恢复。

【情感、恋爱、性与关键关系——必须和事业财务一样正常评估】
1. 每轮都要检查友情、家庭、恋爱、身体吸引、亲密需求和孤独感是否会自然影响生活。不能因为主事件是工作或学习，就默认所有关系完全静止。
2. 角色未满18岁时，可以有符合年龄的好感、暗恋、约会萌芽、嫉妒、表白、拒绝或失恋。不要把未成年人写进自愿的成人性场景；但这不限制按上一节规则非露骨地记录真实的侵害型创伤。
3. 角色已满18岁时，约会、恋爱、同居、自愿性行为、避孕、意外怀孕、忠诚冲突、分手与婚姻都是普通人生变量，不得系统性回避。只有符合人物、关系铺垫与现实机会时才发生，不为猎奇强塞。
4. 成年亲密事件只需明确写出“发生了什么”及其情感、关系、健康或现实后果；不描写露骨身体细节。必须尊重同意，并现实考虑避孕、性健康、安全感、依恋与边界。
5. 内向、保守、受过伤或理性高不等于没有欲望；这些特征应改变靠近方式、节奏、表达与后果，而不是让恋爱和性从模拟中消失。
6. 关键NPC必须有独立欲望与选择。关系可以升温、暧昧、靠近、冲突、背叛、修复、淡出或重逢；任何跳变都要有铺垫，并写入长期互动记忆。
7. 若公开人生轨迹中已经出现具体相遇、关系或亲密变化，最终事件必须与其一致；新出现的姓名必须进入relationshipChanges和npcProfiles，不能在最终结果中凭空消失。

人生情境提示：${JSON.stringify(settings.constraints)}
这些内容只是用户希望模型留意的潜在社会处境，不是任务、目标或必经剧本：不要求按年龄发生，不要求主角选择，更不保证成功；如果现实条件不支持，可以延后、错过、拒绝或完全不发生。
最近记忆：${JSON.stringify(logs.slice(-8))}
上轮概率：${JSON.stringify(turn.riskShifts)}
${approvalDecision ? `\n【用户审批结果——必须真实影响本轮推演】\n审批情境：${approvalDecision.requestTitle}\n用户授权行动：${approvalDecision.option.label}\n具体做法：${approvalDecision.option.description}\n预期影响：${approvalDecision.option.impact}\n选择方式：${approvalDecision.autoSelected ? "50秒超时后由Agent自动采用推荐方案" : "用户主动批准"}\n你必须让角色执行此授权并自然结算后果，但结果仍可受世界条件与概率影响。` : ""}

你可以按需调用这些状态工具来规划：balance_sheet、relationship_graph、skill_inventory、credit_options、market_scenarios、probability_field。请在toolsUsed中记录使用的工具名。

${age < 6 ? "注意：角色当前是幼儿（" + age + "岁），事件应围绕家庭环境、父母互动、幼儿园、健康、认知发展等。这个阶段几乎不涉及金钱，重心是成长和家庭关系。" : age < 12 ? "注意：角色当前是儿童（" + age + "岁），事件围绕小学、友谊、兴趣培养、家庭生活、小冒险。学业和社交是重心，金钱事件极少且金额小（零花钱级别）。" : age < 18 ? "注意：角色当前是青少年（" + age + "岁），事件围绕中学、青春期、考试、友情、暗恋、家庭冲突、自我探索。可以有少量兼职收入但不作为重心。" : "角色已成年，拥有完整行动自由。可以学习、工作、创业、恋爱、买房、投资等，但事件仍需符合人格和处境，不是所有事都围绕钱。"}
请生成${timeSpanLabel}（${mpt}个月）内最重要的事件。角色拥有开放行动空间：可以学习、工作、打工、副业、社交、恋爱、阅读、旅行、休息、思考人生或做任何现实可行的事。现金不足时必须现实地考虑打工、降低消费、求助或借贷；家庭援助概率与家庭层级一致。高风险行为必须符合人格与处境。角色依据人格、天赋、关系和当前处境自主做唯一决定。人格每项只允许微调-3到+3；概率必须继承并因决定变化。低概率事件只能遵守上面的程序随机门。
【轨迹纪律】不要默认努力会成功，不要把每次失败都转化成技能、经验或人脉。允许状态长期停滞或下降。riskShifts的value是下一轮会被代码实际读取的风险强度（0到100），必须根据本轮后果延续和调整，不能在问题尚未解决时自动归零。
riskShifts必须至少持续返回“职业跃迁”“财务危机”“健康事件”“关系冲击”四项；可额外增加其他风险。名称保持稳定，value按当前未解决因素调整。
【财务结算——逐笔记账，不得重复入账】
1. 财务内部统一使用人民币作为基准单位；界面会按固定模拟汇率换算为${currency.unit}（${currency.code}），不要把外币金额写入数值字段。
2. financialTransactions是唯一结算明细；cashflow必须严格等于其中cashDelta之和。stateDelta.cash和stateDelta.debt仅为兼容字段，固定返回0，禁止与明细重复累计。
3. monthlyIncome只表示本轮结束后的稳定月收入水平，不会自动发放；工资到账、生活费、税费等若确实在本轮发生，必须逐笔写进financialTransactions。
4. 购买股票、房产、车辆等：现金减少且对应资产增加；出售时相反。资产涨跌只改assetDelta，不产生现金。借款同时增加现金和负债；还款同时减少现金和负债。
5. account只能是cash、stocks、realEstate、vehicles、receivables、other、mortgage、loans或credit。资产和负债必须继承当前余额，不能凭空消失或重复购入。
6. 没有财务变化时cashflow为0、financialTransactions为空数组。
输出JSON还必须包含："eventProbability"（0到1的小数，表示该事件在此人物当前条件下的估计概率）、"rarity"（日常/少见/罕见/极罕见）、"relationshipSummary"（一句话概括本轮关键人际变化，没有也要说明原因）、"intimacySummary"（一句话概括本轮好感、恋爱或成年亲密关系变化；没有变化时写明当前情感处境，不得省略）、"statusLabel"（当前身份，如在校生/程序员/待业）、"monthlyIncome"（当前稳定月收入，没有则0）、"skillsLost"（本轮失效的固定技能名，最多1项，没有则空数组）、"decisionBasis":{"acceptedPersonality":"已接受的性格事实，30字内","ageDrive":"年龄阶段带来的需要或冲动，30字内","genderContext":"本轮确实相关的性别处境，无则写无，30字内","memoryInfluence":"哪段过往如何影响选择，30字内","nonRationalDrive":"本轮实际存在的情绪、依恋、欲望、习惯、恐惧或自尊影响，30字内"}。decisionBasis只总结可展示的决策因素，不输出隐藏推理过程。
JSON键生成顺序必须先写decisionBasis，确认接受人物后，才写thought、decision和reason；不得先想出“最优决定”再倒推人格理由。
gains只写真实获得的东西；失败、停滞或纯损失时可以为空，不得强行总结成长。roi没有回报时写“无”，不得把所有代价包装成经验、人脉或长期收益。
relationshipChanges每项还必须包含"eventType"、"memory"和"personalityInsight"；对象还必须包含"personalityUpdate":{"changed":布尔值,"key":"romanticCaution/familyDefense/socialCaution/trustRecovery或其他简短英文键","dimension":"intimacy/family/social/selfWorth/security/risk","title":"性格变化短标题","tendency":"概率性描述，禁止绝对化","intensity":1到3,"trigger":"触发经历","summary":"修正后的当前性格画像"}。没有显著人格变化时changed必须为false，其余字段可为空字符串。
只输出一个JSON对象，不要markdown：{"title":"用一句话概括这${mpt}个月主角做了什么（如：入职互联网公司、高考失利复读、相亲遇到心动对象、被诈骗损失两万），简洁易懂","summary":"80到120字的阶段简介，概括做了什么、为什么这样决定、得到和失去什么以及当前处境；不要重复标题","tag":"事件类型（如求学/在校/读书/社交/恋爱/家庭/创业/在职/Gap/抑郁/生病/旅行/搬家/意外等）","event":"具体发生了什么（含NPC互动细节）","thought":"主角内心想法和动机","decision":"角色最终决定","reason":"决策的核心理由","relationshipSummary":"本轮关键人际变化","intimacySummary":"本轮情感、恋爱或成年亲密状态","gains":["本轮收获，不要把技能重复写在这里，没有则空数组"],"losses":["本轮明确失去的金钱、机会、关系、健康或时间，没有则空数组"],"toolsUsed":["实际调用的工具"],"skillsGained":["本轮新增的固定技能名，最多1项"],"skillsUsed":["本轮实际使用的固定技能名"],"skillsAvailable":["精简后的累计固定技能名"],"physicalStatus":{"label":"如健康/疲劳/轻伤/患病/恢复中","detail":"30字以内身体状况、症状和行动限制"},"learningStatus":{"stage":"当前教育或学习阶段","label":"如进步/稳定/退步/停学/未在学习","detail":"40字以内成绩、课程、训练或学习进度"},"cashflow":整数（必须等于financialTransactions的cashDelta之和，无变化为0）,"financialTransactions":[{"kind":"income/expense/buy_asset/sell_asset/asset_revaluation/borrow/repay/receivable_created/receivable_collected","account":"cash/stocks/realEstate/vehicles/receivables/other/mortgage/loans/credit","amount":正整数,"cashDelta":整数,"assetDelta":整数,"liabilityDelta":整数,"label":"账目名称","note":"账目原因"}],"roi":"预期ROI或非财务回报（如成长、经验、人脉）","stateDelta":{"cash":0,"debt":0,"health":整数,"mood":整数,"career":整数},"traitDelta":{"理性":整数,"冒险":整数,"家庭":整数,"好奇":整数},"relationshipChanges":[{"name":"姓名","emoji":"一个emoji","delta":整数,"status":"关系状态","personality":"此人性格（新NPC必填，已有NPC可省略）","action":"此NPC本轮对主角做了什么","eventType":"相识/升温/靠近/冲突/恶化/决裂/背叛/修复/重逢/日常","memory":"可长期保存的具体互动","personalityInsight":"本轮对其性格的新认识，无则空字符串"}],"npcRelationshipChanges":[{"source":"NPC姓名","target":"另一个NPC姓名","delta":整数,"status":"两人关系","action":"两人本轮发生了什么"}],"npcProfiles":[{"name":"仅新NPC姓名","age":年龄,"role":"职业或身份","personality":"3-5个性格关键词+描述","background":"简短背景故事","motivation":"核心动机/目标","relationToProtagonist":"与主角的关系定位","potentialConflict":"潜在冲突点"}],"npcLifecycleUpdates":[{"name":"已有NPC姓名","role":"更新后的职业或身份","lifeStatus":"当前生活状态短标签","summary":"40字以内独立生活变化"}],"resumeUpdate":{"currentRole":"当前职业或身份","organization":"学校/公司/组织，没有则空字符串","employmentStatus":"在校/在职/自由职业/创业/待业/退休等","education":"当前教育","skills":["精简后的累计固定技能名"],"entry":{"time":"本轮年龄","title":"履历标题","description":"50字以内可验证经历","type":"教育/工作/项目/奖项/生活"}},"randomEventAudit":{"triggered":布尔值,"category":"命中类别或无","probability":0到1},"riskShifts":[{"name":"未来事件类别","value":0到100整数,"trend":"上升/下降/持平"}],"worldChange":${annual ? '"一段年度社会变化摘要"' : "null"},"log":"一句客观人生记录"}`;
}

export async function generateSimulationTrace(
  { apiKey, endpoint, model },
  { settings, state, relations, logs, month, turn, resume, approvalDecision },
) {
  const age = (settings.startAge ?? 18) + Math.floor(month / 12);
  const months = settings.monthsPerTurn || 6;
  const prompt = `你正在为一款面向普通人的人生模拟器写“这一段人生正在如何展开”。这不是隐藏思维链，也不是技术日志，而是稍后会展示给用户的、具体可读的叙事轨迹。最终模拟会沿着这条轨迹结算，所以不要写空泛步骤。

主角：${settings.name}，${age}岁，${settings.gender}
本轮跨度：${months}个月
世界：${settings.world}
人格与经历：${JSON.stringify({ bio: settings.bio, traits: settings.traits, personalityProfile: settings.personalityProfile })}
当前生活：${JSON.stringify({ state, resume, turn: { title: turn.title, decision: turn.decision } })}
现有人际关系：${JSON.stringify((relations || []).slice(0, 10))}
最近人生记录：${JSON.stringify((logs || []).slice(-6))}
用户刚批准的行动：${JSON.stringify(approvalDecision || null)}

要求：
1. 写3到5条按时间推进的具体人生片段。必须有人在做事、有现实变化，不能写“分析数据、评估关系、生成结果”等系统术语。
2. 如果推到主角认识了新人，直接给出真实姓名、身份、如何认识以及第一印象；该人物稍后必须进入最终关系结果。
3. 每轮都认真检查友情、家庭、吸引、恋爱和孤独是否影响生活。不能因为职业或学习事件更显眼，就自动忽略关键关系。
4. 未满18岁可以经历符合年龄的好感、暗恋、表白、拒绝或失恋，也可能遭遇忽视、霸凌、家暴、控制、性骚扰、诱骗或性侵害等创伤。侵害只写非露骨事实及求助、关系和心理后果，不写过程细节；不要把未成年人放入自愿的成人性场景。
5. 已满18岁后，约会、恋爱、同居与自愿性行为可以像工作、消费一样自然发生。若符合人物和关系铺垫，可以明确写“发生了性关系”，但不要描写露骨身体细节；要关注同意、边界、避孕、依恋、怀孕风险或关系后果。
6. 不要保证成功，也允许错过、尴尬、拒绝、冲突、疏远与后悔。每条只写用户能看懂的表层事实、人物感受和选择，不输出隐藏推理。

只输出JSON，不要markdown：{"opening":"一句生活化开场","beats":[{"phase":"如：一次相遇/关系靠近/心里的犹豫/做出选择/事情的余波","text":"45到90字，具体写正在发生什么","people":[{"name":"姓名","relation":"身份或关系","change":"认识/靠近/心动/冲突/疏远/亲密/重逢等"}]}]}`;
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
        messages: [
          {
            role: "system",
            content:
              "你只输出严格JSON。你写的是可公开的人生叙事轨迹，不输出隐藏思维链或技术过程。",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.95,
      }),
    },
  );
  if (!response.ok) throw new Error(`人生轨迹生成失败（${response.status}）`);
  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error("模型没有返回人生轨迹");
  const trace = JSON.parse(text.replace(/^```json\s*|\s*```$/g, ""));
  const beats = Array.isArray(trace.beats)
    ? trace.beats
        .filter((beat) => beat?.text)
        .slice(0, 5)
        .map((beat) => ({
          phase: beat.phase || "人生变化",
          text: String(beat.text),
          people: Array.isArray(beat.people) ? beat.people.slice(0, 4) : [],
        }))
    : [];
  if (!beats.length) throw new Error("模型返回的人生轨迹为空");
  return { opening: trace.opening || "这一段人生正在展开。", beats };
}

export async function callSimulator({ apiKey, endpoint, model }, payload) {
  const url = endpoint.replace(/\/$/, "") + "/chat/completions";
  const sampledRandomEventField = buildRandomEventField(
    payload.settings,
    payload.state,
    payload.turn,
  );
  const sampledOutcomeField = buildTurnOutcomeField(
    payload.settings,
    payload.state,
    payload.turn,
  );
  const sampledLifeStageField = buildLifeStageField(
    payload.settings,
    payload.state,
    (payload.settings.startAge ?? 18) + Math.floor(payload.month / 12),
    payload.settings.monthsPerTurn || 6,
    payload.logs,
  );
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content:
            "你先无条件接受人物既有人格、年龄、性别处境与经历，再替这个具体的人做决定；你不把角色优化成纯理性Agent。你只输出稳定、可结算、严格JSON格式的人生模拟结果。",
        },
        {
          role: "user",
          content: buildPrompt({
            ...payload,
            sampledRandomEventField,
            sampledOutcomeField,
            sampledLifeStageField,
          }),
        },
      ],
      temperature: 0.9,
    }),
  });
  if (!response.ok) throw new Error(`API 请求失败（${response.status}）`);
  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error("模型没有返回可解析结果");
  const parsed = JSON.parse(text.replace(/^```json\s*|\s*```$/g, ""));
  const requiredDecisionBasis = [
    "acceptedPersonality",
    "ageDrive",
    "memoryInfluence",
    "nonRationalDrive",
  ];
  if (
    !parsed.decisionBasis ||
    requiredDecisionBasis.some(
      (key) =>
        !String(parsed.decisionBasis[key] || "").trim() ||
        String(parsed.decisionBasis[key]).trim() === "无",
    )
  ) {
    throw new Error("模型未先接受人物人格与经历，已拒绝本轮纯理性决策");
  }
  const stateDelta = { ...(parsed.stateDelta || {}) };
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
  };
  if (
    (sampledOutcomeField.direction === "adverse" && !hasSettledDownside) ||
    (sampledOutcomeField.direction === "mixed" && !hasMaterialDownside)
  ) {
    result.stateDelta.mood = Math.min(Number(stateDelta.mood) || 0, -3);
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
    },
    outcomeAudit: sampledOutcomeField,
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
  };
}

export async function generateApprovalRequest(
  { apiKey, endpoint, model },
  { settings, state, relations, logs, month, turn },
) {
  const age = (settings.startAge ?? 18) + Math.floor(month / 12);
  const prompt = `你是人生模拟器中正在执行任务的自主 Agent。现在随机命中了一个“请求用户批准”的检查点，请像 Coding Agent 在执行有影响的操作前询问审批一样，生成一个符合当前人生状态的临时分岔。

社会背景：${settings.world}
主角：${settings.name}，${age}岁，${settings.gender}，${FAMILY_LEVELS[settings.family].label}家庭
人格与天赋：${JSON.stringify({ traits: settings.traits, talents: settings.talents, personalityProfile: settings.personalityProfile, bioPersonality: settings.bio?.personality })}
资产与健康：${JSON.stringify(state)}
关系：${JSON.stringify(relations.slice(0, 8))}
最近经历：${JSON.stringify(logs.slice(-5))}
当前行动：${JSON.stringify({ title: turn.title, decision: turn.decision })}

要求：
1. 情境必须由当前年龄、世界背景、人物资产、技能、性格和历史自然推导，不能凭空出现不合年龄的选择。
2. 给2到4个明确、互斥、现实可执行的行动方案；至少包含一个保守方案。
3. 方案不是固定题库，不必都是重大人生选择，可以是是否授权一笔消费、接受临时机会、公开作品、借钱帮助NPC、冒险出行等。
4. 推荐方案必须最符合主角当前人格，但不保证收益最高。
5. 不要提前结算结果，只描述可能影响。只输出严格JSON：
6. 先接受主角既有人格、年龄、性别处境和过往经历，再决定推荐项。理性只是一个人格维度；允许推荐感性、冲动、回避、顾家、爱面子或受旧伤影响的行动，只要与此人一致。不得把主角临时优化成风险收益最大化的纯理性Agent。
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
固定能力数值（0低、100高）：${JSON.stringify(settings.talents)}
固定人格倾向数值（0低、100高）：${JSON.stringify(settings.traits)}

生成规则：
1. 能力与人格倾向数值是不可修改的事实，只生成与这些数值一致的人设，不得在文字中暗示相反特征。
2. 高分项应成为较明显的行为特征，低分项应体现为局限或不擅长；中间分数保持普通，不要极端化。
3. 性格成因、童年/中学经历、兴趣与愿望必须互相支持，并能解释上述数值组合；允许同一组数值生成不同但合理的人设。
4. 不足6岁时childhood必须为空；不足12岁时school必须为空。性格和兴趣也必须符合当前年龄，例如婴幼儿不应拥有职业化技能、投资爱好或成人愿望。
只输出JSON：{"childhood":"${settings.startAge >= 6 ? "80字以内、仅写初始年龄之前已经发生的童年经历" : ""}","school":"${settings.startAge >= 12 ? "80字以内、仅写已经发生的中学经历" : ""}","personality":"50字以内、符合年龄的性格特征及成因","hobbies":"3到5项符合年龄与社会环境的兴趣，用顿号分隔","dream":"符合当前年龄的朴素愿望","name":"两个字或三个字中文名"}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
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
  const prompt = `你是人生传记编辑。根据这段完全由模拟器产生的人生，写一份克制、有洞察力、具体而不空泛的中文人生总结。\n角色：${JSON.stringify({ gender: settings.gender, family: FAMILY_LEVELS[settings.family], talents: settings.talents, traits: settings.traits })}\n结束年龄：${age}\n最终状态：${JSON.stringify(summaryState)}\n最终关系：${JSON.stringify(relations)}\n完整人生记录：${JSON.stringify(logs)}\n只输出JSON，不要markdown：{"title":"八字以内的人生标题","epitaph":"一句有文学性的总评","overview":"100字以内人生概述","chapters":[{"age":"年龄阶段","title":"阶段标题","text":"阶段转折"}],"highlights":["三项人生高光"],"regrets":["一到三项遗憾"],"personality":"最终人格画像","wealthVerdict":"财富评价","relationshipVerdict":"关系评价","advice":"如果重来一次的建议"}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
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
