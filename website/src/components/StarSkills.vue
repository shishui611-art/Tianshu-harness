<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { GitBranch, Network, Sparkles } from 'lucide-vue-next'
import { useI18n } from '@/composables/useI18n'

const { t, locale } = useI18n()

type ModeGroup = '日常开发' | '规划与判断' | '执行与交付' | '验证与收尾' | '长程与精简'

interface TaskMode {
  id: string
  name: string
  label: string
  group: ModeGroup
  scenario: string
  how: string
  scenarioEn: string
  howEn: string
}

const stars: TaskMode[] = [
  {
    id: 'tianshu',
    name: '项目统筹',
    label: 'Project orchestration',
    group: '规划与判断',
    scenario: '跨模块/跨文件的改动、需要权衡架构取舍的规划、多任务并发、需要先判断改动深度的任务。',
    how: '先建全局视图再动手，把复杂任务拆成可独立验证的单元并逐个验证；结构性事实 grep 一层采信，机制解释读到实现再采信；新代码镜像既有模式，改动前看波及半径。',
    scenarioEn: 'Cross-module/cross-file changes, architecture trade-offs, concurrent tasks, work whose depth must be judged first',
    howEn: 'Build the global view before acting; split complex work into independently verifiable units and verify each; trust a one-level grep for structural facts, but read through to the implementation for mechanism claims; mirror existing patterns and check the blast radius before changing',
  },
  {
    id: 'pojun',
    name: '探索新方案',
    label: 'Explore new approaches',
    group: '日常开发',
    scenario: '技术选型与可行性验证、新功能原型、边界未知的探查、需要先试一条再决定的场合。',
    how: '先选一条最短路径验证，失败即边界信息；探明的边界与教训整理成可复用形态；三次撞墙换维度；提交声称"已完成/测过"而方法零调用即 false-green，grep 真消费者再下结论。',
    scenarioEn: 'Technology selection, feasibility checks, new-feature prototypes, unknown boundaries, cases where you must try one route before deciding',
    howEn: 'Validate the shortest path first and treat failure as boundary information; turn what you learn into reusable form; after three walls, change dimension; a claim of "done/tested" with zero tool calls is false-green — grep the real consumers first',
  },
  {
    id: 'tianfu',
    name: '维护结构',
    label: 'Maintain structure',
    group: '执行与交付',
    scenario: '重构、既有模块的结构性改造、稳定性与性能优化、export/接口的兼容性变更。',
    how: '改动前先理解这段代码为什么被写成这样；把承重结构放到改动碰不着的深处；export 是承诺，破坏它需要迁移计划；歧义处大声失败；修复超出当前任务时只记录不顺手大改。',
    scenarioEn: 'Refactoring, structural rework of existing modules, stability and performance optimization, export/interface compatibility changes',
    howEn: 'Understand why the code was written this way before changing it; put load-bearing structure beyond the reach of the change; exports are promises — breaking one needs a migration plan; fail loudly on ambiguity; record out-of-scope fixes instead of fixing them in passing',
  },
  {
    id: 'tianliang',
    name: '执行任务',
    label: 'Execute the task',
    group: '执行与交付',
    scenario: '边界已定的实现类任务、按计划落地、修缺陷、补测试。',
    how: '先核对计划引用的文件与行号是否仍与现实一致，以现实为准执行；改什么验什么，通过了就提交不积累；回归测试走 RED→GREEN；任务 ≥4 先分波，每波闭环再开下一波。',
    scenarioEn: 'Implementation work with settled boundaries, landing a plan, fixing defects, adding tests',
    howEn: 'First check that the files and line numbers the plan cites still match reality, and follow reality; verify what you changed and commit it rather than accumulating; regression tests go RED→GREEN; for ≥4 units, split into waves and close each before starting the next',
  },
  {
    id: 'tianquan',
    name: '评估方案',
    label: 'Evaluate the plan',
    group: '规划与判断',
    scenario: '方案与计划审查、架构取舍评估、外部文档/调研的可信度核实、需要产出可执行计划文档的场合。',
    how: '先验证再称量，禁止跳过核实直接总结；两端都放——收益与代价同报；存在性断言 grep 一层即结论，运行时语义断言沿调用链多查一层并引用文件:行号；拿不到实现证据就把"修订"降级为"疑问"。',
    scenarioEn: 'Reviewing plans and approaches, architecture trade-offs, verifying external docs/research, producing an executable plan document',
    howEn: 'Verify before weighing — never summarize without checking; present both ends: benefits and costs together; a one-level grep settles existence claims, but runtime semantics need a walk down the call chain with file:line citations; without implementation evidence, downgrade "revision" to "question"',
  },
  {
    id: 'tianji',
    name: '检查前提',
    label: 'Check assumptions',
    group: '规划与判断',
    scenario: '方案成形后的前提审计、反事实推演、寻找被遗漏的可能性与隐藏假设。',
    how: '列出隐含前提逐条问"如果不成立呢"；做三步到达测试识别过度工程化；审计方案里的沉默（没提到的子系统、没覆盖的路径）；质疑必须落到"读哪行、跑哪条命令能验证"。',
    scenarioEn: 'Premise audits after a plan takes shape, counterfactual reasoning, finding missed possibilities and hidden assumptions',
    howEn: 'List implicit premises and ask of each "what if it does not hold"; run the three-step reachability test to spot over-engineering; audit the plan\'s silences (subsystems unmentioned, paths uncovered); every challenge must land on "which line to read, which command to run"',
  },
  {
    id: 'tianxuan',
    name: '跨模块分析',
    label: 'Cross-module analysis',
    group: '规划与判断',
    scenario: '跨领域/跨模块的模式迁移、设计问题的换视角求解、症状堆叠时的根因回溯。',
    how: '先到三个无关领域找碎片让模式涌现，每轮灵感立刻派反证（洞察能写成代码/测试才算数）；多个独立领域指向同一模式时验证是否为真同构；连续多轮同一视角循环时换入口；先求证再修补。',
    scenarioEn: 'Cross-domain/cross-module pattern transfer, solving design problems with a changed viewpoint, root-cause backtracking when symptoms pile up',
    howEn: 'Gather fragments from three unrelated fields first so the pattern can emerge, and dispatch a counterproof for each insight; when several independent fields point at one pattern, check whether the isomorphism is real; change entry point when the same viewpoint loops; verify before patching',
  },
  {
    id: 'fu',
    name: '优化提示词',
    label: 'Improve prompts',
    group: '验证与收尾',
    scenario: 'prompt / 系统提示词调校、方法论蒸馏、模型行为诊断、上下文与须知注入的取舍。',
    how: '先诊断再修改，区分问题在认知场还是模型能力；提取方法论时淘汰所有不含"动作+判据+反例"的条目；认知场改动绝不触碰 tool definition 静态文本，动态内容走 volatile/appendix 通道。',
    scenarioEn: 'Prompt/system-prompt tuning, methodology distillation, model behavior diagnosis, trade-offs in context and notice injection',
    howEn: 'Diagnose before editing, separating cognitive-field problems from model-capability ones; when distilling methodology, drop every entry lacking "action + criterion + counterexample"; never touch static tool definition text — dynamic content goes through the volatile/appendix channel',
  },
  {
    id: 'wenqu',
    name: '整理代码',
    label: 'Tidy the code',
    group: '执行与交付',
    scenario: '命名与结构整理、局部重构与去噪、代码可读性提升、界面/样式的实现与调优。',
    how: '先读懂既有腔调再做最克制的改动，让意图不证自明；不做冗余逻辑与过度抽象；界面改动起 dev server 用 browser_debug 截图看渲染，换宽度复查。',
    scenarioEn: 'Naming and structure cleanup, local refactors and de-noising, readability, UI/style implementation and tuning',
    howEn: 'Read the existing idiom first, then make the most restrained change so intent is self-evident; no redundant logic or over-abstraction; for UI changes start a dev server and screenshot with browser_debug, then re-check at another width',
  },
  {
    id: 'kaiyang',
    name: '核对运行结果',
    label: 'Reconcile runtime results',
    group: '验证与收尾',
    scenario: '性能与行为测量、插桩与对账、仿真回放、需要"先量出来再动手"的排查。',
    how: '先推导精确构成再实测对账；期望值走独立通道（规格/手工推导/参考实现/物理约束），绝不取自被测系统；一次只动一个变量，单点不构成证据。',
    scenarioEn: 'Performance and behavior measurement, instrumentation and reconciliation, simulation replay, investigations needing "measure first, then act"',
    howEn: 'Derive the exact composition before measuring against it; expected values come from an independent channel (spec/manual derivation/reference implementation/physical constraint), never from the system under test; change one variable at a time — a single point is not evidence',
  },
  {
    id: 'yaoguang',
    name: '复现并验证',
    label: 'Reproduce and verify',
    group: '验证与收尾',
    scenario: '验证他人或自己的声称、回归排查、缺陷归族、怀疑机制静默失效的核查。',
    how: '先问能否复现原缺陷，RED→GREEN 才算证据；取信 exit code 与实际 diff，不取信提交信息；单个 bug 先归族再修；怀疑静默失效时先装账本再修行为。',
    scenarioEn: 'Verifying claims (yours or others\'), regression hunting, defect family grouping, checks for silently failing mechanisms',
    howEn: 'Ask first whether the original defect can be reproduced — RED→GREEN is the only evidence; trust exit codes and actual diffs, not commit messages; group a single bug into a family before fixing; when suspecting silent failure, install the ledger before changing behavior',
  },
  {
    id: 'huagai',
    name: '跟进长期任务',
    label: 'Follow long-running work',
    group: '长程与精简',
    scenario: '多波次的长程任务、大范围重构、审查 FAIL 后的持续跟修、需要跨会话接续的工作。',
    how: '未过可核验证据前不说"完成"，审查 FAIL 即继续修；第一波先建测量标尺，后续每波用同一标尺验收；计划阶段写清"明确不做"；假绿检测。',
    scenarioEn: 'Multi-wave long tasks, large refactors, continued fixes after a FAIL review, work that must resume across sessions',
    howEn: 'Do not say "done" before verifiable evidence, and keep fixing after a FAIL; build the measuring stick in the first wave and validate every later wave against the same one; state "explicitly not doing" during planning; run false-green detection',
  },
  {
    id: 'qiming',
    name: '日常开发',
    label: 'Daily development',
    group: '日常开发',
    scenario: '日常功能开发与缺陷修复、探索性调查、为他人铺路的调研任务。',
    how: '先于动手一步展开全景推演，提出精准的架构假设并用第一手日志与代码事实落实；缺口用工具补或向建设者索取，绝不用推理链填；关键结论至少两种独立方式交叉验证。',
    scenarioEn: 'Everyday feature work and bug fixing, exploratory investigation, research tasks that pave the way for others',
    howEn: 'Run the full-picture deduction one step before acting, propose a precise architectural hypothesis and ground it in first-hand logs and code facts; fill gaps with tools or by asking their builders, never with a reasoning chain; cross-check key conclusions at least two independent ways',
  },
  {
    id: 'changgeng',
    name: '检查界面与交付',
    label: 'Check UI and delivery',
    group: '验证与收尾',
    scenario: '界面改动的交付验收、多主题/多尺寸的视觉核对、长任务的收尾与交接。',
    how: '交付前用 browser_debug 截图看渲染，必要时换宽度再看；视觉终验收硬通货——多主题矩阵（light/dark 必截）、像素真值、before/after 对照存证；收尾留 handoff、快照与留档。',
    scenarioEn: 'Delivery acceptance for UI changes, visual checks across themes/sizes, wrapping up and handing off long tasks',
    howEn: 'Screenshot the render with browser_debug before delivery, and again at another width when in doubt; visual acceptance is hard currency — multi-theme matrix (light/dark mandatory), pixel ground truth, before/after evidence; leave handoff notes, snapshots and archives',
  },
  {
    id: 'qisha',
    name: '精简冗余',
    label: 'Trim the redundant',
    group: '长程与精简',
    scenario: '死代码与冗余清理、注意力预算核算、防线与配置的退场评估、需要出"带证据名单"的减法任务。',
    how: '举证责任在存在方——只问它能否自证仍在起作用（触发过吗？触发后行为变了吗）；只提名不处决；砍不动的写清它在承重什么；每项提名附判据与回滚方式。',
    scenarioEn: 'Dead-code and redundancy cleanup, attention-budget accounting, retiring defenses and config, subtraction tasks needing an evidence-backed list',
    howEn: 'The burden of proof lies with the existing thing — ask only whether it can show it still works (has it fired? did behavior change when it did?); nominate, never execute; for anything you cannot cut, state what it is bearing; give each nomination a criterion and a rollback path',
  },
  {
    id: 'taiyi',
    name: '使用最小工具集',
    label: 'Use a minimal toolset',
    group: '长程与精简',
    scenario: '边界清楚的小改动、需要克制与专注的收束型任务、工具越少越不容易跑偏的场合。',
    how: '动手前先让问题停一下再出手；一次只推进一件事；每收一段就留下判断依据、否决过的假设与没走完的岔路；归因必须落回一行可复核的观察（相邻行、时间戳、磁盘证据），不靠源码推断填。',
    scenarioEn: 'Small changes with clear boundaries, convergent tasks needing restraint and focus, situations where fewer tools mean less drift',
    howEn: 'Let the question pause before acting; advance one thing at a time; at each stopping point leave the basis for your judgment, the hypotheses you rejected, and the forks you did not take; attribute causes to one reviewable observation (adjacent line, timestamp, on-disk evidence), not to inference from source',
  },
]

