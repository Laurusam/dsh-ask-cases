/**
 * Browser UI for the question compiler.
 *
 * Click → the host rewrites the draft with a model → the result appears here,
 * ready to send. No blanks for the user to fill.
 *
 * This file is not a module: build.mjs inlines it into the client bundle's
 * factory, where `React`, `ReactDOM`, `h` and `AskRules` are already in scope.
 */

var STYLE_ID = "dsh-plugin-ask-cases/style.css";

var CSS = [
  ".qc-root{position:relative;display:inline-flex;align-items:center}",
  ".qc-btn{display:grid;place-items:center;width:24px;height:24px;padding:0;border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-label-secondary,#8a8a8a);cursor:pointer;transition:background .12s ease}",
  ".qc-btn:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(128,128,128,.14))}",
  ".qc-btn[data-open=true]{background:var(--dsw-alias-interactive-bg-hover,rgba(128,128,128,.14));color:var(--dsw-alias-label-primary,#e8e8e8)}",
  ".qc-backdrop{position:fixed;inset:0;z-index:60}",
  ".qc-panel{position:fixed;z-index:61;width:420px;max-height:min(68vh,560px);overflow:auto;padding:14px;box-sizing:border-box;border-radius:12px;border:1px solid var(--dsw-alias-border-l2-darkmode-thin,rgba(128,128,128,.22));background:var(--dsw-specific-input-major,#1f1f1f);box-shadow:var(--dsw-elevation-panel,0 12px 32px rgba(0,0,0,.35));color:var(--dsw-alias-label-primary,#e8e8e8);font-size:12.5px;line-height:1.6}",
  ".qc-head{display:flex;align-items:baseline;gap:8px;margin:0 0 10px}",
  ".qc-title{font-size:14px;font-weight:600;margin:0}",
  ".qc-status{margin-left:auto;font-size:11.5px;color:var(--dsw-alias-label-secondary,#9a9a9a)}",
  ".qc-body{margin:0;white-space:pre-wrap;word-break:break-word;padding:10px;border-radius:8px;border:1px solid rgba(77,143,255,.28);background:rgba(77,143,255,.07);font-size:12.5px;line-height:1.7}",
  ".qc-hint{margin:10px 0 0;font-size:11.5px;color:var(--dsw-alias-label-secondary,#9a9a9a)}",
  ".qc-error{margin:0;padding:10px;border-radius:8px;border:1px solid rgba(194,91,74,.4);background:rgba(194,91,74,.1);font-size:12px}",
  ".qc-actions{display:flex;gap:8px;margin-top:12px}",
  ".qc-act{flex:1;padding:7px 10px;border-radius:8px;border:1px solid var(--dsw-alias-border-l2-darkmode-thin,rgba(128,128,128,.28));background:transparent;color:inherit;font:inherit;cursor:pointer}",
  ".qc-act:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(128,128,128,.14))}",
  ".qc-act[data-primary=true]{background:rgba(77,143,255,.16);border-color:rgba(77,143,255,.42)}",
  ".qc-act[data-primary=true]:hover{background:rgba(77,143,255,.24)}",
  ".qc-act[disabled]{opacity:.45;cursor:not-allowed}",
  ".qc-pending{margin-top:10px}",
  ".qc-pendingToggle{padding:0;border:0;background:transparent;color:var(--dsw-alias-label-secondary,#9a9a9a);font:inherit;font-size:11.5px;cursor:pointer}",
  ".qc-pendingToggle:hover{color:var(--dsw-alias-label-primary,#e8e8e8)}",
  ".qc-pendingList{margin:6px 0 0;padding-left:16px;font-size:11.5px;line-height:1.7;color:var(--dsw-alias-label-secondary,#9a9a9a)}",
  ".qc-panel{animation:qc-in .14s ease-out}",
  "@keyframes qc-in{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}",
  ".qc-caret{display:inline-block;width:2px;height:1em;margin-left:2px;border-radius:1px;background:currentColor;vertical-align:-2px;animation:qc-blink .9s steps(2,start) infinite}",
  "@keyframes qc-blink{to{visibility:hidden}}",
  ".qc-dots i{display:inline-block;width:4px;height:4px;margin-left:4px;border-radius:50%;background:currentColor;opacity:.3;animation:qc-bounce 1s infinite}",
  ".qc-dots i:nth-child(2){animation-delay:.15s}",
  ".qc-dots i:nth-child(3){animation-delay:.3s}",
  "@keyframes qc-bounce{0%,80%,100%{opacity:.25;transform:translateY(0)}40%{opacity:.9;transform:translateY(-2px)}}",
  ".qc-auto{display:flex;align-items:center;gap:6px;margin-top:10px;font-size:11.5px;color:var(--dsw-alias-label-secondary,#9a9a9a);cursor:pointer}",
  ".qc-auto input{accent-color:#4d8fff;margin:0}",
  ".qc-set{font-size:13px;line-height:1.7;color:var(--dsw-alias-label-primary,#e8e8e8);max-width:560px}",
  ".qc-setTitle{font-size:15px;font-weight:600;margin:0 0 8px}",
  ".qc-setLead{margin:0 0 14px;color:var(--dsw-alias-label-secondary,#9a9a9a);font-size:12.5px}",
  ".qc-setRow{display:flex;gap:8px;align-items:flex-start;cursor:pointer}",
  ".qc-setRow input{margin-top:3px;accent-color:#4d8fff}",
  ".qc-setHint{display:block;font-style:normal;font-size:11.5px;color:var(--dsw-alias-label-secondary,#9a9a9a)}",
  ".qc-setNote{margin:16px 0 0;font-size:11.5px;color:var(--dsw-alias-label-secondary,#9a9a9a)}",
  ".qc-toast{position:fixed;z-index:62;padding:6px 10px;border-radius:8px;font-size:12px;background:var(--dsw-specific-input-major,#1f1f1f);border:1px solid var(--dsw-alias-border-l2-darkmode-thin,rgba(128,128,128,.28));color:var(--dsw-alias-label-primary,#e8e8e8);box-shadow:var(--dsw-elevation-panel,0 8px 24px rgba(0,0,0,.3))}"
].join("\n");

