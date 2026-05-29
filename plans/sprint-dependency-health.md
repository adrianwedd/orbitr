# Sprint: Dependency Health & Green E2E

**Status:** Planned
**Duration:** ~1 week (Tailwind v4 is a spike/spillover candidate)
**Follows:** #110 (CI rationalised to a lean push gate; heavy suites manual + monthly)

## Goal

Bring every dependency current (or consciously deferred), and restore the
Playwright E2E suite to a trustworthy green — so the now-lean CI from #110 is
both *fast* and *fully truthful*.

**Why now:** #110 made CI lean and gated. The natural follow-on is to make what
it gates *current and green*. 12 dependency PRs are stacked up, and the E2E
signal is dark behind the monthly schedule.

---

## Workstream 1 — Dependency backlog (12 PRs)

Each bump classified against the current pins. Three tiers.

### Tier 1 — Safe, batch-merge once CI green (~half a day)

| PR | Bump | Risk |
|----|------|------|
| #106 | eslint-config-next pin → 14.2.x | trivial (already a fix PR) |
| #93 | @radix-ui/react-alert-dialog 1.1.14 → 1.1.15 | patch |
| #102 | python-multipart 0.0.20 → 0.0.22 | patch |
| #98 | python-dotenv 1.1.1 → 1.2.1 | minor |
| #99 | bleach 6.1.0 → 6.3.0 | minor — **verify** sanitization tests (security-critical lib) |
| #95 | axios 1.6.5 → 1.13.2 | spans many minors — skim changelog for interceptor/auth changes, then merge |

**Action:** merge #106 first, rebase the rest, let the lean gate verify each,
squash-merge.

### Tier 2 — Major, needs real verification (~2–3 days)

| PR | Bump | What to check |
|----|------|---------------|
| #97 | **numpy 1.x → 2.4.0** | ABI break. Verify `app.py` numpy usage, scipy compat, and torch/torchaudio if the full AI stack is installed. Pair-merge with #96. |
| #96 | scipy 1.11 → 1.16 | Pair with numpy; rerun backend pytest on the *full* `requirements.txt`, not just minimal. |
| #94 | redis 5 → 7 | Check celery/redis client usage — likely inert in fake-audio path, but confirm. |
| #44 + #68 | **jest 29 → 30** + jest-environment-jsdom 30 | Test-runner major. Verify all frontend tests pass; watch for transform/config changes. |

### Tier 3 — Spike, then decide

| PR | Bump | Plan |
|----|------|------|
| #100 | **tailwindcss 3 → 4** | CSS-first config rewrite, PostCSS plugin change, potential class renames touching every component. **Timeboxed spike (≤1 day):** attempt the migration; if it stays contained, ship it; if it bleeds past the timebox, close #100 and open a dedicated "Tailwind v4 migration" issue/sprint. |

### Latent issues found (fold in here)

- **Pin drift:** `requirements.txt` pins `numpy==1.24.3 / scipy==1.11.4` but
  `requirements-minimal.txt` has `numpy>=1.26.0 / scipy>=1.12.0`. CI tests
  minimal, so the full stack is untested at its real pins. Reconcile both files
  as part of #97/#96.
- **Playwright retries mismatch:** `playwright.config.ts` sets `retries: 2` but
  #110's workflow overrides with `--retries=1`. Reconcile so the config is the
  single source of truth.

---

## Workstream 2 — Green E2E (~2–3 days)

The suite is **14 specs**, now chromium-only (`workers: 1`). The prior CI dig-in
confirmed genuinely-failing tests, not just timeout.

1. Run `pnpm exec playwright test --project=chromium --retries=0` locally;
   capture the real pass/fail per spec.
2. **Triage each failure:** real bug → fix; stale/flaky test → repair or
   `test.fixme()` with a tracking note (no silent skips).
3. Get the monthly `comprehensive-testing.yml` run to **actually finish green**.
4. **Stretch:** promote a fast smoke subset (e.g. `01-app-load`, `02-sequencer`)
   back into the lean push gate, now that it's trustworthy — restores a real
   E2E signal on every PR without the 30-min tax.

---

## Definition of Done

- [ ] All Tier 1 + Tier 2 PRs merged or explicitly closed with rationale
- [ ] Tailwind v4 spike concluded (merged **or** deferred with a follow-up issue)
- [ ] `requirements.txt` / `requirements-minimal.txt` numpy/scipy pins reconciled
- [ ] Playwright retries config reconciled (no CLI override drift)
- [ ] Monthly E2E run is green; every skipped test has a tracking note
- [ ] Lean gate still green on main; (stretch) smoke E2E added to it

## Risks

- **numpy 2 + torch:** if the full AI stack pins old numpy, #97 may force a torch
  bump too — could balloon. Mitigation: verify torch compat *first*; if it
  cascades, hold #97 and document.
- **Tailwind v4:** highest blast radius. Timeboxed spike to avoid swallowing the
  sprint.

---

## PR reference (open as of sprint planning)

Dependency PRs: #44, #68, #93, #94, #95, #96, #97, #98, #99, #100, #102, #106
