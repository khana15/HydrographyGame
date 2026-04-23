<script src="sonar-scout-advanced.js"></script>
// sonar-scout-advanced.js
// Full Advanced Version (Pulse Mechanic Removed)

(function () {
  document.addEventListener("DOMContentLoaded", init);

  // =====================================================
  // INIT
  // =====================================================

  function init() {
    injectStyles();
    buildUI();
    setCampaign(0);
    drawFrame();
  }

  // =====================================================
  // STYLE INJECTION
  // =====================================================

  function injectStyles() {
    const style = document.createElement("style");
    style.textContent = `
      body {
        margin:0;
        font-family: Trebuchet MS, sans-serif;
        background: radial-gradient(circle at top, #2a0d0a 0%, #120707 70%);
        color:#fff2e6;
      }
      .wrap { max-width:1100px; margin:0 auto; padding:20px; display:grid; gap:16px; }
      header { display:flex; justify-content:space-between; flex-wrap:wrap; gap:12px; }
      .controls { display:flex; flex-wrap:wrap; gap:8px; }
      button, select {
        background:#2b120f; border:1px solid #5a2418; color:#fff2e6;
        padding:8px 12px; border-radius:8px; cursor:pointer;
      }
      button:hover { border-color:#ff6b3d; }
      .panel { background:#1a0b0b; border:1px solid #3b1812; border-radius:16px; padding:16px; }
      canvas { width:100%; height:360px; border-radius:14px; border:1px solid #3b1812; display:block; }
      .hud { display:grid; gap:10px; grid-template-columns:repeat(auto-fit,minmax(160px,1fr)); }
      .hud div { background:#120707; padding:10px; border-radius:10px; border:1px solid #3b1812; font-size:14px;}
    `;
    document.head.appendChild(style);
  }

  // =====================================================
  // UI BUILD
  // =====================================================

  let canvas, ctx;
  let missionSelect;
  let stats = {};

  function buildUI() {
    const wrap = document.createElement("div");
    wrap.className = "wrap";
    document.body.appendChild(wrap);

    const header = document.createElement("header");
    header.innerHTML = `<h1>Sonar Scout</h1>`;
    wrap.appendChild(header);

    const controls = document.createElement("div");
    controls.className = "controls";

    const startBtn = makeButton("Start");
    const pauseBtn = makeButton("Pause");
    const resetBtn = makeButton("New Run");
    const nextMissionBtn = makeButton("Next Mission");

    missionSelect = document.createElement("select");

    controls.append(startBtn, pauseBtn, resetBtn, missionSelect, nextMissionBtn);
    header.appendChild(controls);

    const panel = document.createElement("div");
    panel.className = "panel";

    canvas = document.createElement("canvas");
    canvas.width = 980;
    canvas.height = 340;
    ctx = canvas.getContext("2d");
    panel.appendChild(canvas);

    wrap.appendChild(panel);

    const hud = document.createElement("div");
    hud.className = "hud";

    stats.score = makeHud("Score");
    stats.found = makeHud("Targets Found");
    stats.falseTags = makeHud("False Tags");
    stats.speed = makeHud("Scan Speed");
    stats.mission = makeHud("Mission");

    hud.append(
      stats.score.container,
      stats.found.container,
      stats.falseTags.container,
      stats.speed.container,
      stats.mission.container
    );

    wrap.appendChild(hud);

    // Events
    startBtn.onclick = startRun;
    pauseBtn.onclick = () => (state.paused = !state.paused);
    resetBtn.onclick = resetRun;
    nextMissionBtn.onclick = () => setMission(state.missionIndex + 1);
    missionSelect.onchange = (e) => setMission(parseInt(e.target.value));

    canvas.addEventListener("click", handleClick);
  }

  function makeButton(label) {
    const b = document.createElement("button");
    b.textContent = label;
    return b;
  }

  function makeHud(label) {
    const container = document.createElement("div");
    const strong = document.createElement("strong");
    const span = document.createElement("span");
    strong.textContent = label + ": ";
    span.textContent = "-";
    container.append(strong, span);
    return { container, span };
  }

  // =====================================================
  // STATE
  // =====================================================

  const state = {
    running: false,
    paused: false,
    scrollY: 0,
    score: 0,
    found: 0,
    falseTags: 0,
    speed: 1.2,
    targets: [],
    totalTargets: 0,
    missionIndex: 0,
    campaignIndex: 0
  };

  // =====================================================
  // MISSIONS
  // =====================================================

  const missions = [
    { name: "Reef Sweep", goal: 0.7, count: 8, motif: "kelp", speed: 1.1 },
    { name: "Harbor Wreck", goal: 0.75, count: 10, motif: "harbor", speed: 1.2 },
    { name: "Storm Debris", goal: 0.8, count: 12, motif: "storm", speed: 1.3 },
    { name: "Deep Channel", goal: 0.7, count: 9, motif: "canyon", speed: 1.4 }
  ];

  const campaign = [
    { title: "Training Run", mission: 0 },
    { title: "Harbor Mystery", mission: 1 },
    { title: "Debris Field", mission: 2 },
    { title: "Deep Passage", mission: 3 }
  ];

  missions.forEach((m, i) => {
    const opt = document.createElement("option");
    opt.value = i;
    opt.textContent = m.name;
    missionSelect.appendChild(opt);
  });

  // =====================================================
  // GAME LOGIC
  // =====================================================

  function setCampaign(i) {
    state.campaignIndex = i % campaign.length;
    setMission(campaign[state.campaignIndex].mission);
  }

  function setMission(i) {
    state.missionIndex = (i + missions.length) % missions.length;
    missionSelect.value = state.missionIndex;
    resetRun();
  }

  function resetRun() {
    state.running = false;
    state.paused = false;
    state.scrollY = 0;
    state.score = 0;
    state.found = 0;
    state.falseTags = 0;
    state.targets = [];
    generateTargets();
    updateHud();
    drawFrame();
  }

  function startRun() {
    if (!state.running) {
      state.running = true;
      requestAnimationFrame(loop);
    }
  }

  function generateTargets() {
    const mission = missions[state.missionIndex];
    state.speed = mission.speed;
    state.totalTargets = mission.count;
    for (let i = 0; i < mission.count; i++) {
      state.targets.push({
        x: Math.random() * 800 + 90,
        y: 200 + i * 160,
        size: 15 + Math.random() * 20,
        found: false
      });
    }
  }

  function loop() {
    if (!state.running || state.paused) return;
    state.scrollY += state.speed;
    drawFrame();
    if (state.scrollY < canvas.height + 400) {
      requestAnimationFrame(loop);
    } else {
      showSummary();
    }
  }

  // =====================================================
  // DRAWING
  // =====================================================

  function drawFrame() {
    ctx.fillStyle = "#120707";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawCenterLine();
    drawTargets();
    applyMissionFX();
  }

  function drawCenterLine() {
    ctx.strokeStyle = "#ffe0c2";
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();
  }

  function drawTargets() {
    state.targets.forEach((t) => {
      const y = t.y - state.scrollY;
      if (y < -50 || y > canvas.height + 50) return;

      ctx.fillStyle = "orange";
      ctx.beginPath();
      ctx.ellipse(t.x, y, t.size, t.size * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function applyMissionFX() {
    const motif = missions[state.missionIndex].motif;
    const t = performance.now() / 1000;

    if (motif === "harbor") {
      canvas.style.transform =
        "translateX(" + Math.sin(t * 2) * 3 + "px)";
    } else if (motif === "storm") {
      canvas.style.transform =
        "translate(" +
        Math.sin(t * 7) * 1 +
        "px," +
        Math.cos(t * 6) * 1 +
        "px)";
    } else {
      canvas.style.transform = "none";
    }
  }

  function showSummary() {
    state.running = false;
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffffff";
    ctx.font = "20px Trebuchet MS";
    ctx.fillText("Mission Complete", 380, 160);
  }

  function handleClick(e) {
    if (!state.running) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);

    let hit = false;

    state.targets.forEach((t) => {
      const ty = t.y - state.scrollY;
      const dx = x - t.x;
      const dy = y - ty;
      if (!t.found && Math.sqrt(dx * dx + dy * dy) < t.size) {
        t.found = true;
        state.found++;
        state.score += 100;
        hit = true;
      }
    });

    if (!hit) {
      state.falseTags++;
      state.score = Math.max(0, state.score - 30);
    }

    updateHud();
  }

  function updateHud() {
    stats.score.span.textContent = state.score;
    stats.found.span.textContent =
      state.found + " / " + state.totalTargets;
    stats.falseTags.span.textContent = state.falseTags;
    stats.speed.span.textContent = state.speed.toFixed(1) + "x";
    stats.mission.span.textContent =
      missions[state.missionIndex].name;
  }
})();