function ensureStyle() {
  if (typeof document === "undefined") return;
  if (document.querySelector('style[data-plugin-css="' + STYLE_ID + '"]') !== null) return;
  var tag = document.createElement("style");
  tag.setAttribute("data-plugin-css", STYLE_ID);
  tag.textContent = CSS;
  document.head.appendChild(tag);
}

var AUTO_SEND_KEY = "ask-cases.auto-send";

function readAutoSend() {
  try {
    return String(window.localStorage.getItem(AUTO_SEND_KEY)) === "1";
  } catch (e) {
    return false;
  }
}

function writeAutoSend(next) {
  try {
    window.localStorage.setItem(AUTO_SEND_KEY, next ? "1" : "0");
  } catch (e) {
    /* storage may be unavailable */
  }
}

/** Four-point sparkle: the mark for "rewrite this question". */
function QuestionIcon() {
  function sparkle(cx, cy, r) {
    var k = r * 0.13;
    var q = r * 0.38;
    return (
      "M" + cx + " " + (cy - r) +
      "C" + (cx + k) + " " + (cy - q) + " " + (cx + q) + " " + (cy - k) + " " + (cx + r) + " " + cy +
      "C" + (cx + q) + " " + (cy + k) + " " + (cx + k) + " " + (cy + q) + " " + cx + " " + (cy + r) +
      "C" + (cx - k) + " " + (cy + q) + " " + (cx - q) + " " + (cy + k) + " " + (cx - r) + " " + cy +
      "C" + (cx - q) + " " + (cy - k) + " " + (cx - k) + " " + (cy - q) + " " + cx + " " + (cy - r) +
      "Z"
    );
  }
  return h(
    "svg",
    { width: 16, height: 16, viewBox: "0 0 16 16", fill: "currentColor", "aria-hidden": "true" },
    h("path", { d: sparkle(6.3, 9.6, 5.3) }),
    h("path", { d: sparkle(12.3, 4.2, 2.5) })
  );
}

/**
 * Ask the host to rewrite the draft against recent context.
 * Streams deltas through `onDelta`; resolves to { text, pending, sawDelta } or { error }.
 */
