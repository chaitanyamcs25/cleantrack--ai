// ============================================================
//  CleanTrack AI  –  app.js
// ============================================================

/* ---------- State ---------- */
let reports = JSON.parse(localStorage.getItem('cleantrack_reports') || '[]');
let currentFilter = 'all';

/* ---------- AI Classification Engine ---------- */
const WASTE_RULES = [
  { type: 'Plastic', keywords: ['plastic', 'bottle', 'bottles', 'bag', 'bags', 'polythene', 'wrapper', 'packaging', 'straw', 'cup', 'container'] },
  { type: 'Organic', keywords: ['food', 'waste', 'vegetable', 'vegetables', 'fruit', 'fruits', 'rotten', 'kitchen', 'compost', 'leaf', 'leaves', 'grass', 'garden', 'organic'] },
  { type: 'Metal', keywords: ['can', 'cans', 'iron', 'metal', 'steel', 'tin', 'aluminum', 'aluminium', 'wire', 'scrap', 'pipe'] },
  { type: 'Electronic', keywords: ['mobile', 'phone', 'phones', 'smartphone', 'battery', 'batteries', 'laptop', 'computer', 'tablet', 'charger', 'chargers', 'cable', 'cables', 'electronic', 'electronics', 'e-waste', 'ewaste', 'circuit', 'keyboard', 'monitor', 'screen', 'printer', 'router', 'appliance', 'appliances', 'device', 'devices', 'tv', 'television', 'bulb', 'bulbs', 'light', 'lights', 'fridge', 'ac', 'microwave', 'headphone', 'headphones', 'earphone', 'earphones', 'speaker', 'speakers', 'chip', 'chips', 'wire'] },
];
const HIGH_KEYWORDS = ['overflow', 'overflowing', 'danger', 'dangerous', 'hazard', 'hazardous', 'large', 'huge', 'massive', 'pile', 'piles', 'urgent', 'emergency', 'everywhere', 'blocked', 'stinking', 'stench'];
const LOW_KEYWORDS = ['small', 'minor', 'little', 'few', 'tiny', 'single', 'one', 'couple'];

function classifyWaste(text) {
  const lower = text.toLowerCase();
  const words = lower.split(/\s+/);

  // Waste type
  let type = 'Mixed Waste';
  let typeScore = 0;
  for (const rule of WASTE_RULES) {
    const hits = rule.keywords.filter(k => lower.includes(k)).length;
    if (hits > typeScore) { typeScore = hits; type = rule.type; }
  }

  // Priority
  let priority = 'Medium';
  const hasHigh = HIGH_KEYWORDS.some(k => lower.includes(k));
  const hasLow = LOW_KEYWORDS.some(k => lower.includes(k));
  if (hasHigh) priority = 'High';
  else if (hasLow) priority = 'Low';

  // Confidence
  const confidence = typeScore > 0
    ? Math.min(98, 70 + typeScore * 8 + Math.floor(Math.random() * 6))
    : Math.floor(Math.random() * 20 + 50);

  return { type, priority, confidence };
}

/* ---------- Page Navigation ---------- */
function showPage(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('nav-' + page).classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (page === 'reports') renderReports();
  if (page === 'home') updateHomeStats();
}

// allow nav brand click
document.getElementById('nav-brand-link').addEventListener('click', () => showPage('home'));
document.getElementById('nav-brand-link').addEventListener('keydown', e => { if (e.key === 'Enter') showPage('home'); });

/* ---------- Home Stats ---------- */
function updateHomeStats() {
  const total = reports.length;
  const high = reports.filter(r => r.priority === 'High').length;
  const resolved = reports.filter(r => r.status === 'Resolved').length;
  animateNumber('stat-total', total);
  animateNumber('stat-high', high);
  animateNumber('stat-resolved', resolved);
  document.getElementById('nav-badge').textContent = total + (total === 1 ? ' Report' : ' Reports');
}

