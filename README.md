# dsh-plugin-ask-cases

输入框左侧一个「?」图标：点开对当前草稿做**六格诊断**，给出改写骨架，一键写回草稿。
纯客户端插件——不调模型、不写会话日志、不占模型上下文。

## 它做什么

把你写的那句话按六个槽位过一遍，缺哪格就标出来，并给出为什么缺它不行：

| 序 | 槽位 | 缺了的后果 |
|---|---|---|
| 1 | 判据 | 没有终止条件，模型用篇幅假装完成 |
| 2 | 场景 | 得到百科，得不到方案 |
| 3 | 产物形状 | 模型默认选长文 |
| 4 | 材料 | 模型用通用知识冒充你的材料 |
| 5 | 边界 | 输出无限扩张 |
| 6 | 阶段 | 分不清要资料还是要决策 |

面板内容：分数（`0/6` ~ `6/6`）、六格清单、缺格的「先问这两条」、改写骨架、两个按钮（只看诊断 / 写入改写版）。

写入走公开的 `inputActions.captureInsertion()` + `insertText()`，失败回退 `setDraft()`，不碰 Lexical 内部。

## 结构

```
src/rules.cjs        ★ 确定性内核：diagnose / rewrite（纯函数，无 IO）
src/ui.js            面板与图标（React，build 时内联）
src/cli.mjs          命令行跑一条：node src/cli.mjs "<你的问题>"
build.mjs            把 rules + ui 打成 lib/client.js
lib/client.js        产物（生成物，勿手改）
lib/index.js         宿主半侧：空 apply，只为让包成为 Loader 条目
test/rules.test.mjs  规则回归（7 条）
test/bundle.smoke.mjs 产物冒烟：假 ModuleLoader 里跑一遍 apply + 渲染
install.ps1          安装 / 回滚
```

## 开发

```powershell
node build.mjs                       # 重新打包
node test/rules.test.mjs             # 规则测试
node test/bundle.smoke.mjs           # 产物冒烟
node src/cli.mjs "PARA 方法，等相关的方法论，目的是企业协作、经验沉淀"
```

改完 `src/` 必须重新 `build`，然后 **Ctrl+R 重载页面**（不用重启应用；宿主侧的改动才需要重启，页面侧的热更新不会自动推）。

## 两个踩过的坑

**1. 新插件必须用 `- insert:`，不能用 `- id:`。**
`cordis.patch.yml` 的条目是 id 定向的：`- id: X` 只在树里已有 `X` 时覆盖，找不到就只警告并跳过。参见上面的「为什么必须是 insert」。

**2. list 型 slot 注册必须带 `id`。**
```js
ctx.slots.register({ name: "conversation.input.left", id: "ask-cases" }, Comp)
```
少了 `id` 会抛 `list slot "conversation.input.left" requires options.id`，而且这个异常只会让图标静默消失——不打开控制台根本看不到。

## 调试客户端插件（不开 DevTools 也能定位）

客户端插件跑在浏览器里，出问题时没有日志可看。一个有效的办法是在 bundle 里埋一个**可视状态梯**：每过一个生命周期节点就往固定定位的 `<div>` 里追加一行，同时写进 `window.__askCasesLog`。

```js
1 module            // bundle 执行了
2 apply slots=y     // 插件被应用，拿到服务
3 slot available    // 槽出现（slots.inject 回调触发）
4 ok via A          // slots.register 成功
5 render useInput=function inputActions=object
```

停在哪一行，故障就锁定在哪一步。注意把梯子放在**右下角**——放左下角会压住输入框，把本来已经渲染成功的图标盖住（这次就是这么误判了一轮）。验证通过后务必拆掉。

## 安装

```powershell
pwsh -File install.ps1 -DryRun   # 先看会改什么
pwsh -File install.ps1           # 装：备份 → 建 junction → 追加 entry
```

装完 **重启 DeepSeek Harness**，打开任意会话，输入框左下会出现「?」。

安装做的事：

1. 备份 `cordis.patch.yml` 与 `package.json` 到 `~/.dsh/profiles/desktop/.backup-ask-cases/`；
2. 在 `~/.dsh/profiles/desktop/node_modules/dsh-plugin-ask-cases` 建一个 **junction** 指向本目录；
3. 在 `cordis.patch.yml` 追加一个 **insert** 块：

```yaml
- insert:
    - id: ask-cases
      name: "dsh-plugin-ask-cases"
```

### 为什么必须是 insert

`cordis.patch.yml` 的条目是 **id 定向**的：`- id: X` 只在树里**已有** id `X` 时做覆盖，找不到就只打一条 warning 并跳过。新插件不存在这个 id，所以必须用 `- insert:` 追加。写成 `- id:` 的表现就是——什么都不报，插件静静地不出现。

## 回滚

```powershell
pwsh -File install.ps1 -Rollback
```

删 junction、去掉那条 entry，重启后恢复原状。

## 注意

- junction 指向本目录：**移动或删除插件目录会让应用启动时找不到该包**，先 `-Rollback` 再动。
- 在 profile 里跑 `pnpm install` 可能会清掉 junction（`nodeLinker: hoisted`），重跑 `install.ps1` 即可。
- 装载失败不会静默：设置里的插件清单会显示该条目与错误。
