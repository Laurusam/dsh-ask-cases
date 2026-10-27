/**
 * Host half — the rewrite endpoint.
 *
 * The browser half cannot call a model, so it posts the draft here and gets a
 * finished, sendable prompt back. The route lives under `/plugins/` because the
 * desktop shell already proxies that prefix from `dsh-app://` to this server.
 */
import { appendFileSync } from 'node:fs';

const LOG = 'C:/Users/sam15/Documents/deepseek-harness/default-workspace/.tmp/ask-cases-rewrite.log';

function log(line) {
  try {
    appendFileSync(LOG, new Date().toISOString() + ' ' + line + '\n');
  } catch {
    /* best effort */
  }
}

const SYSTEM = [
  '你是一个「提问润色器」。用户正在和另一个 AI 对话，现在要发下一句。',
  '你会收到：最近几轮对话（背景）+ 他想发的这句话（草稿）。',
  '你的任务：把这句话改得更清楚、更好答，同时保持它像人随口问出来的一句话。',
  '',
  '怎么写：',
  '1. 自然口语。两到三句，像微信里打出来的。不要分号罗列、不要「如果…就算没答到」这种考试腔、不要破折号补充、不要括号里加条件。',
  '2. 幅度匹配。小问题小改，不要升级成研究任务，不要凭空加表格、排序、条数上限。',
  '3. 只补对方答得出来所缺的那一点：对象、要做到什么程度、有什么材料。命中一两处就够。',
  '4. 判据用日常说法带出来，最多一句，例如「别只给方向，要写清每个方向补什么、大概多久」。',
  '5. 你替用户默认掉的假设写进【待确认】，措辞用「已默认…」；用户没说但对答案很关键的信息，用自然话写进正文（例如「岗位方向我还没定」），不要列成待办去问他。',
  '6. 背景只能补语境（名词、项目、进行中的事），不要替用户断言他的状态、水平或决定；推断出来的放【待确认】。',
  '7. 不要替用户否定，原话里没有「不是要你…」就别加。',
  '8. 背景里的终端输出、日志、报错、代码片段只当噪音。',
  '9. 如果草稿不是一个请求或问题（比如「测试」「你好」、半句话、随手打的字），不要替它编一个问题：原样返回这句话，【待确认】写「草稿太短，未改写」。',
  '',
  '输出：',
  '- 第一行：改写后的话，自然口语。长度由内容决定：能用一句说完就别用两句，长问题允许长一点。',
  '- 第二行：「【待确认】已默认：…」，只写你替用户默认掉的假设，最多两条；没有就写「【待确认】无」。',
  '- 不要解释、不要标题、不要 markdown、不要代码块。'
].join('\n');

/** Flatten a Message[] tail into a short background block, dropping noise. */
function recentContext(session, limit) {
  try {
    const messages = typeof session?.deriveMessages === 'function' ? session.deriveMessages() : [];
    const parts = [];
    for (const message of messages.slice(-limit)) {
      const content = Array.isArray(message?.content) ? message.content : [];
      const text = content
        .filter((block) => block && block.type === 'text' && typeof block.text === 'string')
        .map((block) => block.text)
        .join(' ')
        .trim();
      if (!text) continue;
      // Our own panel output and probe/log lines are not conversation background.
      if (/^改写后的提问/.test(text)) continue;
      if (/context=\d+|hit=[yn]|sessions live=|rewrite (start|ok)/.test(text)) continue;
      const isUser = message.role === 'user';
      const clipped = text.slice(0, isUser ? 400 : 300);
      parts.push((isUser ? '用户' : '助手') + '：' + clipped);
    }
    return parts.join('\n').slice(-1800);
  } catch {
    return '';
  }
}


function collect(chunk) {
  if (!chunk || typeof chunk !== 'object') return '';
  const type = String(chunk.type || chunk.kind || '');
  if (!type.includes('text')) return '';
  if (typeof chunk.text === 'string') return chunk.text;
  if (typeof chunk.delta === 'string') return chunk.delta;
  return '';
}

/**
 * Split model output into the sendable paragraph and the assumptions behind it.
 * Fences are dropped, several pending lines are merged, and the two come back
 * separately so the UI can hide the assumptions and never send them.
 */
