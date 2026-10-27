# dsh-ask-cases

A star icon sits left of the composer in [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness). Click it, and the sentence you were about to send is rewritten — in place, using the last few turns of the conversation — into something the other side can actually answer.

It never sends for you. You look at the result, then press Enter yourself.

```
before  我最近想找一份工作，
after   我最近想找份工作，方向还没想好，能帮我理一下从哪开始吗？比如简历怎么改、往哪类岗位投比较合适。
```

## Why

Most prompts fail for one reason: they describe a *topic* but never say what counts as a good answer. The model can't ask, so it fills the gap with length.

The rewrite adds back the one or two things that were missing — who you are in this task, what shape the answer should take, what would make it wrong — and stops there. It is deliberately not a "prompt template generator": a two-sentence question does not become a fifteen-row table.

Anything it had to assume is listed separately, collapsed under `已默认 N 项`, and is never sent with your message.

## Install

From the plugin market inside DSH: add the index source

```
https://laurusam.github.io/dsh-ask-cases/index.json
```

then search for **提问改写 / Ask Rewriter** and install.

Manual install into a profile:

```bash
npm install dsh-ask-cases
# then add to cordis.patch.yml:
# - insert:
#     - id: ask-cases
#       name: "dsh-ask-cases"
```

Restart DSH (the host composes plugins at boot), then open any session — the star appears left of the input, next to the permission chips.

## Use

1. Type your question, however rough.
2. Click the star.
3. The rewrite streams into a panel. Read it; if `已默认` is expanded, check the assumptions.
4. **仅写入** puts it in the composer so you can edit; **写入并发送** sends it as is.

The panel is keyboard-dismissable (`Esc`) and positions itself above the button, so it never covers the composer.

## Settings

**Settings → Built-in plugins → 提问改写** carries the description; the behavior itself has no knobs yet except one hard rule: an empty draft does nothing.

## How it works

- A host half registers one HTTP route under `/plugins/ask-cases/rewrite`. It reads the draft plus the last six messages of the session (each clipped to 300–400 characters), asks the model to rewrite, and streams the answer back as NDJSON.
- The browser half registers a single React component into `conversation.input.left`, streams the deltas into the panel, splits the model's assumptions from the sendable text, and writes the result back through the composer's public `inputActions` face.
- Nothing is written to the session log, and nothing enters the model's context unless you send it.

## Limitations

- **No send interception.** The panel can write and submit for you, but it cannot hook the send button itself — DSH exposes no pre-submit extension point.
- **Context is short by design.** Six messages, ~3 turns. Longer context makes the rewrite drift toward whatever was discussed before.
- **Chinese-first.** The prompt and typography are tuned for Chinese; other languages work but the tone rules are written for Chinese.
- **It will not invent a question.** One or two characters ("测试") are passed through unchanged with a note, rather than being expanded into something you never asked.

## Development

```bash
node build.mjs            # inline src/ into lib/client.js
node test/rules.test.mjs  # deterministic core
node test/bundle.smoke.mjs
node src/cli.mjs "你的问题"  # run the slot diagnosis from a terminal
```

`lib/client.js` is generated; edit `src/` and rebuild.

## License

MIT
