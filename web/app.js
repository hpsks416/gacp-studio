"use strict";

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const els = {
  repoPath: $("#repo-path"),
  refresh: $("#refresh"),
  branchBadge: $("#branch-badge"),
  dirtyBadge: $("#dirty-badge"),
  typeGrid: $("#type-grid"),
  scope: $("#scope"),
  emoji: $("#emoji"),
  subject: $("#subject"),
  body: $("#body"),
  breaking: $("#breaking"),
  preview: $("#preview"),
  push: $("#push"),
  commit: $("#commit"),
  statusGrid: $("#status-grid"),
  changes: $("#changes"),
  log: $("#log"),
  output: $("#output"),
  clearOutput: $("#clear-output"),
};

let types = [];
let current = null;
let busy = false;

function log(text, kind) {
  const time = new Date().toLocaleTimeString();
  els.output.textContent += `\n[${time}] ${text}`;
  els.output.scrollTop = els.output.scrollHeight;
  if (kind === "error") els.output.classList.add("error");
  else els.output.classList.remove("error");
}

async function api(path, options) {
  const res = await fetch(path, options);
  return res.json();
}

function repoParam() {
  return "?repo=" + encodeURIComponent(els.repoPath.value.trim() || ".");
}

function loadState(state) {
  if (!state) return;
  els.repoPath.value = state.repo_path || els.repoPath.value;
  els.scope.value = state.scope || "";
  els.emoji.value = state.emoji || "✨";
  els.subject.value = state.subject || "";
  els.body.value = state.body || "";
  els.breaking.checked = !!state.breaking;
  els.push.checked = state.push !== false;
  if (state.commit_type) selectType(state.commit_type);
}

async function saveState() {
  const body = {
    repo_path: els.repoPath.value.trim(),
    commit_type: current ? current.key : "feat",
    scope: els.scope.value,
    emoji: els.emoji.value,
    subject: els.subject.value,
    body: els.body.value,
    breaking: els.breaking.checked,
    push: els.push.checked,
  };
  try {
    await api("/api/state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (err) {
    /* state persistence is best-effort */
  }
}

function buildTypes(data) {
  types = data || [];
  els.typeGrid.innerHTML = "";
  for (const t of types) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "type";
    btn.dataset.key = t.key;
    btn.dataset.emoji = t.emoji;
    btn.innerHTML = `<span class="type-emoji">${t.emoji}</span><span class="type-label">${t.label}</span>`;
    btn.addEventListener("click", () => selectType(t.key));
    els.typeGrid.appendChild(btn);
  }
}

function selectType(key) {
  const t = types.find((x) => x.key === key);
  if (!t) return;
  current = t;
  $$(".type").forEach((b) => b.classList.toggle("active", b.dataset.key === key));
  if (!els.emoji.value) els.emoji.value = t.emoji;
  updatePreview();
}

function updatePreview() {
  if (!current) return;
  const scope = els.scope.value.trim();
  const subject = els.subject.value.trim();
  const emoji = els.emoji.value.trim();
  const scopePart = scope ? `(${scope})` : "";
  let head = `${current.key}${scopePart}${els.breaking.checked ? "!" : ""}: ${subject || "…"}`;
  if (emoji) head = `${emoji} ${head}`;
  const parts = [head];
  const body = els.body.value.trim();
  if (els.breaking.checked) {
    parts.push("", "BREAKING CHANGE: " + (body || "描述破坏性变更"));
  } else if (body) {
    parts.push("", body);
  }
  els.preview.textContent = parts.join("\n");
}