function animateNumber(id, target) {
  const el = document.getElementById(id);
  let current = 0;
  const step = Math.ceil(target / 20) || 1;
  const timer = setInterval(() => {
    current = Math.min(current + step, target);
    el.textContent = current;
    if (current >= target) clearInterval(timer);
  }, 40);
}

/* ---------- Live AI Analysis (Report Page) ---------- */
function liveAnalyze(text) {
  const charEl = document.getElementById('char-count');
  const previewEl = document.getElementById('preview-content');
  const trimmed = text.slice(0, 300);
  charEl.textContent = trimmed.length + ' / 300 characters';

  if (trimmed.trim().length < 4) {
    previewEl.innerHTML = `<div class="preview-empty"><div class="preview-empty-icon">🤖</div><div>Start typing to see AI analysis...</div></div>`;
    return;
  }

  const { type, priority, confidence } = classifyWaste(trimmed);
  const typeTag = `<span class="tag ${typeClass(type)}">${type}</span>`;
  const priorityTag = `<span class="tag ${priorityClass(priority)}">${priorityEmoji(priority)} ${priority}</span>`;
  const conf = `<span style="color:var(--green);font-weight:700">${confidence}%</span>`;

  previewEl.innerHTML = `
    <div class="preview-result">
      <div class="preview-row"><span class="preview-row-label">Waste Type</span>${typeTag}</div>
      <div class="preview-row"><span class="preview-row-label">Priority</span>${priorityTag}</div>
      <div class="preview-row"><span class="preview-row-label">Confidence</span>${conf}</div>
      <div class="preview-row"><span class="preview-row-label">Status</span><span class="tag tag-pending">Pending</span></div>
    </div>`;
}

/* ---------- Image Upload ---------- */
function handleImageUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    const preview = document.getElementById('img-preview');
    const content = document.getElementById('upload-content');
    preview.src = ev.target.result;
    preview.style.display = 'block';
    content.innerHTML = `<div class="upload-icon">✅</div><div class="upload-text">${file.name}</div>`;
  };
  reader.readAsDataURL(file);
}