function requestRewrite(draft, sessionId, signal, onDelta) {
  var url =
    "/plugins/ask-cases/rewrite?draft=" +
    encodeURIComponent(draft) +
    (sessionId ? "&sessionId=" + encodeURIComponent(sessionId) : "");

  return fetch(url, { method: "GET", signal: signal, cache: "no-store", credentials: "omit" }).then(
    function (response) {
      if (!response.ok || !response.body || typeof response.body.getReader !== "function") {
        return response
          .json()
          .catch(function () {
            return {};
          })
          .then(function (body) {
            return { error: body.error || "HTTP " + response.status };
          });
      }

      var reader = response.body.getReader();
      var decoder = new TextDecoder();
      var buffer = "";
      var raw = "";
      var final = null;
      var sawDelta = false;
      var firstDeltaAt = 0;
      var lastDeltaAt = 0;

      function handle(line) {
        if (!line.trim()) return;
        var obj;
        try {
          obj = JSON.parse(line);
        } catch (e) {
          return;
        }
        if (typeof obj.delta === "string") {
          raw += obj.delta;
          sawDelta = true;
          if (firstDeltaAt === 0) firstDeltaAt = Date.now();
          lastDeltaAt = Date.now();
          if (onDelta) onDelta(raw);
        } else if (typeof obj.text === "string") {
          final = obj;
        } else if (typeof obj.error === "string") {
          final = { error: obj.error };
        }
      }

      function pump() {
        return reader.read().then(function (step) {
          if (step.done) {
            if (buffer.trim()) handle(buffer);
            if (final && typeof final.text === "string") {
              // A buffered transport delivers everything in one burst; animate that locally.
              var streamed = sawDelta && lastDeltaAt - firstDeltaAt > 150;
              return { text: final.text, pending: final.pending || [], sawDelta: sawDelta, streamed: streamed };
            }
            if (final && final.error) return { error: final.error };
            return { error: "没有拿到改写结果" };
          }
          buffer += decoder.decode(step.value, { stream: true });
          var index;
          while ((index = buffer.indexOf("\n")) >= 0) {
            handle(buffer.slice(0, index));
            buffer = buffer.slice(index + 1);
          }
          return pump();
        });
      }

      return pump();
    },
    function (error) {
      return { error: (error && error.message) || "请求失败" };
    }
  );
}

function Panel(props) {
  var rect = props.rect;
  var style = {
    left: Math.max(8, Math.min(rect.left - 8, window.innerWidth - 436)),
    bottom: Math.max(8, window.innerHeight - rect.top + 10)
  };
  var state = props.state;

  var body;
  if (state.phase === "empty") {
    body = h("p", { className: "qc-hint" }, state.hint || "输入框是空的：先写下你的问题，再点这里。");
  } else if (state.phase === "loading") {
    body = h(
      "p",
      { className: "qc-hint" },
      "正在改写",
      h("span", { className: "qc-dots" }, h("i", null), h("i", null), h("i", null))
    );
  } else if (state.phase === "error") {
    body = h("p", { className: "qc-error" }, state.message);
  } else if (state.phase === "streaming") {
    body = h(
      "p",
      { className: "qc-body" },
      state.text,
      h("span", { className: "qc-caret" })
    );
  } else {
    body = h("p", { className: "qc-body" }, state.text);
  }

  var pending = Array.isArray(state.pending) ? state.pending : [];
  var assumptions = null;
  if (state.phase === "done" && pending.length > 0) {
    assumptions = h(
      "div",
      { className: "qc-pending" },
      h(
        "button",
        {
          type: "button",
          className: "qc-pendingToggle",
          "data-open": props.showPending ? "true" : "false",
          onClick: props.onTogglePending
        },
        "已默认 " + pending.length + " 项" + (props.showPending ? " ▴" : " ▾")
      ),
      props.showPending
        ? h(
            "ul",
            { className: "qc-pendingList" },
            pending.map(function (item, i) {
              return h("li", { key: i }, item);
            })
          )
        : null
    );
  }

  var actions = [];
  if (state.phase === "done") {
    actions.push(
      h(
        "button",
        {
          key: "write",
          type: "button",
          className: "qc-act",
          onClick: function () {
            props.onWrite(state.text);
          }
        },
        "仅写入"
      )
    );
    actions.push(
      h(
        "button",
        {
          key: "send",
          type: "button",
          className: "qc-act",
          "data-primary": "true",
          onClick: function () {
            props.onWrite(state.text, true);
          }
        },
        "写入并发送"
      )
    );
    actions.push(
      h("button", { key: "again", type: "button", className: "qc-act", onClick: props.onRetry }, "再改一次")
    );
  } else if (state.phase === "error") {
    actions.push(
      h("button", { key: "retry", type: "button", className: "qc-act", "data-primary": "true", onClick: props.onRetry }, "重试")
    );
  }

  return ReactDOM.createPortal(
    h(
      "div",
      null,
      h("div", { className: "qc-backdrop", onClick: props.onClose }),
      h(
        "div",
        { className: "qc-panel", style: style, role: "dialog", "aria-label": "提问改写" },
        h(
          "div",
          { className: "qc-head" },
          h("p", { className: "qc-title" }, "改写后的提问"),
          h(
            "span",
            { className: "qc-status" },
            state.phase === "loading" || state.phase === "streaming" ? "生成中" : state.phase === "done" ? "可直接发送" : ""
          )
        ),
        body,
        assumptions,
        actions.length ? h("div", { className: "qc-actions" }, actions) : null
      )
    ),
    document.body
  );
}

