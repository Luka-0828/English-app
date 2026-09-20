#!/usr/bin/env python3
"""
english_lab_cli.py — Ruka's English Practice CLI
C1 → C2 training companion

Usage:
  python english_lab_cli.py today      → Today's schedule + shadowing prompt
  python english_lab_cli.py log        → Log a recording session
  python english_lab_cli.py drill      → Quick 5-question preposition drill
  python english_lab_cli.py check      → Pronoun consistency check (paste text)
  python english_lab_cli.py stats      → Weekly statistics
  python english_lab_cli.py topics     → Generate recording topic suggestions
"""

import json, os, sys, random, re
from datetime import date, timedelta
from pathlib import Path

# ── DATA FILE ──────────────────────────────────────────────────────────────
DATA_FILE = Path.home() / ".english_lab.json"

def load_data():
    if DATA_FILE.exists():
        try:
            return json.loads(DATA_FILE.read_text())
        except Exception:
            pass
    return {"shadowing": [], "recordings": []}

def save_data(data):
    DATA_FILE.write_text(json.dumps(data, indent=2))

# ── COLORS ─────────────────────────────────────────────────────────────────
R = "\033[0m"
BOLD = "\033[1m"
DIM = "\033[2m"
GREEN = "\033[92m"
BLUE = "\033[94m"
VIOLET = "\033[95m"
AMBER = "\033[93m"
RED = "\033[91m"
PINK = "\033[95m"
CYAN = "\033[96m"

def c(color, text): return f"{color}{text}{R}"
def header(title): print(f"\n{BOLD}{title}{R}\n{'─'*40}")
def ok(msg): print(f"  {GREEN}✓{R}  {msg}")
def warn(msg): print(f"  {AMBER}⚠{R}  {msg}")
def info(msg): print(f"  {DIM}{msg}{R}")

# ── WEEK UTILITIES ──────────────────────────────────────────────────────────
def today_str():
    return date.today().isoformat()

def week_start(d_str):
    d = date.fromisoformat(d_str)
    return (d - timedelta(days=d.weekday())).isoformat()

def this_week_dates():
    ws = date.fromisoformat(week_start(today_str()))
    return [(ws + timedelta(days=i)).isoformat() for i in range(7)]

# ── TOPICS ─────────────────────────────────────────────────────────────────
ABSTRACT_TOPICS = [
    "the nature of consciousness", "free will and determinism",
    "the ethics of artificial intelligence", "what makes a life meaningful",
    "the paradox of choice", "identity and change over time",
    "the role of failure in personal growth", "whether truth is objective",
    "the ethics of privacy in a digital age", "solitude and creativity",
    "the relationship between language and thought",
    "ambition and its hidden costs", "what we owe to future generations",
    "the limits of empathy", "beauty: subjective or universal?",
    "the morality of wealth inequality", "can happiness be measured?",
    "the ethics of forgiveness", "tradition vs. progress",
    "what does it mean to be educated?",
]
ECON_TOPICS = [
    "why inflation is so hard to control", "the future of remote work",
    "central bank independence under political pressure",
    "deglobalization trends since COVID-19",
    "the housing affordability crisis and its causes",
    "AI and labor market displacement: who loses?",
    "currency wars and the dollar's reserve status",
    "universal basic income: economic feasibility",
    "supply chain resilience strategies post-pandemic",
    "fiscal cliffs in aging economies: Japan as a case study",
    "venture capital cycles and startup valuations",
    "inequality and intergenerational social mobility",
    "trade deficits: are they actually harmful?",
    "the gig economy's long-term structural impact",
    "sovereign debt crises and IMF conditionality",
]

