// ─────────── DATA ───────────
const STORAGE_KEY = 'rukaLab_v2';
let state = {
  shadowing: [],  // [{date:'YYYY-MM-DD', speaker:'Emma'|'Kyla', done:true}]
  recordings: [], // [{id, date:'YYYY-MM-DD', type:'abstract'|'economics', topic}]
  drillCorrect: 0,
  drillTotal: 0,
  currentQ: 0,
  qOrder: [],
  answered: [], // {index, correct}[]
};

function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch(e) {}
}
function load() {
  try {
    const d = localStorage.getItem(STORAGE_KEY);
    if (d) state = {...state, ...JSON.parse(d)};
  } catch(e) {}
}

// ─────────── UTILITIES ───────────
function today() {
  return new Date().toISOString().slice(0,10);
}
function weekStart(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay(); // 0=Sun
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  const mon = new Date(d.setDate(diff));
  return mon.toISOString().slice(0,10);
}
function datesOfWeek(wStart) {
  const dates = [];
  const d = new Date(wStart + 'T00:00:00');
  for (let i=0;i<7;i++) {
    dates.push(new Date(d).toISOString().slice(0,10));
    d.setDate(d.getDate()+1);
  }
  return dates;
}
const DAY_LABELS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

// ─────────── TABS ───────────
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
    document.querySelectorAll('.section').forEach(s=>s.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-'+btn.dataset.tab).classList.add('active');
    if (btn.dataset.tab === 'drill') renderDrill();
  });
});

// ─────────── HEADER / WEEK BAR ───────────
function renderWeekBar() {
  const ws = weekStart(today());
  const dates = datesOfWeek(ws);
  const weekShadow = state.shadowing.filter(s => dates.includes(s.date) && s.done);
  const weekRec = state.recordings.filter(r => dates.includes(r.date));
  const streak = calcStreak();
  const bar = document.getElementById('weekBar');
  bar.innerHTML = `
    <span class="week-pill rec"><span class="dot"></span>${weekRec.length}/5 recordings</span>
    <span class="week-pill shadow"><span class="dot"></span>${weekShadow.length}/7 shadowing days</span>
    ${streak>1?`<span class="week-pill streak">🔥 ${streak}-day streak</span>`:''}
  `;
}
function calcStreak() {
  let s = 0; const td = today();
  for (let i=0;i<30;i++) {
    const d = new Date(td+'T00:00:00'); d.setDate(d.getDate()-i);
    const ds = d.toISOString().slice(0,10);
    if (state.shadowing.find(x=>x.date===ds&&x.done)) s++; else if(i>0) break;
  }
  return s;
}

// ─────────── DAILY / SHADOWING ───────────
function getSuggestedSpeaker() {
  const sorted = [...state.shadowing].filter(s=>s.done).sort((a,b)=>b.date.localeCompare(a.date));
  if (!sorted.length) return 'Emma';
  return sorted[0].speaker === 'Emma' ? 'Kyla' : 'Emma';
}
function selectSpeaker(name) {
  document.getElementById('emmaBtn').classList.toggle('active', name==='Emma');
  document.getElementById('kylaBtn').classList.toggle('active', name==='Kyla');
  state._selectedSpeaker = name;
}
function markShadowingDone() {
  const td = today();
  const speaker = state._selectedSpeaker || getSuggestedSpeaker();
  const existing = state.shadowing.findIndex(s=>s.date===td);
  if (existing>=0) { state.shadowing[existing].done=true; state.shadowing[existing].speaker=speaker; }
  else state.shadowing.push({date:td, speaker, done:true});
  save();
  renderDaily();
  renderWeekBar();
}
function renderDaily() {
  const td = today();
  const suggested = getSuggestedSpeaker();
  const todayShadow = state.shadowing.find(s=>s.date===td&&s.done);
  const selectedSpeaker = state._selectedSpeaker || suggested;
  selectSpeaker(selectedSpeaker);
  const btn = document.getElementById('shadowDoneBtn');
  if (todayShadow) {
    btn.textContent = `✓ Done — shadowed with ${todayShadow.speaker} today`;
    btn.classList.add('is-done');
    selectSpeaker(todayShadow.speaker);
  } else {
    btn.textContent = `✓ Mark today's shadowing as done`;
    btn.classList.remove('is-done');
  }
  renderWeekGrid();
}
function renderWeekGrid() {
  const ws = weekStart(today());
  const dates = datesOfWeek(ws);
  const grid = document.getElementById('weekGrid');
  grid.innerHTML = dates.map((d,i) => {
    const s = state.shadowing.find(x=>x.date===d&&x.done);
    const isToday = d===today();
    let cls = 'day-cell';
    if (s?.speaker==='Emma') cls+=' emma-done';
    else if (s?.speaker==='Kyla') cls+=' kyla-done';
    if (isToday) cls+=' today-marker';
    const icon = s?.speaker==='Emma'?'E':s?.speaker==='Kyla'?'K':'·';
    return `<div class="${cls}"><span class="day-label">${DAY_LABELS[i]}</span><span>${icon}</span></div>`;
  }).join('');
}

