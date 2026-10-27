/**
 * ask-cases / question compiler — deterministic core.
 *
 * Pure functions over the draft text: no React, no DOM, no network, no model.
 * The browser bundle inlines this file (see build.mjs); Node imports it directly
 * for tests and for the CLI harness.
 *
 * Contract:
 *   diagnose(text) -> { verdict, score, slots[], missing[], evidence }
 *   rewrite(text, diagnosis) -> { skeleton, filled, gaps[], notes[] }
 */

/** Slot order is also the priority order used to choose what to ask first. */
var SLOT_DEFS = [
  {
    id: 'criterion',
    label: '判据',
    why: '没有判据就没有终止条件，模型只能用篇幅假装完成',
    question: '什么算答对了？写成「能判掉一条不合格的」那种形式。',
    test: function (t) {
      return /(判据|验收|合格|标准是)/.test(t) && /(落到|改写|判定|判掉|验证|能判|一对|before|after)/.test(t);
    }
  },
  {
    id: 'scene',
    label: '场景',
    why: '没有场景就得到百科，得不到方案',
    question: '你在做的是什么产物？当前阶段到哪一步？',
    test: function (t) {
      return /(我在做|我们在做|我们做的是|我在开发|我们在开发|我在设计)/.test(t) ||
        /(项目|产品|插件|系统|平台|模块|流程|工具)/.test(t);
    }
  },
  {
    id: 'shape',
    label: '产物形状',
    why: '形状不定时，模型默认选长文',
    question: '要什么形状？列名或字段名就是验收标准。',
    test: function (t) {
      var shape = /(表|清单|列表|模板|字段|列|结构|JSON|markdown|代码|报告|文档)/;
      var ask = /(给我|输出|产出|生成|要一份|要一张|包含|列：|列:)/;
      return shape.test(t) && ask.test(t);
    }
  },
  {
    id: 'material',
    label: '材料',
    why: '材料不可定位时，模型用通用知识冒充你的材料，而且写得很像',
    question: '材料在哪？给路径或名称，并写一句「读不到先问我」。',
    test: function (t) {
      return /(@\S+|路径|材料|知识包|仓库|目录|\.md\b|\.pdf\b|\.docx\b|\/[A-Za-z0-9_.-]+\/)/.test(t);
    }
  },
  {
    id: 'boundary',
    label: '边界',
    why: '没有上限和排除项，输出会无限扩张',
    question: '明确不要什么，给一个数量上限。',
    test: function (t) {
      return /(不要|别|禁止|不得超过|不超过|最多|至少)/.test(t) ||
        /\d+\s*(条|个|项|行|页)/.test(t);
    }
  },
  {
    id: 'stage',
    label: '阶段',
    why: '分不清要资料还是要决策',
    question: '现在到哪一步？已有什么？',
    test: function (t) {
      return /(阶段|现在|目前|正在|已经|第一步|下一步|卡在|L[1-9]\b|v[0-9]\b)/.test(t);
    }
  }
];

/** Signals that the sentence is still a topic, not a task. */
var TOPIC_SIGNALS = [
  {
    test: function (t) { return /^(关于)?[^，。；]{0,10}(方法|方法论|框架|理论|模型|体系)/.test(t); },
    note: '以方法/框架名开头 = 主题式'
  },
  {
    test: function (t) {
      if (/(等相关|相关方法|各种方法|介绍一下|讲讲|聊聊)/.test(t)) return true;
      // "不要综述" is a boundary, not a topic signal — negation wins.
      return /综述/.test(t) && !/(不要|别|禁止|不做|无需|不用)[^，。；]{0,6}综述/.test(t);
    },
    note: '出现“相关/综述/讲讲” = 没有边界'
  },
  {
    test: function (t) { return /目的是.{0,12}(提升|沉淀|协作|赋能|降本)/.test(t); },
    note: '目的是抽象收益 = 没有可判定产物'
  },
  {
    test: function (t) { return /[?？]$|吗$|呢$/.test(t) && !/(给我|输出|产出|生成)/.test(t); },
    note: '以疑问结尾但没有交付形状'
  }
];

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