function Toast(props) {
  return ReactDOM.createPortal(
    h(
      "div",
      {
        className: "qc-toast",
        style: {
          left: Math.max(8, Math.min(props.rect.left, window.innerWidth - 260)),
          bottom: Math.max(8, window.innerHeight - props.rect.top + 10)
        }
      },
      props.text
    ),
    document.body
  );
}

function QuestionCompiler(props) {
  var inputActions = props.inputActions;
  var useInput = props.useInput;
  var sessionId = props.sessionId;

  var draft = useInput
    ? useInput(function (state) {
        return state ? state.draft : "";
      })
    : "";

  var openState = React.useState(false);
  var open = openState[0];
  var setOpen = openState[1];

  var rectState = React.useState({ left: 0, top: 0 });
  var rect = rectState[0];
  var setRect = rectState[1];

  var toastState = React.useState(null);
  var toast = toastState[0];
  var setToast = toastState[1];

  var stateStore = React.useState({ phase: "empty" });
  var state = stateStore[0];
  var setState = stateStore[1];

  var ref = React.useRef(null);
  var abortRef = React.useRef(null);
  var typerRef = React.useRef(null);

  var pendingState = React.useState(false);
  var showPending = pendingState[0];
  var setShowPending = pendingState[1];

  // Hidden for now: the rewrite only writes back, it never sends on its own.
  var autoState = React.useState(function () {
    return false;
  });
  var autoSend = autoState[0];
  var setAutoSend = autoState[1];

  function toggleAutoSend() {
    var next = !autoSend;
    setAutoSend(next);
    writeAutoSend(next);
  }

  React.useEffect(
    function () {
      return function () {
        if (typerRef.current !== null) clearInterval(typerRef.current);
        if (abortRef.current) abortRef.current.abort();
      };
    },
    []
  );

  React.useEffect(
    function () {
      if (!open) return;
      function onKey(event) {
        if (event.key === "Escape") setOpen(false);
      }
      document.addEventListener("keydown", onKey);
      return function () {
        document.removeEventListener("keydown", onKey);
      };
    },
    [open]
  );

  React.useEffect(
    function () {
      if (toast === null) return;
      var timer = setTimeout(function () {
        setToast(null);
      }, 2400);
      return function () {
        clearTimeout(timer);
      };
    },
    [toast]
  );

  function stopTyping() {
    if (typerRef.current !== null) {
      clearInterval(typerRef.current);
      typerRef.current = null;
    }
  }

  /** Fallback reveal when the transport delivered everything in one piece. */
  function typewriter(full, pendingList) {
    stopTyping();
    var index = 0;
    var step = Math.max(1, Math.ceil(full.length / 40));
    setState({ phase: "streaming", text: "" });
    typerRef.current = setInterval(function () {
      index = Math.min(full.length, index + step);
      if (index >= full.length) {
        stopTyping();
        setState({ phase: "done", text: full, pending: pendingList || [] });
        return;
      }
      setState({ phase: "streaming", text: full.slice(0, index) });
    }, 16);
  }

  function run(text) {
    if (abortRef.current) abortRef.current.abort();
    stopTyping();
    var controller = typeof AbortController === "function" ? new AbortController() : null;
    abortRef.current = controller;
    setShowPending(false);
    setState({ phase: "loading" });

    requestRewrite(
      text,
      sessionId,
      controller ? controller.signal : undefined,
      function (raw) {
        if (controller && controller.signal.aborted) return;
        // The assumptions tail is UI-only; never show it as part of the sentence.
        var cut = raw.indexOf("【待确认】");
        setState({ phase: "streaming", text: cut >= 0 ? raw.slice(0, cut) : raw });
      }
    ).then(function (result) {
      if (controller && controller.signal.aborted) return;
      if (result && typeof result.text === "string") {
        if (result.streamed) setState({ phase: "done", text: result.text, pending: result.pending || [] });
        else typewriter(result.text, result.pending || []);
        if (autoSend) write(result.text, true);
        return;
      }
      setState({ phase: "error", message: (result && result.error) || "改写失败" });
    });
  }

  function toggle() {
    if (ref.current !== null) setRect(ref.current.getBoundingClientRect());
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    var text = String(draft || "").trim();
    // Only an empty draft is blocked; one or two characters still trigger a rewrite.
    if (text.length === 0) setState({ phase: "empty" });
    else run(text);
  }

  function write(text, send) {
    var result = "failed";
    if (inputActions) {
      try {
        if (inputActions.setDraft && inputActions.setDraft(text) !== false) result = "replaced";
        else {
          var span = inputActions.captureInsertion ? inputActions.captureInsertion() : void 0;
          if (span !== void 0 && inputActions.insertText && inputActions.insertText(text, span)) result = "inserted";
        }
      } catch (e) {
        result = "failed";
      }
    } else {
      result = "unavailable";
    }
    setOpen(false);

    if (result === "failed") {
      setToast("写不进去：输入框可能正在提交");
      return;
    }
    if (result === "unavailable") {
      setToast("没有拿到输入框句柄");
      return;
    }
    if (send !== true) {
      setToast("已写入输入框，可继续修改后发送");
      return;
    }

    // Give the composer a beat to commit the new draft before submitting it.
    var submit = inputActions && inputActions.submit;
    if (typeof submit !== "function") {
      setToast("已写入，这句话不能自动发送，请按 Enter");
      return;
    }
    setTimeout(function () {
      try {
        submit();
        setToast("已发送");
      } catch (e) {
        setToast("写入成功，但发送失败：请按 Enter");
      }
    }, 60);
  }

  var children = [
    h(
      "button",
      {
        key: "btn",
        ref: ref,
        type: "button",
        className: "qc-btn",
        "data-open": open ? "true" : "false",
        title: "改写我的提问",
        "aria-label": "改写我的提问",
        onClick: toggle
      },
      h(QuestionIcon, null)
    )
  ];

  if (open) {
    children.push(
      h(Panel, {
        key: "panel",
        rect: rect,
        state: state,
        showPending: showPending,
        autoSend: autoSend,
        onToggleAutoSend: toggleAutoSend,
        onTogglePending: function () {
          setShowPending(!showPending);
        },
        onClose: toggle,
        onWrite: write,
        onRetry: function () {
          run(String(draft || "").trim());
        }
      })
    );
  }
  if (toast !== null) children.push(h(Toast, { key: "toast", text: toast, rect: rect }));

  return h("span", { className: "qc-root" }, children);
}