// ─────────── RECORDINGS ───────────
const ABSTRACT_TOPICS = [
  'the nature of consciousness','free will and determinism','the ethics of AI','what makes a life meaningful',
  'the paradox of choice','identity and change over time','the role of failure in growth',
  'whether truth is objective','the ethics of privacy','solitude and creativity',
  'the relationship between language and thought','ambition and its costs',
  'what we owe to future generations','the limits of empathy','beauty and its value',
];
const ECON_TOPICS = [
  'why inflation is so hard to control','the future of remote work','central bank independence',
  'deglobalization trends since COVID','the housing affordability crisis','AI and labor displacement',
  'currency wars and the dollar','universal basic income — feasibility','supply chain resilience strategies',
  'the fiscal cliff in aging economies','venture capital cycles','inequality and social mobility',
  'trade deficits: are they actually bad?','the gig economy\'s long-term impact','sovereign debt crises',
];
function suggestTopic() {
  const type = document.getElementById('recType').value;
  const list = type==='abstract' ? ABSTRACT_TOPICS : ECON_TOPICS;
  const topic = list[Math.floor(Math.random()*list.length)];
  document.getElementById('recTopic').value = topic;
}
function logRecording() {
  const type = document.getElementById('recType').value;
  const topic = document.getElementById('recTopic').value.trim();
  if (!topic) { document.getElementById('recTopic').focus(); return; }
  state.recordings.push({id: Date.now(), date: today(), type, topic});
  save();
  document.getElementById('recTopic').value = '';
  renderRecordings();
  renderWeekBar();
}
function deleteRecording(id) {
  state.recordings = state.recordings.filter(r=>r.id!==id);
  save(); renderRecordings(); renderWeekBar();
}
function renderRecordings() {
  const ws = weekStart(today());
  const dates = datesOfWeek(ws);
  const weekRec = state.recordings.filter(r=>dates.includes(r.date));
  const absRecs = weekRec.filter(r=>r.type==='abstract');
  const ecoRecs = weekRec.filter(r=>r.type==='economics');

  // Build 5 slots: 2 abstract, 3 economics
  const slots = [
    {type:'abstract', idx:0}, {type:'abstract', idx:1},
    {type:'economics', idx:0}, {type:'economics', idx:1}, {type:'economics', idx:2},
  ];
  document.getElementById('recSlots').innerHTML = slots.map((slot,i) => {
    const recs = slot.type==='abstract' ? absRecs : ecoRecs;
    const rec = recs[slot.idx];
    const label = slot.type==='abstract' ? 'Abstract' : 'Economics';
    const filled = !!rec;
    return `<div class="rec-slot ${slot.type} ${filled?'filled':''}">
      <span class="slot-type">${label} ${slot.idx+1}</span>
      <span class="slot-topic">${filled ? rec.topic : 'not yet recorded'}</span>
      ${filled ? `<button class="slot-del" title="Remove" onclick="deleteRecording(${rec.id})">×</button>`:''}
    </div>`;
  }).join('');

  const total = weekRec.length; const pct = Math.round(total/5*100);
  document.getElementById('recProgressLabel').textContent = `${total} / 5 recordings this week`;
  document.getElementById('recProgressPct').textContent = `${pct}%`;
  document.getElementById('recProgFill').style.width = `${pct}%`;

  const hist = document.getElementById('recHistory');
  const sorted = [...state.recordings].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,20);
  if (!sorted.length) {
    hist.innerHTML = '<p class="empty"><span class="icon">🎙</span><p>No recordings yet.</p></p>';
  } else {
    hist.innerHTML = sorted.map(r=>`
      <div class="history-item">
        <span class="h-date">${r.date}</span>
        <span class="h-type ${r.type}">${r.type==='abstract'?'ABS':'ECO'}</span>
        <span class="h-topic">${r.topic}</span>
      </div>`).join('');
  }
}

