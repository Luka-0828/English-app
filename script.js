// ─────────── DATA ───────────
const STORAGE_KEY = 'rukaLab_v2';
let state = {
  shadowing: [],   // [{date:'YYYY-MM-DD', speaker:'Emma'|'Kyla', done:true}]
  recordings: [],  // [{id, date:'YYYY-MM-DD', type:'abstract'|'random', topic}]
  phrases: [],     // [{id, text, note, addedDate, lastReviewed, reviewCount}]
  reflections: [], // [{id, recordingId, date, tags:[], note, phrase}]
  onboarded: false,
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
function switchTab(name) {
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.toggle('active', b.dataset.tab===name));
  document.querySelectorAll('.section').forEach(s=>s.classList.remove('active'));
  const section = document.getElementById('tab-'+name);
  if (section) section.classList.add('active');
  if (name === 'drill') renderDrill();
}
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
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
  'whether happiness can be taught','the ethics of lying to protect someone','what makes work meaningful',
  'the value of tradition versus progress','whether people can truly change','the cost of always being busy',
  'the ethics of eating animals','what makes a good leader','whether privacy still exists online',
  'the meaning of home','the role of luck in success','whether art needs a message',
  'the ethics of surveillance for safety','what forgiveness really means','the value of boredom',
  'whether competition brings out the best in people','the limits of self-improvement',
  'what makes an apology genuine','the ethics of keeping secrets','whether money can buy time',
  'the value of doing nothing','what makes a story worth telling','the ethics of curiosity',
  'whether nostalgia helps or hurts us','the meaning of independence','what makes criticism useful',
  'the ethics of ambition at any cost','whether silence is a form of communication',
  'the value of imperfection','what makes someone trustworthy','the ethics of second chances',
  'whether tradition should ever be questioned','the meaning of belonging','what makes a risk worth taking',
];
const RANDOM_TOPICS = [
  'why inflation is so hard to control','the future of remote work','central bank independence',
  'deglobalization trends in recent years','the housing affordability crisis','AI and labor displacement',
  'currency wars and exchange rates','universal basic income — feasibility','supply chain resilience strategies',
  'the fiscal cliff in aging economies','venture capital cycles','inequality and social mobility',
  'trade deficits: are they actually bad?','the gig economy\'s long-term impact','sovereign debt crises',
  'whether space tourism is worth the cost','the future of self-driving cars','how social media changes friendships',
  'the pros and cons of a four-day work week','whether cities are becoming too crowded',
  'the impact of streaming on how we watch movies','why some languages are dying out',
  'the ethics of gene editing','whether robots will replace teachers','the future of physical cash',
  'how tourism changes local cultures','the rise of plant-based diets','why some sports become more popular than others',
  'the impact of video games on creativity','whether remote learning works as well as classrooms',
  'the future of grocery shopping','how weather affects mood and productivity','the psychology of procrastination',
  'why people collect things','the impact of noise pollution in cities','whether nuclear energy deserves a comeback',
  'the future of air travel','how fashion trends spread','the ethics of animal testing',
  'why some cities are walkable and others are not','the impact of fast fashion on the environment',
  'whether libraries are still relevant','the psychology of nostalgia in marketing',
  'how misinformation spreads online','the future of public transportation','why board games are making a comeback',
  'the impact of artificial light on sleep','whether a cashless society is inevitable',
  'the ethics of influencer marketing to children','how cities can prepare for extreme weather',
  'the future of office buildings after remote work','why some traditions survive and others fade',
  'the psychology of minimalism','whether space exploration budgets are justified',
];
function suggestTopic() {
  const type = document.getElementById('recType').value;
  const list = type==='abstract' ? ABSTRACT_TOPICS : RANDOM_TOPICS;
  const topic = list[Math.floor(Math.random()*list.length)];
  document.getElementById('recTopic').value = topic;
}
let lastLoggedRecordingId = null;
function logRecording() {
  const type = document.getElementById('recType').value;
  const topic = document.getElementById('recTopic').value.trim();
  if (!topic) { document.getElementById('recTopic').focus(); return; }
  const id = Date.now();
  state.recordings.push({id, date: today(), type, topic});
  save();
  document.getElementById('recTopic').value = '';
  renderRecordings();
  renderWeekBar();
  lastLoggedRecordingId = id;
  openReflectPanel(id);
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
  const randRecs = weekRec.filter(r=>r.type==='random');

  // Build 5 slots: 3 abstract, 2 random — roughly half and half
  const slots = [
    {type:'abstract', idx:0}, {type:'abstract', idx:1}, {type:'abstract', idx:2},
    {type:'random', idx:0}, {type:'random', idx:1},
  ];
  document.getElementById('recSlots').innerHTML = slots.map((slot,i) => {
    const recs = slot.type==='abstract' ? absRecs : randRecs;
    const rec = recs[slot.idx];
    const label = slot.type==='abstract' ? 'Abstract' : 'Random';
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
        <span class="h-type ${r.type}">${r.type==='abstract'?'ABS':'RND'}</span>
        <span class="h-topic">${r.topic}</span>
      </div>`).join('');
  }
  renderInsights();
}

// ─────────── PHRASE BANK ───────────
function addPhrase() {
  const textEl = document.getElementById('phraseText');
  const noteEl = document.getElementById('phraseNote');
  const text = textEl.value.trim();
  if (!text) { textEl.focus(); return; }
  const note = noteEl.value.trim();
  state.phrases.push({ id: Date.now(), text, note, addedDate: today(), lastReviewed: null, reviewCount: 0 });
  save();
  textEl.value = '';
  noteEl.value = '';
  renderPhrases();
  renderPhraseReminder();
}
function deletePhrase(id) {
  state.phrases = state.phrases.filter(p=>p.id!==id);
  save(); renderPhrases(); renderPhraseReminder();
}
function markPhraseReviewed(id) {
  const p = state.phrases.find(x=>x.id===id);
  if (!p) return;
  p.lastReviewed = today();
  p.reviewCount = (p.reviewCount||0) + 1;
  save(); renderPhrases(); renderPhraseReminder();
}
function quickAddPhrase(text) {
  if (state.phrases.some(p=>p.text.toLowerCase()===text.toLowerCase())) return;
  state.phrases.push({ id: Date.now(), text, note: '', addedDate: today(), lastReviewed: null, reviewCount: 0 });
  save();
  renderPhrases();
  renderPhraseReminder();
}
function renderPhrases() {
  const list = document.getElementById('phraseList');
  if (!list) return;
  if (!state.phrases.length) {
    list.innerHTML = '<p class="empty"><span class="icon">📝</span><p>No phrases saved yet — add one above.</p></p>';
    return;
  }
  const sorted = [...state.phrases].sort((a,b)=>b.addedDate.localeCompare(a.addedDate));
  list.innerHTML = sorted.map(p => `
    <div class="phrase-item">
      <div class="phrase-main">
        <div class="phrase-text">${p.text}</div>
        ${p.note ? `<div class="phrase-note">${p.note}</div>` : ''}
        <div class="phrase-meta">Added ${p.addedDate}${p.reviewCount ? ` · reviewed ${p.reviewCount}×` : ' · not reviewed yet'}</div>
      </div>
      <div class="phrase-actions">
        <button class="btn btn-secondary btn-sm" onclick="markPhraseReviewed(${p.id})">✓ Reviewed</button>
        <button class="slot-del" title="Delete" onclick="deletePhrase(${p.id})">×</button>
      </div>
    </div>`).join('');
}
function getPhraseOfDay() {
  if (!state.phrases.length) return null;
  return [...state.phrases].sort((a,b) => (a.lastReviewed||'').localeCompare(b.lastReviewed||''))[0];
}
function renderPhraseReminder() {
  const card = document.getElementById('phraseReminderCard');
  if (!card) return;
  const p = getPhraseOfDay();
  if (!p) {
    card.innerHTML = `
      <div class="card-title"><span class="icon">💡</span> Phrase to Review</div>
      <p style="font-size:13px;color:var(--text2);">You haven't saved any phrases yet. Add one on the <b style="color:var(--text)">Phrases</b> tab whenever you learn something new.</p>
      <button class="btn btn-secondary btn-sm" style="margin-top:8px;" onclick="switchTab('phrases')">📝 Go to Phrases</button>`;
    return;
  }
  card.innerHTML = `
    <div class="card-title"><span class="icon">💡</span> Phrase to Review</div>
    <div class="phrase-reminder-text">${p.text}</div>
    ${p.note ? `<div class="phrase-note" style="margin-top:4px;">${p.note}</div>` : ''}
    <button class="btn btn-primary btn-sm" style="margin-top:12px;" onclick="markPhraseReviewed(${p.id})">✓ I used this phrase today</button>`;
}

// ─────────── REFLECTION & NATIVE PHRASING ───────────
const CHALLENGE_TAGS = ['Grammar','Vocabulary','Fluency','Pronunciation','Word retrieval','Other'];
let reflectionTags = new Set();
const NATIVE_ALTS = [
  { match: /\bi think that\b/i, natives: ["I'd say that…", "It seems to me that…"], tip: "'I think that' is correct but overused — natives often vary it." },
  { match: /\bin my opinion\b/i, natives: ["As I see it, …", "From where I stand, …"], tip: "'In my opinion' is fine, but these sound less textbook-y." },
  { match: /\bit is difficult to\b/i, natives: ["It's tricky to…", "It's no easy task to…"], tip: "Contracted and more conversational." },
  { match: /\ba lot of people think\b/i, natives: ["Plenty of people would argue…", "There's a common view that…"], tip: "More natural in spoken discussion." },
  { match: /\bi want to say that\b/i, natives: ["What I'm getting at is…", "My point is…"], tip: "Sounds more like natural speech than 'I want to say'." },
  { match: /\bvery important\b/i, natives: ["crucial", "a big deal", "pretty significant"], tip: "'Very important' is correct but plain — natives often use a single stronger word." },
  { match: /\bi don'?t know how to explain\b/i, natives: ["It's hard to put into words, but…", "Bear with me while I think this through…"], tip: "A natural filler that buys you time." },
  { match: /\bfor example\b/i, natives: ["say, …", "take … as an example", "case in point: …"], tip: "Good variation if you use 'for example' a lot." },
  { match: /\bi agree with\b/i, natives: ["I'm with … on this", "That lines up with how I see it"], tip: "Less formal, more conversational agreement." },
  { match: /\bi disagree with\b/i, natives: ["I see it differently", "I'm not so sure about that"], tip: "Softer, more natural-sounding disagreement." },
  { match: /\bit depends on\b/i, natives: ["it really comes down to…", "it hinges on…"], tip: "More vivid than the plain 'depends on'." },
  { match: /\bin conclusion\b/i, natives: ["all things considered, …", "at the end of the day, …"], tip: "Less like an essay, more like natural speech." },
  { match: /\bmaybe\b/i, natives: ["it's possible that…", "there's a chance that…"], tip: "Useful when you want to sound less casual than 'maybe'." },
  { match: /\bi am not sure\b/i, natives: ["I'm not 100% sure, but…", "I could be wrong, but…"], tip: "Natural hedging phrase before giving an opinion." },
  { match: /\bmany people\b/i, natives: ["a good number of people", "no shortage of people"], tip: "Adds some variety to 'many people'." },
  { match: /\bi want to talk about\b/i, natives: ["what I'd like to get into is…", "let's dig into…"], tip: "More natural way to introduce a topic when speaking." },
  { match: /\bit is important to\b/i, natives: ["it's worth remembering that…", "what matters here is…"], tip: "Sounds less like a written essay." },
  { match: /\bfirst of all\b/i, natives: ["to start with, …", "for one thing, …"], tip: "Natural alternative openers." },
  { match: /\bon the other hand\b/i, natives: ["then again, …", "that said, …"], tip: "Shorter, more conversational contrast markers." },
  { match: /\bi feel like\b/i, natives: ["my gut says…", "if I had to guess, …"], tip: "More vivid than the very common 'I feel like'." },
];
function suggestNativeAlternative(phrase) {
  for (const entry of NATIVE_ALTS) {
    if (entry.match.test(phrase)) return { found: true, natives: entry.natives, tip: entry.tip };
  }
  return { found: false };
}
function openReflectPanel(recordingId) {
  reflectionTags = new Set();
  const panel = document.getElementById('reflectPanel');
  if (!panel) return;
  panel.dataset.recordingId = recordingId;
  document.getElementById('reflectionNote').value = '';
  document.getElementById('reflectionPhrase').value = '';
  document.getElementById('suggestionBox').style.display = 'none';
  document.getElementById('suggestionBox').innerHTML = '';
  renderTagChips();
  panel.style.display = 'block';
  panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
function renderTagChips() {
  const box = document.getElementById('tagChips');
  if (!box) return;
  box.innerHTML = CHALLENGE_TAGS.map(tag => `
    <button type="button" class="tag-chip ${reflectionTags.has(tag)?'active':''}" onclick="toggleReflectTag('${tag}')">${tag}</button>
  `).join('');
}
function toggleReflectTag(tag) {
  if (reflectionTags.has(tag)) reflectionTags.delete(tag); else reflectionTags.add(tag);
  renderTagChips();
}
function checkNativePhrase() {
  const phrase = document.getElementById('reflectionPhrase').value.trim();
  const box = document.getElementById('suggestionBox');
  if (!phrase) { box.style.display = 'none'; return; }
  const result = suggestNativeAlternative(phrase);
  box.style.display = 'block';
  if (result.found) {
    box.innerHTML = `
      <div class="suggestion-title">🗣 A native speaker might say:</div>
      <ul class="suggestion-list">${result.natives.map(n=>`<li>${n}</li>`).join('')}</ul>
      <div class="suggestion-tip">${result.tip}</div>`;
  } else {
    box.innerHTML = `
      <div class="suggestion-title">🤔 No exact match in this app's phrase notes.</div>
      <div class="suggestion-tip">This app can't fully judge natural phrasing on its own — save it to your Phrase Bank and check it with a teacher or native speaker.</div>
      <button class="btn btn-secondary btn-sm" style="margin-top:8px;" onclick="quickAddPhrase(${JSON.stringify(phrase)})">📌 Save to Phrases</button>`;
  }
}
function saveReflection() {
  const panel = document.getElementById('reflectPanel');
  const recordingId = Number(panel.dataset.recordingId);
  const note = document.getElementById('reflectionNote').value.trim();
  const phrase = document.getElementById('reflectionPhrase').value.trim();
  if (reflectionTags.size || note || phrase) {
    state.reflections.push({
      id: Date.now(), recordingId, date: today(),
      tags: [...reflectionTags], note, phrase,
    });
    save();
  }
  panel.style.display = 'none';
  renderInsights();
}
function skipReflection() {
  document.getElementById('reflectPanel').style.display = 'none';
}
function renderInsights() {
  const box = document.getElementById('insightsBox');
  if (!box) return;
  if (!state.reflections.length) {
    box.innerHTML = '<p class="empty"><span class="icon">📊</span><p>Log a recording and add a quick reflection to see your recurring challenges here.</p></p>';
    return;
  }
  const counts = {};
  state.reflections.forEach(r => r.tags.forEach(t => { counts[t] = (counts[t]||0) + 1; }));
  const sorted = Object.entries(counts).sort((a,b)=>b[1]-a[1]);
  const max = sorted.length ? sorted[0][1] : 1;
  const barsHtml = sorted.length ? sorted.map(([tag,count],i) => {
    const colors = ['var(--accent)','var(--violet)','var(--emma)','var(--kyla)','var(--amber)','var(--green)'];
    const color = colors[i % colors.length];
    const pct = Math.round(count/max*100);
    return `<div class="insight-row">
      <span class="insight-label">${tag}</span>
      <div class="insight-bar-track"><div class="insight-bar-fill" style="width:${pct}%;background:${color};"></div></div>
      <span class="insight-count">${count}</span>
    </div>`;
  }).join('') : '<p class="empty" style="padding:10px 0;">No tags recorded yet — reflections were saved as notes only.</p>';

  const recentNotes = [...state.reflections].filter(r=>r.note || r.phrase).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5);
  const notesHtml = recentNotes.length ? `
    <div style="margin-top:14px;">
      <div style="font-size:12px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.04em;margin-bottom:6px;">Recent notes</div>
      ${recentNotes.map(r => {
        const rec = state.recordings.find(x=>x.id===r.recordingId);
        return `<div class="history-item" style="border-bottom:1px solid var(--border);">
          <span class="h-date">${r.date}</span>
          <span class="h-topic">${rec ? rec.topic : ''}${r.note ? ' — ' + r.note : ''}${r.phrase ? ` (unsure about: "${r.phrase}")` : ''}</span>
        </div>`;
      }).join('')}
    </div>` : '';

  const topTag = sorted[0] ? sorted[0][0] : null;
  box.innerHTML = `
    ${topTag ? `<div class="insight-highlight">Your most common challenge right now: <b>${topTag}</b> (${sorted[0][1]}×)</div>` : ''}
    <div class="insight-bars">${barsHtml}</div>
    ${notesHtml}`;
}

// ─────────── TUTORIAL ───────────
const TUTORIAL_STEPS = [
  { title: "Welcome to English Lab 👋", body: "A quick tour of how this app fits into your daily C1 → C2 practice. Tap Next to continue, or Skip if you'd rather explore on your own." },
  { title: "📅 Daily", body: "Track today's shadowing (alternates between Emma and Kyla), see your weekly progress at a glance, and review today's featured phrase." },
  { title: "📝 Phrases", body: "Whenever you learn a new phrase, add it here. The app reminds you of your least-reviewed phrase on the Daily tab so nothing gets forgotten." },
  { title: "🎙 Recordings", body: "Log your practice recordings — about half abstract topics, half random topics. After logging one, jot a quick reflection on what was hard, and check how a native speaker might phrase something you weren't sure about." },
  { title: "🎯 Drill", body: "A quick multiple-choice drill on C1 preposition collocations that trip learners up." },
  { title: "🔍 Pronoun", body: "Paste a transcript to check whether you're consistently using 'you' or 'we'." },
  { title: "You're all set 🎉", body: "Tap the ❓ button in the header any time to see this tour again." },
];
let tutorialStep = 0;
function renderTutorialStep() {
  const step = TUTORIAL_STEPS[tutorialStep];
  const card = document.getElementById('tutorialCard');
  const isLast = tutorialStep === TUTORIAL_STEPS.length - 1;
  card.innerHTML = `
    <h3 style="font-size:1.2rem;margin-bottom:10px;">${step.title}</h3>
    <p style="font-size:14px;color:var(--text2);line-height:1.7;margin-bottom:16px;">${step.body}</p>
    <div class="tutorial-dots">${TUTORIAL_STEPS.map((_,i)=>`<span class="tutorial-dot ${i===tutorialStep?'active':''}"></span>`).join('')}</div>
    <div style="display:flex;justify-content:space-between;gap:8px;margin-top:16px;">
      <button class="btn btn-secondary btn-sm" onclick="closeTutorial()">Skip</button>
      <div style="display:flex;gap:8px;">
        ${tutorialStep>0 ? `<button class="btn btn-secondary btn-sm" onclick="tutorialStep--;renderTutorialStep();">← Back</button>` : ''}
        <button class="btn btn-primary btn-sm" onclick="${isLast ? 'closeTutorial()' : 'tutorialStep++;renderTutorialStep();'}">${isLast ? 'Done' : 'Next →'}</button>
      </div>
    </div>`;
}
function openTutorial() {
  tutorialStep = 0;
  renderTutorialStep();
  document.getElementById('tutorialOverlay').style.display = 'flex';
}
function closeTutorial() {
  document.getElementById('tutorialOverlay').style.display = 'none';
  state.onboarded = true;
  save();
}

// ─────────── BACKUP / RESTORE ───────────
function exportState() {
  const data = JSON.stringify({
    shadowing: state.shadowing,
    recordings: state.recordings,
    phrases: state.phrases,
    reflections: state.reflections,
  }, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ruka-english-lab-${today()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
function importState(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    event.target.value = '';
    let imported;
    try {
      imported = JSON.parse(reader.result);
    } catch (e) {
      alert('Could not read this file — it is not valid JSON.');
      return;
    }
    if (!imported || !Array.isArray(imported.shadowing) || !Array.isArray(imported.recordings)) {
      alert('This file does not look like an English Lab backup.');
      return;
    }
    if (!confirm('This will replace your current data with the contents of this file. Continue?')) {
      return;
    }
    state.shadowing = imported.shadowing;
    state.recordings = imported.recordings;
    state.phrases = Array.isArray(imported.phrases) ? imported.phrases : [];
    state.reflections = Array.isArray(imported.reflections) ? imported.reflections : [];
    save();
    renderWeekBar();
    renderDaily();
    renderRecordings();
    renderPhrases();
    renderPhraseReminder();
    alert('Import complete.');
  };
  reader.readAsText(file);
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
renderPhrases();
renderPhraseReminder();
renderRecordings();
initDrill();
if (!state.onboarded) openTutorial();

// ─────────── PWA SERVICE WORKER ───────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js').catch(() => {});
  });
}