/** Settings → Built-in plugins → 提问改写 tab. */
function SettingsTab() {
  var state = React.useState(function () {
    return readAutoSend();
  });
  var autoSend = state[0];
  var setAutoSend = state[1];

  function flip() {
    var next = !autoSend;
    setAutoSend(next);
    writeAutoSend(next);
  }

  return h(
    "div",
    { className: "qc-set" },
    h("h3", { className: "qc-setTitle" }, "辅助提问"),
    h(
      "p",
      { className: "qc-setLead" },
      "输入框左边的星芒图标：点一下，把你写的那句话按当前会话改写一遍。它只把结果写回输入框，发不发由你决定。"
    ),
    h(
      "p",
      { className: "qc-setNote" },
      "上下文：改写会带上当前会话最近 6 条消息（约 3 轮），每条截断到 300–400 字；更早的内容不参与。"
    )
  );
}

function apply(ctx) {
  ensureStyle();
  ctx.slots.inject("conversation.input.left", function () {
    return ctx.slots.register({ name: "conversation.input.left", id: "ask-cases" }, QuestionCompiler);
  });
  ctx.slots.inject("settings.plugins.tab", function () {
    return ctx.slots.register(
      {
        name: "settings.plugins.tab",
        id: "ask-cases",
        order: 40,
        label: function () {
          return "辅助提问";
        }
      },
      SettingsTab
    );
  });
}