// ─────────── PREPOSITION DRILL ───────────
const QUESTIONS = [
  // Ruka's 3 target prepositions
  {s: "Despite the difficult negotiation, she remained _____ a positive resolution.", b:"optimistic about", opts:["optimistic about","optimistic for","optimistic of","optimistic on"], ex:"'Optimistic about' is the standard collocation. We are optimistic about a situation or possibility."},
  {s: "He feels very _____ the new direction the company is taking.", b:"confident about", opts:["confident about","confident in","confident for","confident of"], ex:"Both 'confident about' and 'confident in' exist, but 'confident about' (a specific situation/decision) vs 'confident in' (a person or ability) differ subtly. Here: situation → about."},
  {s: "She has always been _____ alternative viewpoints and unconventional ideas.", b:"open-minded to", opts:["open-minded to","open-minded about","open-minded for","open-minded with"], ex:"'Open-minded to' is the correct collocation — we are open-minded to different ideas or possibilities."},
  {s: "The policy change is particularly _____ young professionals entering the job market.", b:"relevant to", opts:["relevant to","relevant for","relevant about","relevant of"], ex:"'Relevant to' — something is relevant to a topic, person, or situation."},
  {s: "The new regulation is largely _____ international trade agreements.", b:"consistent with", opts:["consistent with","consistent to","consistent about","consistent of"], ex:"'Consistent with' — something is consistent with a principle, rule, or expectation."},
  {s: "She is deeply _____ environmental causes and spends her weekends volunteering.", b:"committed to", opts:["committed to","committed about","committed for","committed with"], ex:"'Committed to' a cause, goal, or person is the standard collocation."},
  {s: "Many economists are _____ the long-term effects of quantitative easing.", b:"skeptical about", opts:["skeptical about","skeptical of","skeptical for","skeptical to"], ex:"'Skeptical about' (a specific claim or situation) and 'skeptical of' (a person or general stance) are both common. 'Skeptical about the effects' is idiomatic."},
  {s: "The minister was _____ the opposition's proposed amendments to the bill.", b:"critical of", opts:["critical of","critical about","critical to","critical for"], ex:"'Critical of' someone or something means you are disapproving of it. Don't confuse with 'critical to/for' which means essential."},
  {s: "Higher consumer spending is absolutely _____ economic recovery.", b:"critical to", opts:["critical to","critical of","critical for","critical about"], ex:"'Critical to' means essential for something. Compare: 'critical of' = disapproving; 'critical to' = essential."},
  {s: "The research findings are largely _____ the original hypothesis.", b:"consistent with", opts:["consistent with","supportive of","critical of","contrary to"], ex:"'Consistent with' means in line with or not contradicting."},
  {s: "He was completely _____ the risks involved in the new investment strategy.", b:"aware of", opts:["aware of","aware about","aware to","aware with"], ex:"'Aware of' is the only correct form — always use 'of' with aware."},
  {s: "The startup is not yet _____ turning a profit without external funding.", b:"capable of", opts:["capable of","capable to","capable for","capable in"], ex:"'Capable of' + gerund is the correct structure. Never 'capable to' + infinitive."},
  {s: "His sudden resignation was completely _____ his colleagues' expectations.", b:"contrary to", opts:["contrary to","contrary of","contrary with","contrary about"], ex:"'Contrary to' expectations, beliefs, or claims is the standard collocation."},
  {s: "The team's success is largely _____ their ability to communicate openly.", b:"attributed to", opts:["attributed to","attributed for","attributed by","attributed with"], ex:"'Attributed to' — credit or blame is attributed to a cause or person."},
  {s: "She is very _____ the way younger employees are treated in the organization.", b:"concerned about", opts:["concerned about","concerned with","concerned for","concerned in"], ex:"'Concerned about' a problem or situation; 'concerned with' a topic (meaning involved with or about). Here: worried about a specific issue → 'about'."},
  {s: "The new framework is fundamentally _____ the principles of transparency and accountability.", b:"based on", opts:["based on","based in","based upon","based around"], ex:"'Based on' is the most standard collocation. 'Based upon' is formal but correct. 'Based around' is informal and often considered incorrect in formal writing."},
  {s: "He is entirely _____ his team for motivation and direction.", b:"dependent on", opts:["dependent on","dependent of","dependent to","dependent upon"], ex:"'Dependent on' (or 'upon' formally) is always correct. Never 'dependent of.'"},
  {s: "The outcome of the talks is largely _____ the lead negotiator's flexibility.", b:"dependent on", opts:["dependent on","contingent upon","reliant upon","all of these"], ex:"All three are correct, but 'dependent on' is the most common. 'Contingent upon' and 'reliant upon' are more formal alternatives."},
  {s: "Many economists are _____ the central bank's ability to manage inflation.", b:"skeptical of", opts:["skeptical of","doubtful about","uncertain about","all are correct"], ex:"All are grammatically correct, but 'skeptical of' a person or institution's ability is idiomatic."},
  {s: "The proposal is closely _____ the European model introduced in 2018.", b:"modeled on", opts:["modeled on","modeled after","modeled from","modeled by"], ex:"Both 'modeled on' and 'modeled after' are correct. 'Modeled on' is slightly more common in British English; 'modeled after' in American English."},
];