# ── PREPOSITION QUESTIONS ───────────────────────────────────────────────────
QUESTIONS = [
    {
        "s": "Despite the difficult negotiation, she remained _____ a positive resolution.",
        "b": "optimistic about",
        "opts": ["optimistic about", "optimistic for", "optimistic of", "optimistic on"],
        "ex": "'Optimistic about' — we are optimistic about a situation or possibility.",
    },
    {
        "s": "He feels very _____ the new direction the company is taking.",
        "b": "confident about",
        "opts": ["confident about", "confident in", "confident for", "confident of"],
        "ex": "'Confident about' a specific situation/decision; 'confident in' a person or their ability.",
    },
    {
        "s": "She has always been _____ alternative viewpoints and unconventional ideas.",
        "b": "open-minded to",
        "opts": ["open-minded to", "open-minded about", "open-minded for", "open-minded with"],
        "ex": "'Open-minded to' is the correct collocation. We are open-minded to ideas or possibilities.",
    },
    {
        "s": "The policy change is particularly _____ young professionals entering the job market.",
        "b": "relevant to",
        "opts": ["relevant to", "relevant for", "relevant about", "relevant of"],
        "ex": "'Relevant to' — something is relevant to a topic, person, or situation.",
    },
    {
        "s": "She is deeply _____ environmental causes and spends her weekends volunteering.",
        "b": "committed to",
        "opts": ["committed to", "committed about", "committed for", "committed with"],
        "ex": "'Committed to' a cause, goal, or person is the standard collocation.",
    },
    {
        "s": "Many economists are _____ the central bank's ability to manage inflation.",
        "b": "skeptical about",
        "opts": ["skeptical about", "skeptical of", "skeptical for", "skeptical to"],
        "ex": "'Skeptical about' a claim; 'skeptical of' a person/institution. Both work here.",
    },
    {
        "s": "The minister was _____ the opposition's proposed amendments.",
        "b": "critical of",
        "opts": ["critical of", "critical about", "critical to", "critical for"],
        "ex": "'Critical of' = disapproving. 'Critical to/for' = essential. Don't mix them.",
    },
    {
        "s": "He was completely _____ the risks involved in the investment strategy.",
        "b": "aware of",
        "opts": ["aware of", "aware about", "aware to", "aware with"],
        "ex": "'Aware of' is the only correct form. Always use 'of' with aware.",
    },
    {
        "s": "The startup is not yet _____ turning a profit without external funding.",
        "b": "capable of",
        "opts": ["capable of", "capable to", "capable for", "capable in"],
        "ex": "'Capable of' + gerund. Never 'capable to' + infinitive.",
    },
    {
        "s": "His sudden resignation was completely _____ his colleagues' expectations.",
        "b": "contrary to",
        "opts": ["contrary to", "contrary of", "contrary with", "contrary about"],
        "ex": "'Contrary to' expectations, beliefs, or claims is the fixed collocation.",
    },
    {
        "s": "The team's success is largely _____ their ability to communicate openly.",
        "b": "attributed to",
        "opts": ["attributed to", "attributed for", "attributed by", "attributed with"],
        "ex": "'Attributed to' — credit or blame is attributed to a cause or person.",
    },
    {
        "s": "The new framework is fundamentally _____ principles of transparency.",
        "b": "based on",
        "opts": ["based on", "based in", "based around", "based with"],
        "ex": "'Based on' is standard. 'Based upon' is formal but also correct.",
    },
    {
        "s": "He is entirely _____ his team for motivation and direction.",
        "b": "dependent on",
        "opts": ["dependent on", "dependent of", "dependent to", "dependent upon"],
        "ex": "'Dependent on' (or 'upon' formally). Never 'dependent of.'",
    },
    {
        "s": "The new regulation is largely _____ international trade agreements.",
        "b": "consistent with",
        "opts": ["consistent with", "consistent to", "consistent about", "consistent of"],
        "ex": "'Consistent with' — something is consistent with a rule, principle, or prior statement.",
    },
    {
        "s": "She is very _____ the way younger employees are treated in the organization.",
        "b": "concerned about",
        "opts": ["concerned about", "concerned with", "concerned for", "concerned in"],
        "ex": "'Concerned about' = worried about a specific issue. 'Concerned with' = related to/involved with.",
    },
]