const activeIndex = ref(0)
const activeStar = computed(() => stars[activeIndex.value])
const viewportWidth = ref(1440)

const groups: ModeGroup[] = ['日常开发', '规划与判断', '执行与交付', '验证与收尾', '长程与精简']

const activeScenario = computed(() =>
  locale.value === 'zh' ? activeStar.value.scenario : activeStar.value.scenarioEn,
)
const activeHow = computed(() =>
  locale.value === 'zh' ? activeStar.value.how : activeStar.value.howEn,
)

const workflows = [
  {
    title: '日常开发链路',
    path: ['日常开发', '优化提示词', '项目统筹'],
    detail: '先看清全局再动手，偏差点单独调校。',
  },
  {
    title: '方案落地链路',
    path: ['评估方案', '执行任务', '维护结构'],
    detail: '先定稿计划，再分波执行，最后守住既有结构。',
  },
  {
    title: '验证收尾链路',
    path: ['检查前提', '复现并验证', '核对运行结果'],
    detail: '先质疑前提，再独立复现，最后用数据对账。',
  },
  {
    title: '长程与精简',
    path: ['跟进长期任务', '检查界面与交付', '精简冗余'],
    detail: '长路不断线，交付逐项核对，收尾时剪掉冗余。',
  },
]

function starsInGroup(group: ModeGroup) {
  return stars.filter((star) => star.group === group)
}