const REF = [
  ["optimistic", "about"], ["confident", "about"], ["open-minded", "to"],
  ["aware", "of"], ["capable", "of"], ["critical (= disapproving)", "of"],
  ["critical (= essential)", "to / for"], ["committed", "to"], ["dedicated", "to"],
  ["relevant", "to"], ["consistent", "with"], ["contrary", "to"],
  ["attributed", "to"], ["concerned (= worried)", "about"], ["based", "on"],
  ["dependent", "on"], ["skeptical", "about / of"], ["enthusiastic", "about"],
  ["responsible", "for"], ["familiar", "with"],
];

let drillState = {idx:0, order:[], answered:[], correct:0, total:0};

function initDrill() {
  drillState.order = [...Array(QUESTIONS.length).keys()].sort(()=>Math.random()-.5);
  drillState.idx = 0;
  drillState.answered = [];
  drillState.correct = 0;
  drillState.total = 0;
}
function renderDrill() {
  if (!drillState.order.length) initDrill();
  renderQuestion();
  renderRef();
  updateDrillScore();
}
function renderQuestion() {
  const qi = drillState.order[drillState.idx];
  const q = QUESTIONS[qi];
  const qNum = document.getElementById('qNum');
  qNum.textContent = `Question ${drillState.idx+1} of ${QUESTIONS.length}`;
  const sentence = document.getElementById('qSentence');
  sentence.innerHTML = q.s.replace('_____','<span class="blank" id="blankSpan">_____</span>');
  const opts = document.getElementById('qOptions');
  const shuffled = [...q.opts].sort(()=>Math.random()-.5);
  opts.innerHTML = shuffled.map(opt=>
    `<button class="option-btn" onclick="answer('${opt.replace(/'/g,"\\'")}','${q.b.replace(/'/g,"\\'")}',${qi})">${opt}</button>`
  ).join('');
  document.getElementById('qExplanation').classList.remove('visible');
  document.getElementById('nextBtn').style.display = 'none';
  renderProgress();
}
function answer(chosen, correct, qi) {
  const isCorrect = chosen===correct;
  document.querySelectorAll('.option-btn').forEach(btn=>{
    btn.disabled = true;
    if (btn.textContent===chosen) btn.classList.add(isCorrect?'correct':'wrong');
    if (btn.textContent===correct && !isCorrect) btn.classList.add('correct');
  });
  const blank = document.getElementById('blankSpan');
  if (blank) { blank.textContent=chosen; blank.className='filled-blank '+(isCorrect?'correct':'wrong'); }
  const ex = document.getElementById('qExplanation');
  ex.textContent = QUESTIONS[qi].ex;
  ex.classList.add('visible');
  drillState.answered.push({idx:drillState.idx, correct:isCorrect});
  if (isCorrect) drillState.correct++;
  drillState.total++;
  document.getElementById('nextBtn').style.display = 'inline-flex';
  renderProgress();
  updateDrillScore();
}
function nextQuestion() {
  drillState.idx = (drillState.idx+1) % QUESTIONS.length;
  renderQuestion();
}
function restartDrill() {
  drillState.answered=[]; drillState.correct=0; drillState.total=0; drillState.idx=0;
  renderDrill();
}
function shuffleDrill() {
  drillState.order = [...drillState.order].sort(()=>Math.random()-.5);
  restartDrill();
}
function updateDrillScore() {
  document.getElementById('drillCorrect').textContent = drillState.correct;
  document.getElementById('drillTotal').textContent = drillState.total;
}
function renderProgress() {
  const pg = document.getElementById('qProgress');
  pg.innerHTML = drillState.order.map((_,i) => {
    let cls = 'q-dot';
    const a = drillState.answered.find(x=>x.idx===i);
    if (a) cls+=a.correct?' answered correct':' answered wrong';
    else if (i===drillState.idx) cls+=' current';
    return `<div class="${cls}"></div>`;
  }).join('');
}
function renderRef() {
  document.getElementById('refTable').innerHTML = REF.map(([adj,prep])=>
    `<div style="display:flex;gap:8px;align-items:center;">
      <span style="font-weight:600;min-width:200px;color:var(--text)">${adj}</span>
      <span style="font-family:'JetBrains Mono',monospace;color:var(--accent);font-size:12px;background:var(--accent-lt);padding:2px 8px;border-radius:4px;">${prep}</span>
    </div>`
  ).join('');
}