# ── COMMAND: TODAY ──────────────────────────────────────────────────────────
def cmd_today():
    data = load_data()
    td = today_str()
    ws = week_start(td)
    week = this_week_dates()

    header(f"📅  Today — {td}")

    # Shadowing
    today_shadow = next((s for s in data["shadowing"] if s["date"] == td and s.get("done")), None)
    sorted_shadow = sorted([s for s in data["shadowing"] if s.get("done")], key=lambda x: x["date"], reverse=True)
    last = sorted_shadow[0] if sorted_shadow else None
    suggested = ("Kyla" if last and last["speaker"] == "Emma" else "Emma") if last else "Emma"

    print(f"  {BOLD}Shadowing{R}")
    if today_shadow:
        spkr = today_shadow["speaker"]
        clr = PINK if spkr == "Emma" else BLUE
        ok(f"Done! Shadowed with {c(clr+BOLD, spkr)} today.")
    else:
        clr = PINK if suggested == "Emma" else BLUE
        warn(f"Not yet done. Today: {c(clr+BOLD, suggested)} (alternating from last session)")
        info("Run 'log' after you finish, or mark it: python english_lab_cli.py shadow Emma/Kyla")

    # Weekly recording progress
    week_recs = [r for r in data["recordings"] if r["date"] in week]
    print(f"\n  {BOLD}Recordings this week{R}  {c(VIOLET, f'{len(week_recs)}/5')}")
    abstract_n = sum(1 for r in week_recs if r["type"] == "abstract")
    econ_n = sum(1 for r in week_recs if r["type"] == "economics")
    bar = "█" * len(week_recs) + "░" * (5 - len(week_recs))
    print(f"  [{c(VIOLET, bar)}]  Abstract: {abstract_n}/2  Economics: {econ_n}/3")
    if abstract_n < 2:
        info(f"  Abstract topics left: {2-abstract_n}")
    if econ_n < 3:
        info(f"  Economics topics left: {3-econ_n}")

    # Focus reminders
    print(f"\n  {BOLD}Today's focus{R}")
    print(f"  {c(GREEN, '·')} Prepositions: confident {c(BOLD,'about')} · optimistic {c(BOLD,'about')} · open-minded {c(BOLD,'to')}")
    print(f"  {c(AMBER, '·')} Pronouns: decide {c(BOLD,'you')} or {c(BOLD,'we')} before you start speaking")
    print(f"  {c(VIOLET, '·')} Pronunciation: Emma shadowing is your mirror — keep it daily")
    print()

# ── COMMAND: LOG RECORDING ──────────────────────────────────────────────────
def cmd_log():
    data = load_data()
    header("🎙  Log a Recording")

    print("  Type: [1] Abstract  [2] Economics")
    choice = input("  → ").strip()
    rtype = "abstract" if choice == "1" else "economics"

    print(f"\n  Topic? (Enter to get a suggestion)")
    topic = input("  → ").strip()
    if not topic:
        pool = ABSTRACT_TOPICS if rtype == "abstract" else ECON_TOPICS
        topic = random.choice(pool)
        print(f"  {c(DIM, f'Suggested: {topic}')}")
        confirm = input("  Use this? [y/n] ").strip().lower()
        if confirm != "y":
            topic = input("  Custom topic: ").strip()

    entry = {"id": int(date.today().toordinal() * 1000 + random.randint(0,999)),
              "date": today_str(), "type": rtype, "topic": topic}
    data["recordings"].append(entry)
    save_data(data)
    ok(f"Logged: [{c(VIOLET if rtype=='abstract' else BLUE, rtype.upper())}] {topic}")

    # Show updated count
    week = this_week_dates()
    wn = sum(1 for r in data["recordings"] if r["date"] in week)
    print(f"\n  Week total: {c(VIOLET, f'{wn}/5')}\n")