/* ---------- Analyze & Submit ---------- */
function analyzeAndSubmit() {
  const desc = document.getElementById('waste-description').value.trim();
  const loc = document.getElementById('waste-location').value.trim();

  if (desc.length < 4) {
    showToast('⚠️ Please describe the waste before submitting.', '#f59e0b');
    document.getElementById('waste-description').focus();
    return;
  }

  const btn = document.getElementById('btn-analyze-submit');
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner"></span> Analyzing...`;

  setTimeout(() => {
    const { type, priority, confidence } = classifyWaste(desc);
    const report = {
      id: 'RPT-' + String(reports.length + 1).padStart(4, '0'),
      description: desc,
      location: loc || 'Not specified',
      type,
      priority,
      confidence,
      status: 'Pending',
      timestamp: new Date().toISOString(),
    };
    reports.push(report);
    saveReports();
    updateHomeStats();
    btn.disabled = false;
    btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg> Analyze &amp; Submit`;
    resetForm();
    showToast(`✅ Report ${report.id} submitted! Type: ${type} · Priority: ${priority}`);
    setTimeout(() => showPage('reports'), 1400);
  }, 900);
}

function resetForm() {
  document.getElementById('waste-description').value = '';
  document.getElementById('waste-location').value = '';
  document.getElementById('char-count').textContent = '0 / 300 characters';
  document.getElementById('img-preview').style.display = 'none';
  document.getElementById('upload-content').innerHTML = `
    <div class="upload-icon">📸</div>
    <div class="upload-text">Click to upload image</div>
    <div class="upload-sub">JPG, PNG, GIF up to 10MB</div>`;
  document.getElementById('preview-content').innerHTML = `
    <div class="preview-empty"><div class="preview-empty-icon">🤖</div><div>Start typing to see AI analysis...</div></div>`;
}

/* ---------- Render Reports ---------- */
function renderReports() {
  const grid = document.getElementById('reports-grid');
  const empty = document.getElementById('empty-state');
  let filtered = reports.slice().reverse();
  if (currentFilter !== 'all') {
    filtered = filtered.filter(r => r.priority.toLowerCase() === currentFilter);
  }

  // render insights always from all reports
  renderInsights();

  if (filtered.length === 0) {
    grid.innerHTML = '';
    grid.appendChild(empty || createEmptyState());
    const es = document.getElementById('empty-state');
    if (es) es.style.display = 'flex';
    return;
  }

  grid.innerHTML = filtered.map(r => reportCard(r)).join('');
}

function createEmptyState() {
  const div = document.createElement('div');
  div.className = 'empty-state';
  div.id = 'empty-state';
  div.innerHTML = `<div class="empty-icon">📋</div><h3>No Reports Yet</h3><p>Submit your first garbage report to see it here.</p><button class="btn btn-primary" onclick="showPage('report')">Submit a Report</button>`;
  return div;
}

function reportCard(r) {
  const time = new Date(r.timestamp).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' });
  return `
  <div class="report-card" id="card-${r.id}">
    <div class="priority-bar ${r.priority.toLowerCase()}"></div>
    <div class="rc-header">
      <span class="rc-id">${r.id}</span>
      <span class="rc-time">${time}</span>
    </div>
    <div class="rc-desc">${escHtml(r.description.slice(0, 120))}${r.description.length > 120 ? '…' : ''}</div>
    <div class="rc-meta">
      <span class="tag ${typeClass(r.type)}">${r.type}</span>
      <span class="tag ${priorityClass(r.priority)}">${priorityEmoji(r.priority)} ${r.priority}</span>
      <span class="tag ${statusClass(r.status)}">${r.status}</span>
    </div>
    <div class="rc-footer">
      <span class="rc-location">📍 ${escHtml(r.location)}</span>
      <div class="rc-actions">
        <button class="rc-btn" onclick="openModal('${r.id}')">Details</button>
        <button class="rc-btn" onclick="deleteReport('${r.id}')">Delete</button>
      </div>
    </div>
  </div>`;
}

/* ---------- Insights ---------- */
function renderInsights() {
  const total = reports.length;
  const high = reports.filter(r => r.priority === 'High').length;
  const pending = reports.filter(r => r.status === 'Pending').length;

  // Most common type
  const typeCounts = {};
  reports.forEach(r => { typeCounts[r.type] = (typeCounts[r.type] || 0) + 1; });
  const commonType = total > 0
    ? Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0][0]
    : '—';

  document.getElementById('insight-common').textContent = commonType;
  document.getElementById('insight-high').textContent = high;
  document.getElementById('insight-total').textContent = total;
  document.getElementById('insight-pending').textContent = pending;
  document.getElementById('nav-badge').textContent = total + (total === 1 ? ' Report' : ' Reports');

  // Waste breakdown bars
  const types = ['Plastic', 'Organic', 'Metal', 'Electronic', 'Mixed Waste'];
  const colors = { 'Plastic': '#818cf8', 'Organic': '#34d399', 'Metal': '#94a3b8', 'Mixed Waste': '#fbbf24', 'Electronic': '#22d3ee' };
  const breakdownEl = document.getElementById('waste-breakdown');
  if (total === 0) { breakdownEl.innerHTML = ''; return; }
  breakdownEl.innerHTML = `<div class="wb-label">Waste Breakdown</div><div class="wb-bars">${types.map(t => {
    const count = typeCounts[t] || 0;
    const pct = Math.round((count / total) * 100);
    return `<div class="wb-row" style="display:flex;align-items:center;gap:.5rem;margin-bottom:.35rem">
        <div class="wb-name">${t}</div>
        <div class="wb-bar-wrap"><div class="wb-bar" style="width:${pct}%;background:${colors[t]}"></div></div>
        <div class="wb-count">${count}</div>
      </div>`;
  }).join('')
    }</div>`;
}

/* ---------- Filter ---------- */
function filterReports(f) {
  currentFilter = f;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('filter-' + f).classList.add('active');
  renderReports();
}

/* ---------- Clear All ---------- */
function clearAllReports() {
  if (reports.length === 0) return;
  if (!confirm('Delete all reports? This cannot be undone.')) return;
  reports = [];
  saveReports();
  renderReports();
  updateHomeStats();
  showToast('🗑️ All reports cleared.');
}

/* ---------- Delete Single ---------- */
function deleteReport(id) {
  reports = reports.filter(r => r.id !== id);
  saveReports();
  renderReports();
  updateHomeStats();
  showToast('🗑️ Report deleted.');
}

/* ---------- Modal ---------- */
function openModal(id) {
  const r = reports.find(r => r.id === id);
  if (!r) return;
  const time = new Date(r.timestamp).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  document.getElementById('modal-content').innerHTML = `
    <div class="modal-report-title">📋 Report ${r.id}</div>
    <div class="modal-row"><span class="modal-row-label">Description</span><span>${escHtml(r.description)}</span></div>
    <div class="modal-row"><span class="modal-row-label">Location</span><span>${escHtml(r.location)}</span></div>
    <div class="modal-row"><span class="modal-row-label">Waste Type</span><span class="tag ${typeClass(r.type)}">${r.type}</span></div>
    <div class="modal-row"><span class="modal-row-label">Priority</span><span class="tag ${priorityClass(r.priority)}">${priorityEmoji(r.priority)} ${r.priority}</span></div>
    <div class="modal-row"><span class="modal-row-label">Confidence</span><span style="color:var(--green);font-weight:700">${r.confidence}%</span></div>
    <div class="modal-row"><span class="modal-row-label">Submitted</span><span>${time}</span></div>
    <div class="modal-row">
      <span class="modal-row-label">Status</span>
      <select class="status-select" onchange="updateStatus('${r.id}', this.value)">
        <option ${r.status === 'Pending' ? 'selected' : ''}>Pending</option>
        <option ${r.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
        <option ${r.status === 'Escalated' ? 'selected' : ''}>Escalated</option>
        <option ${r.status === 'Resolved' ? 'selected' : ''}>Resolved</option>
      </select>
    </div>`;
  document.getElementById('modal-overlay').classList.add('open');
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
}

function updateStatus(id, status) {
  const r = reports.find(r => r.id === id);
  if (r) { r.status = status; saveReports(); renderReports(); updateHomeStats(); showToast(`✅ Status updated to "${status}"`); }
}

/* ---------- Toast ---------- */
let toastTimer;
function showToast(msg, color) {
  const t = document.getElementById('toast');
  document.getElementById('toast-text').textContent = msg;
  t.style.borderColor = color || 'var(--green)';
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3500);
}

/* ---------- Helpers ---------- */
function saveReports() { localStorage.setItem('cleantrack_reports', JSON.stringify(reports)); }
function escHtml(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function typeClass(t) { return { 'Plastic': 'tag-plastic', 'Organic': 'tag-organic', 'Metal': 'tag-metal', 'Mixed Waste': 'tag-mixed', 'Electronic': 'tag-electronic' }[t] || 'tag-mixed'; }
function priorityClass(p) { return { 'High': 'tag-high', 'Medium': 'tag-medium', 'Low': 'tag-low' }[p] || 'tag-medium'; }
function statusClass(s) { return { 'Pending': 'tag-pending', 'In Progress': 'tag-inprogress', 'Escalated': 'tag-high', 'Resolved': 'tag-resolved' }[s] || 'tag-pending'; }
function priorityEmoji(p) { return { 'High': '🔴', 'Medium': '🟡', 'Low': '🟢' }[p] || '🟡'; }

/* ---------- Boot ---------- */
updateHomeStats();