// ─────────── PRONOUN CHECKER ───────────
function runCheck() {
  const text = document.getElementById('checkerInput').value.trim();
  if (!text) return;
  const result = analyzePronouns(text);
  renderCheckerResult(result, text);
}
function clearCheck() {
  document.getElementById('checkerInput').value = '';
  document.getElementById('checkerResult').style.display = 'none';
}

function analyzePronouns(text) {
  // Split into sentences
  const sentenceRe = /[^.!?]+[.!?]+/g;
  const sentences = text.match(sentenceRe) || [text];

  const youRe = /\b(you|your|you're|you've|yourself|yourselves)\b/gi;
  const weRe  = /\b(we|our|we're|we've|ourselves|us)\b/gi;

  let totalYou=0, totalWe=0;
  const analyzed = sentences.map(s => {
    const yM = [...s.matchAll(youRe)];
    const wM = [...s.matchAll(weRe)];
    totalYou+=yM.length; totalWe+=wM.length;
    return {sentence:s.trim(), youCount:yM.length, weCount:wM.length};
  });

  const dominant = totalYou>=totalWe ? 'you' : 'we';
  const shifts = analyzed.filter(s=> dominant==='you' ? s.weCount>0 : s.youCount>0);

  // Highlight: shifts get red, others get their color
  const shiftSentences = new Set(shifts.map(s=>s.sentence));
  let highlighted = text;
  // We need to mark which sentences contain shifts
  // Simple approach: highlight you/we with color, shift sentences outlined
  highlighted = highlighted
    .replace(/\b(you|your|you're|you've|yourself|yourselves)\b/gi, '<mark class="you-mark">$1</mark>')
    .replace(/\b(we|our|we're|we've|ourselves|us)\b/gi, '<mark class="we-mark">$1</mark>');

  return {analyzed, dominant, totalYou, totalWe, shifts, highlighted};
}

function renderCheckerResult({analyzed, dominant, totalYou, totalWe, shifts, highlighted}) {
  const res = document.getElementById('checkerResult');
  res.style.display = 'block';
  const shiftItems = shifts.map(s=>
    `<div class="shift-item">
      <strong>⚠ Shift detected:</strong> "${s.sentence.substring(0,120)}${s.sentence.length>120?'…':''}"<br>
      <span style="font-size:12px;margin-top:4px;display:block;">
        This sentence uses <b>${dominant==='you'?'we/our':'you/your'}</b> while the dominant pronoun in this text is <b>${dominant}</b>.
      </span>
    </div>`).join('');

  res.innerHTML = `
    <div class="card">
      <div class="card-title">📊 Analysis</div>
      <div class="result-stats">
        <span class="stat-chip you">you/your: ${totalYou}</span>
        <span class="stat-chip we">we/our: ${totalWe}</span>
        ${shifts.length>0?`<span class="stat-chip shifts">⚠ ${shifts.length} shift${shifts.length>1?'s':''}</span>`:'<span class="stat-chip" style="background:var(--green-lt);color:var(--green)">✓ Consistent</span>'}
      </div>
      <div style="font-size:13px;color:var(--text2);margin-bottom:14px;">
        Dominant pronoun: <strong style="color:var(--text)">${dominant}</strong>
        ${shifts.length>0?' — some sentences deviate from this.':' — used consistently throughout.'}
      </div>
      <div class="highlighted-text">${highlighted}</div>
      <div class="legend">
        <span><mark class="you-mark">you</mark> you / your</span>
        <span><mark class="we-mark">we</mark> we / our</span>
      </div>
      ${shifts.length>0?`<div class="shifts-list" style="margin-top:16px;"><h4 style="font-size:.9rem;margin-bottom:8px;">Shifts to review:</h4>${shiftItems}</div>`:''}
    </div>`;
}

// ─────────── INIT ───────────
load();
renderWeekBar();
renderDaily();
renderRecordings();
initDrill();

// ─────────── PWA SERVICE WORKER ───────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js').catch(() => {});
  });
}