# ── COMMAND: SHADOW ─────────────────────────────────────────────────────────
def cmd_shadow(speaker=None):
    data = load_data()
    td = today_str()
    if not speaker:
        header("🎧  Log Shadowing")
        print("  Who did you shadow today? [1] Emma  [2] Kyla")
        ch = input("  → ").strip()
        speaker = "Emma" if ch == "1" else "Kyla"
    existing = next((i for i,s in enumerate(data["shadowing"]) if s["date"]==td), None)
    entry = {"date": td, "speaker": speaker, "done": True}
    if existing is not None:
        data["shadowing"][existing] = entry
    else:
        data["shadowing"].append(entry)
    save_data(data)
    clr = PINK if speaker == "Emma" else BLUE
    ok(f"Shadowing with {c(clr+BOLD, speaker)} logged for today.")
    print()

# ── COMMAND: DRILL ──────────────────────────────────────────────────────────
def cmd_drill():
    header("🎯  Preposition Drill  (5 questions)")
    pool = random.sample(QUESTIONS, min(5, len(QUESTIONS)))
    score = 0
    for i, q in enumerate(pool, 1):
        opts = q["opts"][:]
        random.shuffle(opts)
        print(f"\n  {c(DIM, f'Q{i}/5')}  {q['s'].replace('_____', c(BOLD+'_____', '_____'))}")
        for j, opt in enumerate(opts, 1):
            print(f"    {c(BOLD, str(j))}. {opt}")
        ans = input("  Your answer (1-4): ").strip()
        try:
            chosen = opts[int(ans)-1]
        except (ValueError, IndexError):
            chosen = ""
        if chosen == q["b"]:
            ok(f"Correct! {c(GREEN, chosen)}")
            score += 1
        else:
            print(f"  {RED}✗{R}  Your answer: {c(RED, chosen) if chosen else '?'}")
            print(f"     Correct:    {c(GREEN, q['b'])}")
        print(f"  {c(DIM, q['ex'])}")

    print(f"\n{'─'*40}")
    pct = round(score/5*100)
    clr = GREEN if score==5 else AMBER if score>=3 else RED
    print(f"  Score: {c(clr+BOLD, f'{score}/5')}  ({pct}%)\n")

# ── COMMAND: PRONOUN CHECK ──────────────────────────────────────────────────
def cmd_check():
    header("🔍  Pronoun Consistency Check")
    print(f"  {c(DIM, 'Paste your text, then press Enter twice:')}\n")
    lines = []
    while True:
        line = input()
        if line == "" and lines and lines[-1] == "":
            break
        lines.append(line)
    text = "\n".join(lines).strip()
    if not text:
        warn("No text entered.")
        return

    you_re = re.compile(r'\b(you|your|you\'re|you\'ve|yourself|yourselves)\b', re.I)
    we_re  = re.compile(r'\b(we|our|we\'re|we\'ve|ourselves|us)\b', re.I)

    sentences = re.split(r'(?<=[.!?])\s+', text)
    total_you = len(you_re.findall(text))
    total_we  = len(we_re.findall(text))
    dominant = "you" if total_you >= total_we else "we"

    analyzed = [(s, len(you_re.findall(s)), len(we_re.findall(s))) for s in sentences]
    shifts = [(s,y,w) for s,y,w in analyzed if (dominant=="you" and w>0) or (dominant=="we" and y>0)]

    print(f"\n  {c(AMBER, 'you/your')}: {total_you}   {c(BLUE, 'we/our')}: {total_we}")
    print(f"  Dominant pronoun: {c(BOLD, dominant)}")
    if not shifts:
        ok("Consistent — no pronoun shifts detected.")
    else:
        warn(f"{len(shifts)} shift{'s' if len(shifts)>1 else ''} detected:\n")
        for s,y,w in shifts:
            minority = "we/our" if dominant=="you" else "you/your"
            print(f"  {RED}⚠{R}  \"{s[:100]}{'…' if len(s)>100 else ''}\"")
            print(f"     {c(DIM, f'Uses {minority} — consider switching to {dominant} for consistency.')}\n")
    print()

