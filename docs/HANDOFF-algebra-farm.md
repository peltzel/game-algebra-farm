# Handoff: Algebra Farm

Written 2026-11-16, when the working session ran out of context. Nothing was half-done.

## Ownership

- This session owned three repos. All are clean and pushed. No other session holds any of this work.
  - `~/repos/game-algebra-farm` (GitHub `peltzel/game-algebra-farm`, branch `main`): the PRD and the playable spike.
  - `~/repos/games-peltzel-dev` (GitHub `peltzel/games-peltzel-dev`, branch `main`): the static site behind games.peltzel.dev, deployed as the Cloudflare Worker `peltzel-games`.
  - `~/repos/peltzel-dev`: only `site/_redirects` on `main`. The local checkout sits on branch `resume-link` with Ben's own unmerged commit and three untracked folders (`prototypes/`, `reports/`, `research_notes/`). Leave all of that alone. Commit to `main` from a separate worktree.
- No local server is running. Port 8787 was free when this was written.

## Done

| Step | Commit | Proof |
|---|---|---|
| Spike v1: four levels, farm, locks, clone and share machines | `game-algebra-farm` up to `21e5781` | Played through in the browser pane, console clean |
| Repo renamed and pushed | `game-algebra-farm` `22bed6f` | `main` matches `origin/main` |
| Games site built and deployed | `games-peltzel-dev` `504ba57` | https://games.peltzel.dev/algebra-farm answered 200 on 2026-11-16 |
| Old link redirects | `peltzel-dev` `ceefe3e` on `main` | https://peltzel.dev/seesaw answered 301 to the new address on 2026-11-16 |

## In flight

No code. One open conversation, not yet answered:

> Ben, 2026-11-16: "Let's discuss ways we can add PEMDAS, FOIL, quadratics, special quadratics."

This is a design discussion, not a build request. Nothing about it is written in the PRD yet.

## Resume

```bash
cd ~/repos/game-algebra-farm
```

```bash
python3 -m http.server 8787 --directory spike
```

Next step: answer Ben's question above. Read the PRD first (`docs/superpowers/specs/2026-10-22-seesaw-algebra-prd.md`), load the `superpowers:brainstorming` skill, and keep the reply short with lettered options.

Starting thoughts for that discussion, unreviewed by Ben:

- The seesaw shows "both sides weigh the same". It has no way to show one unknown times another, which is what FOIL and quadratics need.
- The usual picture for that is area: a rectangle whose sides are lengths, as in algebra tiles. On the farm that could be a fenced field. A field that is x+2 by x+3 splits into four plots, which is FOIL. Guessing the fence lengths from the plots is factoring.
- Special cases fall out of the same picture: a square field for (x+a)², and a square with a corner cut out for a difference of squares.
- Order of operations has no weight or area picture. One idea is a chain of machines, where brackets are a machine inside a machine, building on the clone and share machines in level 4.
- Open question for Ben: is this a new mode of the same game, or a second game that shares the farm?

To publish a change to the spike:

```bash
cd ~/repos/games-peltzel-dev && ./scripts/pull-algebra-farm.sh && git add -A && git commit -m "Pull latest Algebra Farm" && git push && npx wrangler deploy
```

## Decisions for the user

1. Where the new topics live.
   - (a) New levels in this game, with a field board next to the seesaw. Cost: the spike grows a second board.
   - (b) A separate game on the same farm. Cost: a second PRD and repo.
2. Push-to-deploy for the games site.
   - (a) Leave it as a hand deploy. Cost: one command per update.
   - (b) Connect Workers Builds to `games-peltzel-dev` in the Cloudflare dashboard. Cost: about five minutes of Ben's time.

## Landmines

- Never use port 8765. Ben's bay-area-events service lives there and a subagent killed it once. Use 8787, and only stop processes you started.
- The browser caches `app.js` and `style.css`. After an edit, shift-reload, or a fix will look like it did nothing.
- `gh` is logged in as the bot `petlzelclawdbot`. It cannot create repos under `peltzel`. Ben creates the repo and adds the bot as a collaborator. Pushing works over HTTPS, not SSH.
- `wrangler login` needs a browser click, so it runs in Ben's own terminal tab. A zsh "insecure files" prompt eats the first keystroke of a new tab.
- The games site serves pages without a trailing slash, so asset paths must start with `/algebra-farm/`. The pull script rewrites them.
- The farm is saved per web address. A player's animals do not follow them from localhost to the live site.
- Backlog, already in the PRD: levels unlock in order with a tutor override; farm art pass (a real farm, drawn animals, a proper clone machine). The page title still says "Seesaw".
- Ben's rules: replies stay short; code is written by subagents and reviewed by the main session.
