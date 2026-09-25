# 前缀档位（prompt.profile）

主控每一轮都要读完整个 frozen 前缀：行为护栏、工具 schema、项目说明、知识索引。
这些字节从第二轮起就被前缀缓存覆盖，**花的钱很少，但占的注意力一分不少**。
前缀档位就是给这份注意力预算一个开关。

默认 `standard` = 现状，与历史版本逐字节相同。想瘦身要主动选。

## 三档

| 档位 | 适合 | 做了什么 |
|------|------|----------|
| `standard`（默认） | 绝大多数场景 | 什么都不改 |
| `lean` | 长会话、上下文吃紧、任务聚焦 | 缩减参考类块，关掉 historical-lessons，压缩超长工具描述 |
| `full` | 上下文窗口大、要求全知 | 放宽各块上限 |

`lean` 相对 `standard` 的具体差异：

- seed-capsule 索引只展开前 5 条摘要，其余星**仍列出星名**（`recall_capsule` 照常可取全文）
- knowledge-manifest 上限 2200 → 1000 字符
- codebase-index 上限 4000 → 1500 字符
- project-memory 上限 3000 → 1500 字符
- historical-lessons 不再注入 appendix
- 工具描述切到 `compact`

在本仓库实测，`lean` 把 frozen 前缀从约 39.8K 字符降到约 38.5K（−3.3%）。
收益主要看项目的知识文件规模——manifest 和 codebase-index 越大，`lean` 省得越多。

> `lean` 的**质量代价尚未实测**。历史上做过一次子代理瘦身的 A/B，任务完成率是
> 100% vs 80%——少读内容不是免费的。在跑出对照数据之前，把 `lean` 当实验档位看待：
> 上下文确实吃紧时再开，别当默认优化。

## 配置

项目级 `.rivet-config.json`：

```json
{
  "prompt": {
    "profile": "lean"
  }
}
```

用户级 `~/.rivet/config.json` 同样的 `prompt` 节。优先级从高到低：

1. `RIVET_PROMPT_PROFILE` 环境变量
2. 项目 `.rivet-config.json`
3. 用户 `~/.rivet/config.json`
4. `standard`

### 逐块覆盖

`prompt.blocks.*` 比 profile 优先，用来微调而不是整档切换：

```json
{
  "prompt": {
    "profile": "lean",
    "blocks": { "historicalLessons": true },
    "toolDescriptions": "full"
  }
}
```

可用开关：`seedCapsule`、`knowledgeManifest`、`codebaseIndex`、`projectMemory`、`historicalLessons`。

## 切档的代价

**档位在会话启动时解析并冻结，中途改配置不生效。** 这不是偷懒——改前缀就是让整段
前缀缓存作废，会话中途切档会立刻付一次全量重建的钱。改完配置开新会话即可。

第一个新会话会 miss 一次缓存（前缀字节变了），之后恢复正常命中率。

## 查看当前预算

会话内：

```
/prefix-budget
```

命令行（量的是「新会话会是什么样」，会话内命令量的是「本会话现在是什么样」）：

```bash
npm run prefix:budget            # 分块归因
npm run prefix:budget -- --tools # 追加逐工具 schema 明细
npm run prefix:budget -- --json  # 机器可读
```

## 档位不会碰什么

行为护栏**不受档位影响**，没有开关，这是有意的：

- `static.ts` 的 rules / delivery-contract / workflow / security / tool-usage
- 任务模式的 volatileBlock 与 systemPromptSuffix（`star-domain.ts` / `star-domain-data.ts`）

护栏起作用的时刻，正是 agent 没意识到自己跑偏的时候——它不会主动去召回。
历史上把胶囊正文改成按需 recall 曾在同一天被回滚（`0c776b9` → `17b496a`，
commit 记录的根因是「behavioral guardrails must be RESIDENT, not on-demand」）。
参考资料适合按需取，刹车不适合。

如果你觉得某条护栏是噪音，正确的做法是讨论删掉它本身，而不是让它按档位时隐时现。