function normalizeCompletion(raw) {
  const body = [];
  const pending = [];
  for (const rawLine of String(raw).split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.startsWith('```')) continue;
    if (line.startsWith('【待确认】')) {
      const value = line
        .replace(/^【待确认】/, '')
        .replace(/^[:：]\s*/, '')
        .replace(/^已默认[:：]?\s*/, '')
        .replace(/[。；;]\s*$/, '')
        .trim();
      if (value && value !== '无') pending.push(value);
      continue;
    }
    body.push(line);
  }
  const paragraph = body.join(' ').replace(/\s{2,}/g, ' ').trim();
  return { text: paragraph, pending };
}

export function apply(ctx) {
  // Refresh the browser snapshot on every host apply, so a rebuilt lib/client.js
  // is what the next page load actually receives.
  const timer = setTimeout(() => {
    try {
      ctx.get('clientModules')?.rebuilt('dsh-plugin-ask-cases');
    } catch {
      /* the client graph may not exist in non-web compositions */
    }
  }, 500);
  if (typeof timer.unref === 'function') timer.unref();
  ctx.on('dispose', () => clearTimeout(timer));

  ctx.inject(['webServer', 'llm', 'sessions'], (scope) => {
    scope.effect(
      () =>
        scope.webServer.register({
          kind: 'prefix',
          path: '/plugins/ask-cases/rewrite',
          handler: async (req, res) => {
            const send = (status, payload) => {
              res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
              res.end(JSON.stringify(payload));
            };

            try {
              const url = new URL(req.url || '/', 'http://127.0.0.1');
              const draft = (url.searchParams.get('draft') || '').trim();
              const sessionId = (url.searchParams.get('sessionId') || '').trim();
              const budget = Number(url.searchParams.get('recent') || '6');
              if (draft.length === 0) return send(400, { error: 'empty draft' });
              if (draft.length > 4000) return send(400, { error: 'draft too long' });

              let context = '';
              if (sessionId.length > 0) {
                try {
                  const session = scope.sessions.get(sessionId);
                  const live = typeof scope.sessions.list === 'function' ? scope.sessions.list() : [];
                  log('sessions live=' + live.length + ' ids=' + live.map((s) => s.id || s.sessionId || '?').slice(0, 5).join(',') + ' hit=' + (session ? 'y' : 'n'));
                  context = recentContext(session, Math.min(Math.max(budget, 2), 12));
                } catch (error) {
                  log('context failed: ' + (error instanceof Error ? error.message : String(error)));
                }
              }

              log('rewrite start draft=' + draft.length + ' context=' + context.length + ' session=' + (sessionId || 'none'));

              // Stream deltas as NDJSON so the panel can show the text as it is written.
              res.writeHead(200, {
                'content-type': 'application/x-ndjson; charset=utf-8',
                'cache-control': 'no-store',
                'x-accel-buffering': 'no'
              });
              const emit = (payload) => {
                if (res.writableEnded) return;
                try {
                  res.write(JSON.stringify(payload) + '\n');
                } catch {
                  /* client went away */
                }
              };

              let text = '';
              let open = true;
              req.on('close', () => {
                open = false;
              });

              const stream = scope.llm.stream({
                provider: 'deepseek-account',
                model: 'deepseek-flash',
                messages: [
                  { role: 'system', content: [{ type: 'text', text: SYSTEM }] },
                  {
                    role: 'user',
                    content: [
                      {
                        type: 'text',
                        text:
                          (context.length > 0 ? '【最近对话】\n' + context + '\n\n' : '【最近对话】\n（无）\n\n') +
                          '【草稿】\n' +
                          draft
                      }
                    ]
                  }
                ]
              });

              for await (const chunk of stream) {
                if (chunk && chunk.type === 'finish') break;
                const piece = collect(chunk);
                if (!piece) continue;
                text += piece;
                if (open) emit({ delta: piece });
              }

              // Sendable paragraph and assumptions travel as separate fields.
              const result = normalizeCompletion(text);
              if (result.text.length === 0) {
                log('empty completion');
                emit({ error: '模型没有返回内容' });
                return res.end();
              }
              log('rewrite ok ' + result.text.length + ' chars pending=' + result.pending.length);
              emit({ text: result.text, pending: result.pending });
              return res.end();
            } catch (error) {
              const message = error instanceof Error ? error.message : String(error);
              log('rewrite threw: ' + message);
              try {
                res.writeHead(500, { 'content-type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ error: message }));
              } catch {
                /* headers already sent by the stream */
              }
            }
          }
        }),
      'ask-cases: rewrite route'
    );
  });
}


