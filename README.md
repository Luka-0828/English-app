# English-app

## Web app (`index.html`)

A installable web app (PWA) version of the practice companion, served via
GitHub Pages at the repo's Pages URL. Covers daily shadowing tracking, a
phrase bank with review reminders, recording logging with post-session
reflection, a preposition drill, and a pronoun-consistency checker — all
stored locally in the browser (`localStorage`), with JSON export/import
for backups.

Phrase suggestions and challenge analysis work out of the box using a
built-in static dictionary (no server, no cost). Optionally, you can wire
up a small serverless backend to get real Claude-powered suggestions and
analysis instead — see [`SETUP_AI.md`](SETUP_AI.md) for the (optional,
~5 minute) setup.

## Ruka's English Practice CLI (`english_lab_cli.py`)

A terminal-based training companion for C1 → C2 English practice, covering
daily shadowing practice, recording sessions, preposition drills, and
pronoun-consistency checks. Progress is stored locally in
`~/.english_lab.json`.

### Requirements

- Python 3.7+
- No external dependencies (standard library only)

### Commands

| Command | Description |
|---|---|
| `today` | Shows today's schedule: whether shadowing is done, the suggested shadowing speaker (alternates between Emma and Kyla), weekly recording progress (abstract/economics topics), and today's focus reminders. This is the default command when none is given. |
| `log` | Interactively logs a recording session. Prompts for a type (abstract or economics) and a topic — press Enter on the topic prompt to get a random suggestion from the topic pool. |
| `shadow [Emma\|Kyla]` | Logs today's shadowing session with the given speaker. If no speaker is passed as an argument, prompts interactively to choose between Emma and Kyla. |
| `drill` | Runs a 5-question multiple-choice quiz on common preposition collocations (e.g. "confident about" vs. "confident in"), with immediate feedback and an explanation after each answer. |
| `check` | Paste a block of text (end with a blank line) to check for consistent use of second-person (`you`/`your`) vs. first-person-plural (`we`/`our`) pronouns, flagging sentences that break the dominant pattern. |
| `stats` | Shows a summary of the current week: shadowing days completed (with a day-by-day breakdown of which speaker was used), and recording counts by type. |
| `topics` | Prints five random suggested topics each for abstract and economics recording sessions. |

### Usage

```bash
python english_lab_cli.py today
python english_lab_cli.py log
python english_lab_cli.py shadow Emma
python english_lab_cli.py drill
python english_lab_cli.py check
python english_lab_cli.py stats
python english_lab_cli.py topics
```

Running the script with no arguments is equivalent to `today`; running it
with an unrecognized command prints the help/usage summary.

### Weekly targets

- **Shadowing**: daily, alternating between two reference speakers (Emma and Kyla).
- **Recordings**: 5 per week — 2 on abstract/philosophical topics and 3 on economics topics.

### Data storage

All logged sessions (shadowing and recordings) are stored in a single JSON
file at `~/.english_lab.json`, created automatically on first use. Deleting
this file resets all progress.