function updateViewportWidth() {
  viewportWidth.value = window.innerWidth
}

onMounted(() => {
  updateViewportWidth()
  window.addEventListener('resize', updateViewportWidth, { passive: true })
})

onUnmounted(() => {
  window.removeEventListener('resize', updateViewportWidth)
})

function arcStyle(index: number) {
  const totalAngle = 168
  const startAngle = -totalAngle / 2
  const angle = startAngle + (index * totalAngle) / (stars.length - 1)
  const rad = (angle * Math.PI) / 180
  const radiusX = Math.min(680, Math.max(300, viewportWidth.value * 0.36))
  const radiusY = Math.min(390, Math.max(230, viewportWidth.value * 0.2))
  const x = Math.sin(rad) * radiusX
  const y = -Math.cos(rad) * radiusY
  const depth = Math.cos(rad)
  const scale = 0.82 + depth * 0.18

  return {
    transform: `translate(-50%, -50%) translate(${x}px, ${y}px) rotate(${angle / 3.8}deg) scale(${scale})`,
    zIndex: `${Math.round(40 + depth * 20)}`,
  }
}
</script>

<template>
  <section id="stars" class="relative overflow-hidden bg-bg-primary px-6 py-24 lg:py-32">
    <div class="pointer-events-none absolute inset-0">
      <div class="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:72px_72px]" />
      <div class="absolute inset-0 bg-[radial-gradient(ellipse_70%_40%_at_50%_8%,rgba(250,204,21,0.14),transparent_65%),radial-gradient(ellipse_44%_36%_at_84%_42%,rgba(34,211,238,0.14),transparent_70%),radial-gradient(ellipse_42%_36%_at_12%_58%,rgba(16,185,129,0.12),transparent_70%)]" />
      <div class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
    </div>

    <div class="relative mx-auto max-w-[1680px]">
      <div class="relative min-h-[760px] overflow-hidden">
        <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_54%_42%_at_50%_52%,rgba(99,102,241,0.18),transparent_62%),radial-gradient(ellipse_70%_38%_at_50%_0%,rgba(180,151,207,0.18),transparent_56%)]" />
        <div class="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-bg-primary to-transparent" />
        <div class="pointer-events-none absolute left-1/2 top-[500px] h-[780px] w-[1480px] -translate-x-1/2 -translate-y-1/2 rounded-[50%] border border-white/[0.045]" />

        <button
          v-for="(star, index) in stars"
          :key="star.id"
          type="button"
          class="group absolute left-1/2 top-[505px] transition duration-300"
          :class="activeIndex === index ? 'opacity-100' : 'opacity-62 hover:opacity-100'"
          :style="arcStyle(index)"
          @click="activeIndex = index"
          @mouseenter="activeIndex = index"
        >
          <span
            :class="[
              'relative flex h-20 w-20 items-center justify-center rounded-[22px] border bg-[#07101d]/90 p-3 shadow-2xl shadow-black/50 backdrop-blur-md transition duration-300 sm:h-24 sm:w-24',
              activeIndex === index ? 'border-cyan-100/80 shadow-cyan-200/24' : 'border-white/14 group-hover:border-cyan-100/60',
            ]"
          >
            <span class="absolute inset-[3px] rounded-[19px] border border-white/10 bg-gradient-to-br from-white/12 via-transparent to-cyan-200/8" />
            <span class="relative flex flex-col items-center gap-1">
              <span class="font-mono text-lg font-semibold text-cyan-100/90 sm:text-xl">{{ star.id.slice(0, 2).toUpperCase() }}</span>
              <span class="text-[10px] leading-tight text-white/70">{{ star.name }}</span>
            </span>
          </span>
          <span
            class="mt-2 hidden text-center text-xs font-medium text-white/72 opacity-0 transition duration-300 group-hover:opacity-100 sm:block"
            :class="activeIndex === index ? 'opacity-100' : ''"
          >
            {{ star.id }}
          </span>
        </button>

        <div class="absolute left-1/2 top-[330px] z-10 w-[min(92%,680px)] -translate-x-1/2 text-center">
          <div class="mb-5 inline-flex items-center gap-2 rounded-full border border-violet-200/18 bg-violet-300/10 px-3 py-1 text-sm text-violet-100/88 backdrop-blur-xl">
            <Sparkles class="h-4 w-4" />
            {{ t('stars.badge') }}
          </div>
          <h2 class="text-4xl font-bold text-white md:text-5xl">
            {{ activeStar.name }}
            <span class="text-2xl font-medium text-white/45 md:text-3xl">/task-mode {{ activeStar.id }}</span>
          </h2>
          <p class="mt-3 text-sm font-medium text-white/45">
            {{ locale === 'zh' ? activeStar.label : activeStar.name }} · {{ activeStar.group }}
          </p>
          <dl class="mx-auto mt-5 max-w-2xl space-y-3 text-left text-base leading-7">
            <div class="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
              <dt class="text-xs font-semibold uppercase tracking-wider text-cyan-100/70">{{ t('stars.scenario_label') }}</dt>
              <dd class="mt-1 text-white/78">{{ activeScenario }}</dd>
            </div>
            <div class="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
              <dt class="text-xs font-semibold uppercase tracking-wider text-cyan-100/70">{{ t('stars.how_label') }}</dt>
              <dd class="mt-1 text-white/78">{{ activeHow }}</dd>
            </div>
          </dl>
        </div>

        <div class="absolute bottom-10 left-1/2 z-10 flex w-[min(92%,860px)] -translate-x-1/2 flex-wrap items-center justify-center gap-3 rounded-3xl border border-white/10 bg-black/26 px-5 py-4 text-sm text-white/56 backdrop-blur-xl">
          <span v-for="group in groups" :key="group" class="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">
            {{ group }}：{{ starsInGroup(group).length }}
          </span>
        </div>
      </div>

      <div class="mt-8 rounded-[28px] border border-white/10 bg-[#0d1018]/82 p-6 backdrop-blur-xl sm:p-8">
        <div class="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <div class="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-200/16 bg-cyan-300/8 px-3 py-1 text-sm text-cyan-100/82">
              <Network class="h-4 w-4" />
              {{ t('stars.flows_badge') }}
            </div>
            <h3 class="text-3xl font-bold text-white">{{ t('stars.flows_title') }}</h3>
          </div>
        </div>

        <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <article
            v-for="workflow in workflows"
            :key="workflow.title"
            class="rounded-[22px] border border-white/10 bg-white/[0.045] p-5"
          >
            <div class="mb-4 flex items-center gap-2 text-sm font-semibold text-amber-100/82">
              <GitBranch class="h-4 w-4" />
              {{ workflow.title }}
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <template v-for="(node, index) in workflow.path" :key="node">
                <span class="rounded-full border border-white/12 bg-black/20 px-3 py-1.5 text-sm text-white">
                  {{ node }}
                </span>
                <span v-if="index < workflow.path.length - 1" class="text-white/34">→</span>
              </template>
            </div>
            <p class="mt-4 text-sm leading-6 text-white/58">{{ workflow.detail }}</p>
          </article>
        </div>
      </div>
    </div>
  </section>
</template>
