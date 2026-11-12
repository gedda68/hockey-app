// scripts/altius-2026/harvest-in-browser.js
//
// Harvests BHA competitions from hockeybrisbane.altius.live into one JSON file.
//
// HOW TO RUN
//   1. Open https://hockeybrisbane.altius.live in Chrome/Edge (no login needed).
//   2. Open DevTools → Console (F12), paste this whole file, press Enter.
//   3. Progress is logged every few seconds (~15–25 min for ~1,400 matches).
//   4. When finished the browser downloads  bha-<season>-altius.json.
//      Move it to  data/altius/<season>/  in the hockey-app repo.
//
// Change SEASON / SEARCHES for another year. Altius has no public API, so this
// reads the same HTML pages a visitor sees, 6 requests at a time.

(async () => {
  const SEASON = "2026";
  const SEARCHES = {
    BHL: `BHA ${SEASON} BHL`,
    JHL: `BHA ${SEASON} JHL`,
    MHL: `BHA ${SEASON} MHL`,
  };
  const CONCURRENCY = 6;

  const H = (window.__H = { status: "running", started: new Date().toISOString(), season: SEASON, comps: {}, matchDetails: {}, errors: [], done: 0, total: 0 });

  const get = async (p) => {
    for (let a = 0; a < 4; a++) {
      try {
        const r = await fetch(p);
        if (!r.ok) throw new Error(String(r.status));
        return new DOMParser().parseFromString(await r.text(), "text/html");
      } catch (e) {
        if (a === 3) throw e;
        await new Promise((r) => setTimeout(r, 1000 * (a + 1)));
      }
    }
  };
  const T = (s) => (s || "").replace(/\s+/g, " ").trim();
  const idOf = (a, k) => a?.getAttribute("href")?.match(new RegExp(k + "/(\\d+)"))?.[1] ?? null;
  const tables = (d) => [...d.querySelectorAll("table")].filter((t) => !/Register my Team|Lineup\?|statistics terms/.test(t.innerText));
  const score = (s) => {
    const m = T(s).match(/^(\d+)\s*-\s*(\d+)(?:\s*\((\d+)\s*-\s*(\d+)\s*SO\))?/);
    return m ? { h: +m[1], a: +m[2], soH: m[3] != null ? +m[3] : null, soA: m[4] != null ? +m[4] : null } : null;
  };

  async function findComps() {
    const out = {};
    for (const [league, q] of Object.entries(SEARCHES)) {
      const d = await get("/search?q=" + encodeURIComponent(q));
      out[league] = [...d.querySelectorAll('a[href*="/competitions/"]')]
        .filter((a) => T(a.textContent).startsWith(`BHA ${SEASON} ${league}`))
        .map((a) => a.href.match(/competitions\/(\d+)/)[1]);
    }
    return out;
  }

  async function harvestComp(league, id) {
    const c = { league, altiusCompetitionId: String(id), sourceUrl: location.origin + "/competitions/" + id };
    const s = await get("/competitions/" + id);
    const hs = [...s.querySelectorAll("h1,h2,h3,h4,h5")].map((h) => T(h.textContent));
    c.title = hs[0]; c.location = hs[1]; c.dateRange = hs[2];
    c.category = T((hs[3] || "").replace(/Local Time [\d-]+ [\d:]+/, ""));

    const tt = tables(await get("/competitions/" + id + "/teams"))[0];
    c.teams = [...(tt?.rows || [])].slice(1).map((r) => {
      const a = r.cells[0].querySelector("a");
      const img = r.cells[0].querySelector("img")?.src || null;
      return { altiusTeamId: idOf(a, "teams"), name: T(a?.textContent), code: T(r.cells[1]?.textContent), finalStanding: T(r.cells[2]?.textContent) || null, logoUrl: img, altiusOrgId: img?.match(/organizations\/(\d+)\//)?.[1] || null };
    });

    c.pools = tables(await get("/competitions/" + id + "/pools")).map((t) => ({
      pool: T(t.closest(".portlet,.tab-pane,.panel")?.querySelector(".caption,.panel-title")?.textContent) || null,
      rows: [...t.rows].slice(1).map((r) => {
        const v = [...r.cells].map((x) => T(x.textContent));
        return { rank: +v[0], altiusTeamId: idOf(r.cells[1]?.querySelector("a"), "teams"), team: v[1], p: +v[2], w: +v[3], d: +v[4], l: +v[5], gf: +v[6], ga: +v[7], gd: +v[8], pts: +v[9] };
      }),
    })).filter((p) => p.rows.length);

    const mt = tables(await get("/competitions/" + id + "/matches")).find((t) => /Match #/.test(t.rows[0]?.innerText));
    c.matches = [...(mt?.rows || [])].slice(1).filter((r) => r.cells.length >= 7).map((r) => {
      const v = [...r.cells].map((x) => T(x.textContent));
      const a = r.cells[3].querySelector("a");
      const dm = T(a?.textContent).match(/^(.*?) v (.*?) \((.*)\)$/) || [];
      const lu = [...r.querySelectorAll('a[href*="/lineups/"]')].map((x) => x.getAttribute("href").match(/lineups\/(\d+)/)[1]);
      const when = r.cells[2].querySelector("[data-datetimelocal__notimechange]");
      return {
        altiusMatchId: idOf(a, "matches"), matchNo: v[0], round: v[1] ? +v[1] || v[1] : null,
        localDateTime: when?.getAttribute("data-datetimelocal__notimechange") || null,
        timezone: r.cells[2].querySelector("[data-timezone]")?.getAttribute("data-timezone") || "Australia/Brisbane",
        homeCode: dm[1] || null, awayCode: dm[2] || null, phaseLabel: dm[3] || null,
        homeTeamId: lu[0] || null, awayTeamId: lu[1] || null,
        score: score(v[4]), scoreText: v[4] || null, status: v[5] || null, pitch: v[6] || null,
      };
    });

    const st = tables(await get("/competitions/" + id + "/statistics"));
    const prow = (r) => {
      const v = [...r.cells].map((x) => T(x.textContent));
      return { altiusTeamId: idOf(r.cells[0].querySelector("a"), "teams"), shirt: v[1], altiusPlayerId: idOf(r.cells[2].querySelector("a"), "players"), name: v[2] };
    };
    c.scorers = [...(st.find((t) => /FG/.test(t.rows[0]?.innerText))?.rows || [])].slice(1).map((r) => {
      const v = [...r.cells].map((x) => T(x.textContent));
      return { ...prow(r), fg: +v[3], pc: +v[4], ps: +v[5], goals: +v[6] };
    });
    c.cards = [...(st.find((t) => /Yellow/.test(t.rows[0]?.innerText))?.rows || [])].slice(1).map((r) => {
      const v = [...r.cells].map((x) => T(x.textContent));
      return { ...prow(r), red: +v[3], yellow: +v[4], green: +v[5] };
    });
    c.awards = [...(tables(s).find((t) => /^Award/.test(T(t.rows[0]?.innerText)))?.rows || [])].slice(1).map((r) => [...r.cells].map((x) => T(x.textContent)));
    return c;
  }

  async function harvestMatch(mid) {
    const d = await get("/matches/" + mid);
    const ts = tables(d);
    const o = {};
    o.lineups = ts
      .filter((t) => t.closest(".tab-pane")?.id?.startsWith("lineups") && /# Name/.test(T(t.rows[0]?.innerText)))
      .map((t) => {
        const team = T(t.closest(".portlet,.panel,.col-md-6,.tab-pane")?.querySelector(".caption,.panel-title,h4")?.textContent);
        const players = [], staff = [];
        for (const r of [...t.rows].slice(1)) {
          const v = [...r.cells].map((x) => T(x.textContent));
          const a = r.cells[1]?.querySelector('a[href*="/players/"]');
          if (a) {
            const nm = v[1];
            players.push({ shirt: v[0], altiusPlayerId: idOf(a, "players"), name: T(nm.replace(/\((GK|C)\)/g, "")), gk: /\(GK\)/.test(nm), captain: /\(C\)/.test(nm), played: v[2] || null });
          } else if (/^(COACH|MANAGER|ASSISTANT|TRAINER|PHYSIO|TEAM|STAFF)/i.test(v[0] || "")) {
            staff.push({ role: v[0], name: v[1] || null });
          }
        }
        return { team, players, staff };
      });
    const gt = ts.find((t) => /Minute.*Action/.test(T(t.rows[0]?.innerText)));
    o.goals = [...(gt?.rows || [])].slice(1).filter((r) => r.cells.length >= 5).map((r) => {
      const v = [...r.cells].map((x) => T(x.textContent));
      return { team: v[0], minute: +v[1] || null, shirt: v[2], altiusPlayerId: idOf(r.cells[3].querySelector("a"), "players"), name: v[3], action: v[4], scoreAfter: v[5] };
    });
    const ct = ts.find((t) => /Minute.*Type.*Umpire/.test(T(t.rows[0]?.innerText)));
    o.cards = [...(ct?.rows || [])].slice(1).filter((r) => r.cells.length >= 5).map((r) => {
      const v = [...r.cells].map((x) => T(x.textContent));
      return { team: v[0], minute: +v[1] || null, shirt: v[2], altiusPlayerId: idOf(r.cells[3].querySelector("a"), "players"), name: v[3], type: v[4], umpire: v[5] || null };
    });
    const ot = ts.find((t) => /^Role Official/.test(T(t.rows[0]?.innerText)));
    o.officials = [...(ot?.rows || [])].slice(1).map((r) => {
      const v = [...r.cells].map((x) => T(x.textContent));
      return { role: v[0], name: v[1] || null, altiusOfficialId: idOf(r.cells[1]?.querySelector("a"), "matchofficial") };
    }).filter((x) => x.name);
    const dt = ts.find((t) => t.closest(".tab-pane")?.id === "details");
    o.details = {};
    for (const r of dt?.rows || []) {
      const k = T(r.cells[0]?.textContent), v = T(r.cells[1]?.textContent);
      if (k && v) o.details[k] = v;
    }
    const at = ts.find((t) => t.closest(".tab-pane")?.id === "awards");
    o.awards = [...(at?.rows || [])].slice(1).map((r) => [...r.cells].map((x) => T(x.textContent))).filter((r) => r.length > 1);
    return o;
  }

  const timer = setInterval(() => console.log(`[altius] ${H.status} ${H.phase || ""} ${H.done}/${H.total} errors=${H.errors.length}`), 5000);
  try {
    const comps = await findComps();
    console.log("[altius] competitions", comps);
    for (const [league, ids] of Object.entries(comps)) {
      for (const id of ids) {
        H.phase = "competition " + id;
        try { H.comps[id] = await harvestComp(league, id); } catch (e) { H.errors.push(["comp", id, String(e)]); }
      }
    }
    const mids = [...new Set(Object.values(H.comps).flatMap((c) => c.matches.map((m) => m.altiusMatchId)).filter(Boolean))];
    H.total = mids.length; H.phase = "matches";
    let i = 0;
    const worker = async () => {
      while (i < mids.length) {
        const m = mids[i++];
        try { H.matchDetails[m] = await harvestMatch(m); } catch (e) { H.errors.push(["match", m, String(e)]); }
        H.done++;
      }
    };
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
    H.status = "done"; H.finished = new Date().toISOString();
  } catch (e) {
    H.status = "failed"; H.errors.push(["fatal", String(e)]);
  } finally {
    clearInterval(timer);
  }

  const blob = new Blob([JSON.stringify(H)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `bha-${SEASON}-altius.json`;
  document.body.appendChild(a);
  a.click();
  console.log(`[altius] ${H.status}: ${Object.keys(H.comps).length} competitions, ${Object.keys(H.matchDetails).length} matches, ${H.errors.length} errors → downloaded ${a.download}`);
})();
