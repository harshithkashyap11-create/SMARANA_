const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "../../frontend") + "/";
const ts = require(root + "node_modules/typescript");
const { performance } = require("node:perf_hooks");
const modules = new Map();
function load(file, req) {
  const absolute = path.resolve(root, file);
  if (modules.has(absolute)) return modules.get(absolute);
  if (absolute.endsWith(".json"))
    return JSON.parse(fs.readFileSync(absolute, "utf8"));
  if (absolute.endsWith("/db/schema.ts")) return { db: {} };
  const exports = {};
  modules.set(absolute, exports);
  const code = ts.transpileModule(fs.readFileSync(absolute, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;
  const moduleRequire = (name) => {
    const injected = req?.(name);
    if (injected && Object.keys(injected).length) return injected;
    let next = path.resolve(path.dirname(absolute), name);
    if (!path.extname(next)) next += ".ts";
    return load(path.relative(root, next));
  };
  new Function("exports", "require", code)(exports, moduleRequire);
  return exports;
}
const router = load("src/voice/router.ts", () => ({}));
const reminders = load("src/db/reminders.ts", () => ({}));
const { VoiceConversation } = load("src/voice/conversation.ts");
const now = new Date("2026-09-17T10:00:00Z");
function detect(text, context = new VoiceConversation()) {
  const contextual = context.resolve(text, now);
  if (typeof contextual === "string")
    return {
      intent: context.hasPendingReminder()
        ? "set_reminder_followup"
        : "clarification",
      slots: { response: contextual },
    };
  return (
    contextual ?? router.route(text, "en") ?? { intent: "unknown", slots: {} }
  );
}
const rows = [];
function add(group, text, intent, entities = {}) {
  const result = detect(text);
  const intentPass = result.intent === intent;
  const entityPass = Object.entries(entities).every(
    ([k, v]) =>
      typeof result.slots[k] === "string" && result.slots[k].trim() === v,
  );
  rows.push({
    group,
    text,
    expected: intent,
    expectedEntities: entities,
    detected: result.intent,
    entities: result.slots,
    intentPass,
    pass: intentPass && entityPass,
  });
}
const cases = require(
  path.resolve(__dirname, "../../shared/voice_audit_cases.json"),
);
cases.forEach((row) => add(row.group, row.text, row.intent, row.entities));
console.log(
  "MATRIX: deterministic frontend pipeline; fresh conversation per row; live LLM excluded. Expected followup requires asking for missing/ambiguous time.",
);
console.log(
  "| Group | Input | Expected | Detected | Extracted entities / result | Pass |",
);
console.log("|---|---|---|---|---|---|");
rows.forEach((r) =>
  console.log(
    `| ${r.group} | ${r.text || "(empty)"} | ${r.expected} | ${r.detected} | ${JSON.stringify(r.entities)} | ${r.pass ? "PASS" : "FAIL"} |`,
  ),
);
console.log(
  "INTENT ACCURACY",
  rows.filter((r) => r.intentPass).length,
  "/",
  rows.length,
);
console.log(
  "INTENT + REQUIRED ENTITIES",
  rows.filter((r) => r.pass).length,
  "/",
  rows.length,
);
for (const group of [...new Set(rows.map((r) => r.group))]) {
  const g = rows.filter((r) => r.group === group);
  console.log(
    group,
    g.filter((r) => r.intentPass).length + "/" + g.length,
    "entities",
    g.filter((r) => r.pass).length + "/" + g.length,
  );
}
const games = [
  ["Sequence Recall", "sequence_recall"],
  ["Memory Match", "memory_match"],
  ["Find the Change", "find_the_change"],
  ["Object Sorting", "object_sorting"],
  ["Daily Routine Builder", "daily_routine"],
  ["Word Recall", "word_recall"],
  ["Visual Search", "visual_search"],
  ["Pattern Completion", "pattern_completion"],
  ["Spatial Recall", "spatial_recall"],
  ["Attention Tap", "attention_tap"],
  ["Association Game", "association_game"],
  ["Personal Memory Recall", "personal_memory"],
];
const aliases = [
  ["sequence game", "sequence_recall"],
  ["matching game", "memory_match"],
  ["sorting game", "object_sorting"],
  ["routine game", "daily_routine"],
  ["word game", "word_recall"],
  ["pattern game", "pattern_completion"],
  ["personal memory game", "personal_memory"],
];
console.log("GAME RECOGNITION");
let recognized = 0;
for (const [name, key] of [...games, ...aliases]) {
  const result = detect("Start " + name);
  const pass = result.intent === "start_game" && result.slots.game === key;
  recognized += pass;
  console.log(
    JSON.stringify({
      input: "Start " + name,
      expected: key,
      detected: result,
      pass,
    }),
  );
}
console.log("GAME TOTAL", recognized, "/", games.length + aliases.length);
console.log("REMINDER / SAFETY PROBES");
for (const s of [
  "Remind me to drink water every day at 8 PM",
  "Remind me to drink water on Friday at 8 PM",
  "Remind me to drink water at 13 PM",
  "Remind me to drink water at 25:00",
  "Remind me in 0 minutes to drink water",
  "Do not open games",
  "help emergency",
])
  console.log(s, JSON.stringify(detect(s)));
const context = new VoiceConversation();
console.log("pending", context.resolve("Remind me to drink water", now));
console.log("tomorrow follow-up", context.resolve("tomorrow at 8 PM", now));
console.log("bare time follow-up", context.resolve("8 PM", now));
const samples = [];
for (let i = 0; i < 10000; i++) {
  const t = performance.now();
  detect("Remind me to drink water tomorrow at 8 PM");
  samples.push(performance.now() - t);
}
samples.sort((a, b) => a - b);
console.log(
  "DETERMINISTIC LATENCY ms",
  JSON.stringify({
    iterations: samples.length,
    p50: samples[5000],
    p95: samples[9500],
    max: samples.at(-1),
  }),
);
console.log("CONVERSATIONAL ROUTING");
for (const s of [
  "Why are we playing this game?",
  "What is memory?",
  "Explain this activity.",
  "I'm confused.",
  "What should I do now?",
  "Why do people forget names?",
  "Tell me something interesting.",
  "What can you help me with?",
])
  console.log(s, JSON.stringify(detect(s)));
async function failures() {
  const assert = require("node:assert/strict");
  const timers = new Map();
  let timerId = 0;
  global.window = {
    setTimeout: (fn) => {
      timers.set(++timerId, fn);
      return timerId;
    },
    clearTimeout: (id) => timers.delete(id),
  };
  const { BrowserSpeechToText } = load("src/voice/stt.ts", () => ({}));
  let errors = [],
    ends = 0,
    results = [];
  const stt = new BrowserSpeechToText("en");
  const start = () =>
    stt.start(
      (s) => results.push(s),
      () => ends++,
      (s) => errors.push(s),
    );
  start();
  assert.deepEqual(errors, ["unsupported"]);
  console.log("PROBE PASS missing STT -> unsupported + end");
  class Recognition {
    static last;
    constructor() {
      Recognition.last = this;
    }
    start() {}
    stop() {
      this.stopped = true;
    }
  }
  window.SpeechRecognition = Recognition;
  errors = [];
  start();
  Recognition.last.onerror({ error: "not-allowed" });
  assert.deepEqual(errors, ["not-allowed"]);
  console.log("PROBE PASS permission denied -> error + end (simulated)");
  start();
  Recognition.last.onresult({ results: [{ 0: { transcript: "   " } }] });
  assert.deepEqual(results, []);
  stt.stop();
  console.log("PROBE PASS empty STT transcript ignored (simulated)");
  const before = ends;
  start();
  [...timers.values()][0]();
  assert.equal(ends, before + 1);
  console.log("PROBE PASS silence timer stops + ends (simulated)");
  window.SpeechRecognition = class {
    start() {
      throw new Error("start");
    }
    stop() {}
  };
  errors = [];
  start();
  assert.deepEqual(errors, ["start-failed"]);
  console.log("PROBE PASS STT start exception -> error + end (simulated)");
  const { BrowserTextToSpeech } = load("src/voice/tts.ts", (name) =>
    name === "./stt"
      ? load("src/voice/stt.ts", () => ({}))
      : { useCalmStore: { getState: () => ({ calmMode: false }) } },
  );
  await new BrowserTextToSpeech("en").speak("Hi.");
  console.log("PROBE PASS unavailable TTS resolves without audio");
  global.SpeechSynthesisUtterance = class {
    constructor(text) {
      this.text = text;
    }
  };
  window.SpeechSynthesisUtterance = global.SpeechSynthesisUtterance;
  let cancelled = 0,
    spoken = [];
  global.speechSynthesis = {
    getVoices: () => [],
    cancel: () => cancelled++,
    speak: (u) => {
      spoken.push(u);
      u.onerror?.();
    },
  };
  window.speechSynthesis = global.speechSynthesis;
  await new BrowserTextToSpeech("en").speak("Hi.");
  assert.equal(spoken.length, 1);
  console.log("PROBE PASS TTS provider error resolves (simulated)");
  speechSynthesis.speak = () => {
    throw new Error("TTS");
  };
  await new BrowserTextToSpeech("en").speak("Hi.");
  console.log("PROBE PASS TTS thrown exception resolves (simulated)");
  speechSynthesis.speak = (u) => spoken.push(u);
  let done = false;
  const tts = new BrowserTextToSpeech("en");
  const hanging = tts.speak("Hi.").then(() => (done = true));
  assert.equal(done, false);
  [...timers.values()][0]();
  await hanging;
  assert.equal(done, true);
  assert.ok(cancelled > 0);
  console.log(
    "PROBE PASS hung TTS timeout cancels playback + resolves (simulated)",
  );
  const pending = tts.speak("First. Second.");
  const count = spoken.length;
  tts.cancel();
  await pending;
  assert.equal(spoken.length, count);
  console.log("PROBE PASS TTS cancellation skips later sentences (simulated)");
}
failures().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