# ── COMMAND: STATS ──────────────────────────────────────────────────────────
def cmd_stats():
    data = load_data()
    week = this_week_dates()
    week_recs = [r for r in data["recordings"] if r["date"] in week]
    week_shadow = [s for s in data["shadowing"] if s["date"] in week and s.get("done")]

    header("📊  Weekly Stats")
    print(f"  Week of {week[0]} → {week[-1]}")
    print()

    # Shadowing
    print(f"  {BOLD}Shadowing{R}  {c(GREEN if len(week_shadow)>=5 else AMBER, f'{len(week_shadow)}/7 days')}")
    shadow_bar = ""
    for i, d in enumerate(week):
        s = next((x for x in week_shadow if x["date"]==d), None)
        day = ["M","T","W","T","F","S","S"][i]
        if s:
            clr = PINK if s["speaker"]=="Emma" else BLUE
            shadow_bar += c(clr, f" {day}({s['speaker'][0]}) ")
        else:
            shadow_bar += c(DIM, f" {day}( ) ")
    print(f"  {shadow_bar}")
    print()

    # Recordings
    abs_n = sum(1 for r in week_recs if r["type"]=="abstract")
    eco_n = sum(1 for r in week_recs if r["type"]=="economics")
    print(f"  {BOLD}Recordings{R}  {c(VIOLET, f'{len(week_recs)}/5')}")
    print(f"  Abstract:  {c(VIOLET if abs_n==2 else AMBER, f'{abs_n}/2')}")
    print(f"  Economics: {c(VIOLET if eco_n==3 else AMBER, f'{eco_n}/3')}")
    if week_recs:
        print(f"\n  Recent recordings:")
        for r in sorted(week_recs, key=lambda x: x["date"], reverse=True):
            clr = VIOLET if r["type"]=="abstract" else BLUE
            label = "ABS" if r["type"]=="abstract" else "ECO"
            print(f"    {c(DIM, r['date'])}  {c(clr, label)}  {r['topic']}")
    print()

# ── COMMAND: TOPICS ─────────────────────────────────────────────────────────
def cmd_topics():
    header("💡  Recording Topic Suggestions")
    print(f"\n  {c(VIOLET+BOLD, 'Abstract')} (×2 this week):")
    for t in random.sample(ABSTRACT_TOPICS, 5):
        print(f"    · {t}")
    print(f"\n  {c(BLUE+BOLD, 'Economics')} (×3 this week):")
    for t in random.sample(ECON_TOPICS, 5):
        print(f"    · {t}")
    print()

# ── MAIN ────────────────────────────────────────────────────────────────────
def main():
    args = sys.argv[1:]
    cmd = args[0].lower() if args else "today"

    if cmd == "today":
        cmd_today()
    elif cmd == "log":
        cmd_log()
    elif cmd in ("shadow", "shadowing"):
        speaker = args[1].capitalize() if len(args) > 1 else None
        cmd_shadow(speaker)
    elif cmd == "drill":
        cmd_drill()
    elif cmd == "check":
        cmd_check()
    elif cmd == "stats":
        cmd_stats()
    elif cmd == "topics":
        cmd_topics()
    else:
        print(f"""
  {BOLD}english_lab_cli.py{R} — C1→C2 practice companion

  Commands:
    {c(CYAN, 'today')}       Show today's schedule and reminders
    {c(CYAN, 'log')}         Log a recording session
    {c(CYAN, 'shadow')}      Log today's shadowing (Emma or Kyla)
    {c(CYAN, 'drill')}       Quick 5-question preposition drill
    {c(CYAN, 'check')}       Pronoun consistency check (paste text)
    {c(CYAN, 'stats')}       Weekly statistics
    {c(CYAN, 'topics')}      Get topic suggestions for recordings
""")

if __name__ == "__main__":
    main()