function renderStatus(status) {
  if (!status || !status.ok) {
    els.branchBadge.textContent = "—";
    els.dirtyBadge.textContent = "错误";
    els.dirtyBadge.className = "badge badge-error";
    els.statusGrid.innerHTML = "";
    els.changes.innerHTML = `<div class="empty">${status && status.error ? status.error : "无法读取仓库"}</div>`;
    els.log.innerHTML = "";
    return;
  }

  const branch = status.branch || "(detached)";
  els.branchBadge.textContent = branch;
  els.branchBadge.className = "badge";

  const counts = {
    staged: status.staged.length,
    unstaged: status.unstaged.length,
    untracked: status.untracked.length,
  };
  const dirty = counts.staged + counts.unstaged + counts.untracked;
  els.dirtyBadge.textContent = dirty ? `${dirty} 处变更` : "干净";
  els.dirtyBadge.className = dirty ? "badge badge-warn" : "badge badge-clean";

  const ahead = status.ahead ? `${status.ahead}↑` : "0↑";
  const behind = status.behind ? `${status.behind}↓` : "0↓";
  const cells = [
    ["分支", branch],
    ["远程", status.remote || "未配置"],
    ["领先/落后", `${ahead} / ${behind}`],
    ["暂存", String(counts.staged)],
    ["未暂存", String(counts.unstaged)],
    ["未跟踪", String(counts.untracked)],
  ];
  els.statusGrid.innerHTML = cells
    .map(([k, v]) => `<div class="stat"><span class="stat-k">${k}</span><span class="stat-v">${v}</span></div>`)
    .join("");

  const chunks = [];
  for (const f of status.staged) chunks.push(`<div class="change staged"><span class="tag">M</span>${esc(f)}</div>`);
  for (const f of status.unstaged) chunks.push(`<div class="change unstaged"><span class="tag">~</span>${esc(f)}</div>`);
  for (const f of status.untracked) chunks.push(`<div class="change untracked"><span class="tag">+</span>${esc(f)}</div>`);
  els.changes.innerHTML = chunks.length
    ? chunks.join("")
    : `<div class="empty">没有待提交的变更</div>`;

  els.log.innerHTML = status.log.length
    ? status.log
        .map((c) => `<li><span class="hash">${esc(c.hash)}</span><span class="subject">${esc(c.subject)}</span><span class="meta">${esc(c.author)} · ${esc(c.when)}</span></li>`)
        .join("")
    : `<li class="empty">暂无提交记录</li>`;
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

async function refreshStatus() {
  log("刷新仓库状态…");
  try {
    const data = await api("/api/repo" + repoParam());
    renderStatus(data);
    log(data.ok ? "状态已更新" : `状态读取失败：${data.error || ""}`, data.ok ? undefined : "error");
  } catch (err) {
    renderStatus({ ok: false, error: "无法连接服务端" });
    log("无法连接服务端", "error");
  }
}

async function doCommit() {
  if (busy) return;
  const subject = els.subject.value.trim();
  if (!subject) {
    log("请先填写提交主题 subject", "error");
    els.subject.focus();
    return;
  }
  const message = els.preview.textContent;
  if (!message) return;
  busy = true;
  els.commit.disabled = true;
  els.commit.textContent = "执行中…";
  log("开始 add + commit" + (els.push.checked ? " + push" : "") + "…");
  try {
    const data = await api("/api/commit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        repo_path: els.repoPath.value.trim(),
        message,
        push: els.push.checked,
      }),
    });
    if (data.commit_out) log(data.commit_out);
    if (data.push_out) log(data.push_out);
    if (data.ok && data.push_ok !== false) {
      log("完成 ✓");
      els.subject.value = "";
      els.body.value = "";
      els.breaking.checked = false;
      els.scope.value = "";
      updatePreview();
    } else if (data.ok && data.push_ok === false) {
      log("提交成功，但推送失败（见上方输出）", "error");
    } else {
      log("失败：" + (data.error || "未知错误"), "error");
    }
  } catch (err) {
    log("请求失败：" + err.message, "error");
  } finally {
    busy = false;
    els.commit.disabled = false;
    els.commit.textContent = "提交并推送";
    saveState();
    await refreshStatus();
  }
}

async function init() {
  els.clearOutput.addEventListener("click", () => { els.output.textContent = ""; });
  els.refresh.addEventListener("click", refreshStatus);
  els.commit.addEventListener("click", doCommit);
  [els.scope, els.emoji, els.subject, els.body].forEach((el) =>
    el.addEventListener("input", () => { updatePreview(); })
  );
  els.breaking.addEventListener("change", updatePreview);
  els.push.addEventListener("change", saveState);
  els.repoPath.addEventListener("change", saveState);

  try {
    const [typesRes, stateRes] = await Promise.all([api("/api/types"), api("/api/state")]);
    buildTypes(typesRes.types || []);
    loadState(stateRes.state || {});
    if (!current && types.length) selectType("feat");
    updatePreview();
    await refreshStatus();
  } catch (err) {
    log("初始化失败，请确认 server.py 正在运行", "error");
  }
}

init();