function diagnose(text) {
  var src = String(text == null ? '' : text);
  var trimmed = src.trim();
  var slots = SLOT_DEFS.map(function (def) {
    var present = trimmed.length > 0 && def.test(trimmed);
    return {
      id: def.id,
      label: def.label,
      present: present,
      why: def.why,
      question: def.question
    };
  });

  var missing = slots.filter(function (s) { return !s.present; }).map(function (s) { return s.id; });
  var score = slots.length - missing.length;

  var topics = TOPIC_SIGNALS.filter(function (sig) { return sig.test(trimmed); });
  var verdict = score >= 5 ? 'process' : score >= 3 ? 'mixed' : 'topic';

  return {
    text: trimmed,
    chars: trimmed.length,
    slots: slots,
    missing: missing,
    score: score,
    verdict: verdict,
    topicSignals: topics.map(function (t) { return t.note; }),
    /** Extra hard gate: a criterion must survive the reject-test. */
    criterionUsable: verdict !== 'topic' ? hasRejectableCriterion(trimmed) : false
  };
}

/**
 * The one check that matters: can this criterion reject an unacceptable answer?
 * Heuristic proxy — the sentence must name an action AND a produced artifact,
 * not an adjective.
 */
function hasRejectableCriterion(text) {
  var hasAction = /(落到|改写|判定|判掉|验证|对照|映射|抽取|编译)/.test(text);
  var hasArtifact = /(一条|一对|一行|一列|before|after|条件|字段|样例|实例)/.test(text);
  var adjectiveOnly = /(有深度|系统|全面|完整|有价值|可操作|高质量)/.test(text) && !hasAction;
  return hasAction && hasArtifact && !adjectiveOnly;
}

/** Cheap extraction: keep the user's own words for the slots they did fill. */
function fragmentFor(text, id) {
  var patterns = {
    scene: /((?:我|我们)(?:在|正在)(?:做|开发|设计)[^，。；]{0,40})/,
    stage: /((?:现在|目前)[^，。；]{0,30}|L[1-9][^，。；]{0,20})/,
    shape: /((?:给我|输出|产出|生成)[^，。；]{0,60})/,
    material: /((?:材料|路径)[^，。；]{0,40}|@\S+)/,
    criterion: /((?:判据|验收标准|验收|合格线)[^，。；]{0,40})/,
    boundary: /((?:不要|别|禁止|不超过|最多)[^。；]{0,60})/
  };
  var hit = patterns[id] ? text.match(patterns[id]) : null;
  if (!hit) return null;
  var frag = hit[0].trim();
  if (id === 'stage') frag = frag.replace(/^(现在|目前)/, '').replace(/^阶段(是|：|:)\s*/, '');
  return frag;
}

function rewrite(text, diagnosis) {
  var diag = diagnosis || diagnose(text);
  var filled = {};
  var gaps = [];

  diag.slots.forEach(function (slot) {
    if (slot.present) {
      var frag = fragmentFor(diag.text, slot.id);
      filled[slot.id] = frag || '（沿用你原话）';
    } else {
      filled[slot.id] = '____';
      gaps.push({ id: slot.id, label: slot.label, question: slot.question, why: slot.why });
    }
  });

  var shapeLine = /[/／]|列[：:]/.test(filled.shape) && filled.shape !== '____'
    ? filled.shape
    : filled.shape + '，列：____ / ____ / ____';

  var boundaryLine = filled.boundary === '____'
    ? '____；不超过 ____ 条'
    : (/不超过|最多|\d+\s*条/.test(filled.boundary) ? filled.boundary : filled.boundary + '；不超过 ____ 条');

  var lines = [
    '【场景】' + filled.scene + '；阶段：' + filled.stage + '。',
    '【交付】' + shapeLine + '。',
    '【判据】' + filled.criterion + '（要能判掉一条不合格的；交不出的直接剔除）。',
    '【材料】' + filled.material + '。读不到就先问我，不要用通用知识补。',
    '【边界】' + boundaryLine + '；不确定的标「待确认」。'
  ];

  var notes = [];
  if (diag.verdict === 'topic') {
    notes.push('这一版仍是主题式：六格里只填了 ' + diag.score + ' 格，模型只能用篇幅补剩下的。');
  }
  if (!diag.slots.find(function (s) { return s.id === 'criterion'; }).present) {
    notes.push('判据是唯一不能猜的格：它可以被抄进模板，但不能被模型替你编。');
  }
  if (diag.topicSignals.length > 0) {
    notes.push('触发了 ' + diag.topicSignals.length + ' 条主题式信号：' + diag.topicSignals.join('；') + '。');
  }

  return {
    skeleton: lines.join('\n'),
    filled: filled,
    gaps: gaps,
    notes: notes,
    /** Ranked: ask the highest-leverage gap first, never all six. */
    askFirst: gaps.slice(0, 2)
  };
}

var api = {
  SLOT_DEFS: SLOT_DEFS,
  diagnose: diagnose,
  rewrite: rewrite,
  hasRejectableCriterion: hasRejectableCriterion
};

module.exports = api;


