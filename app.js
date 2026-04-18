// ============================================================
// TFT Prompt Builder - App Logic
// ============================================================

// ---- Migrate old AI settings ----
(function migrateAISettings() {
  const OLD_KEY = 'psk_po1S6/9hF9urM/wQ9UJW6yW3idC80i3v';
  const NEW_KEY = 'psk_LpxORhyXYEYZestCeeRgFXFPv/t2YqfG';
  const NEW_URL = '/api/v1';
  const NEW_MODEL = 'gpt-5.3-codex';
  if (!localStorage.getItem('ai_apikey') || localStorage.getItem('ai_apikey') === OLD_KEY) {
    localStorage.setItem('ai_apikey', NEW_KEY);
    localStorage.setItem('ai_baseurl', NEW_URL);
    localStorage.setItem('ai_model', NEW_MODEL);
  }
  if (localStorage.getItem('ai_baseurl') === 'http://localhost:20128/v1' ||
      localStorage.getItem('ai_baseurl') === 'https://proxy.simpleverse.io.vn/v1') {
    localStorage.setItem('ai_baseurl', NEW_URL);
  }
})();

// ---- State ----
const state = {
  currentRoundId: null,
  rounds: {},        // { roundId: { champions: [], pool: [], items: [], tier: null, augments: [], god: null } }
};
const STORAGE_KEYS = {
  currentGame: 'tft_current_game_state_v1',
  previousGame: 'tft_previous_game_state_v1',
  quickDecision: 'tft_quick_decision_v1',
  appMode: 'tft_app_mode_v1',
};
const quickDecisionState = createDefaultQuickDecisionState();
let appMode = localStorage.getItem(STORAGE_KEYS.appMode) || 'quick';
const STRATEGY_GUIDE_CONTEXT = `
### STRATEGIC GUIDE PATCH 17.1
Đây là lớp kiến thức chiến lược đã được nạp từ tài liệu phân tích do người dùng cung cấp. Hãy dùng nó như strategic prior, nhưng khi xung đột với dataset meta comp hiện tại hoặc state ván đấu hiện tại thì phải ưu tiên dữ liệu app trước.

1. TRIẾT LÝ CHUNG
- Mùa 17 xoay quanh Realm of the Gods thay cho carousel, nên trọng tâm là quản lý tài nguyên, chọn blessing đúng timeline, và tối ưu line dài hạn.
- Meta hiện tại ưu tiên tận dụng tài nguyên từ thần linh để lên cap late game mạnh, đặc biệt là các line 5 vàng khi có điều kiện.
- Tuy nhiên với mục tiêu của người chơi hiện tại, khi nhiều line có EV gần nhau thì ưu tiên line ít thao tác, ít pivot, ít yêu cầu nhớ nhịp roll phức tạp hơn.

2. TIMELINE THẦN LINH
- Các mốc chọn blessing là 2-4, 3-4, 4-4; God Boon lớn nhận ở 4-7.
- Giai đoạn đầu: nếu đang mạnh và muốn giữ tempo, ưu tiên lựa chọn giúp giữ win streak hoặc ghép đồ sớm; nếu đang yếu và cần bảo hiểm máu hoặc kinh tế, ưu tiên lựa chọn hồi máu, vàng, XP.
- Giai đoạn giữa: nếu đang hướng reroll thì ưu tiên boon hỗ trợ tài nguyên tướng/nhân bản; nếu hướng fast 8/fast 9 thì ưu tiên boon cho vàng, XP, tướng cao tiền hoặc cap late game.
- Giai đoạn 4-7: boon mạnh thường là boon giúp tăng cap combat ngay lập tức hoặc snowball tài nguyên thành board capped.

3. ĐỊNH HƯỚNG CHỌN THẦN
- Ahri: mạnh về vàng, XP, reroll; hợp line muốn lên cấp và cap late.
- Aurelion Sol: thiên về thử thách đổi lấy phần thưởng lớn; hợp spot snowball và người chơi đủ tài nguyên để greedy.
- Ekko: thiên về phần thưởng trễ, cổ vật, anomaly; hợp board cần item utility hoặc swing turn về sau.
- Evelynn: đổi máu lấy sức mạnh tức thời; chỉ tốt khi thật sự cần spike và chấp nhận variance.
- Kayle: mạnh về mảnh đồ và nâng đồ; thường là lựa chọn combat ổn định, đặc biệt khi có carry rõ ràng.
- Soraka: thiên về hồi máu và ổn định; tốt khi đang cần giữ mạng hoặc recover sau chuỗi thua.
- Thresh: phần thưởng ngẫu nhiên cộng vàng; thiên về value dài hạn.
- Varus: cho tướng, máy nhân bản, hỗ trợ hướng late game đắt tiền.
- Yasuo: buff ô trên bàn; cực mạnh khi ô đẹp cho carry hoặc frontline chủ lực.

4. NHẬN ĐỊNH META
- Line dùng tướng 5 vàng đang có trần sức mạnh rất cao nếu có đủ tài nguyên.
- Các nguồn dữ liệu real-time như MetaTFT, Tactic.tools, Mobalytics thường cần để kiểm tra biến thể tối ưu, nhưng trong app này phải ưu tiên dataset nội bộ trước.
- Khi tư vấn, nếu spot đủ đẹp, cần chỉ ra đường chuyển sang capped board có khả năng top 1 thay vì chỉ nói cách top 4 an toàn.

5. TỘC HỆ ĐÁNG CHÚ Ý
- Dark Star: sức mạnh hành quyết và snowball combat, Jhin là carry trần cao.
- Mecha: dạng biến hình cực mạnh nhưng chiếm nhiều slot, đổi lại được spike combat rõ.
- Meeple: mạnh về kinh tế, nhân bản, value tích lũy; Bard là quân cờ cực kỳ đặc biệt.
- Space Groove: tăng tiến theo thời gian giao tranh; càng kéo combat dài càng mạnh.

6. TƯỚNG 5 VÀNG CHỦ CHỐT
- Jhin: carry vật lý tầm xa trần rất cao.
- Bard: tạo value cực lớn và có thể bắt cóc tướng địch để sinh lời.
- Blitzcrank: disrupt cực mạnh, giá trị vị trí rất cao.
- Fiora: carry đấu sĩ 1v1 cực mạnh, đặc biệt khi có đủ đồ sống lâu và cắt tuyến sau.

7. NGUYÊN TẮC ĐỒ
- Ưu tiên đồ flex mạnh từ sớm để giữ máu và giữ quyền chuyển bài.
- Guinsoo, Edge of Night, Gunblade là nhóm đồ đa dụng đáng ưu tiên trong nhiều line.
- Khi tư vấn đồ, phải nói rõ đâu là đồ giữ máu sớm, đâu là đồ chốt cho carry cuối trận.

8. MẸO VI MÔ
- Luôn coi trọng scout khi chơi các quân disrupt như Blitzcrank.
- Nếu có cơ chế nhân bản hoặc phần thưởng trễ, cần tính số vòng hoàn vốn trước khi khuyên người chơi commit.
- Với reroll: 1-cost thường roll ở cấp thấp, 2-cost slowroll cấp 6, 3-cost thường roll mạnh ở cấp 7.

9. CÁCH TRẢ LỜI ƯU TIÊN
- Luôn ưu tiên khuyến nghị ngắn, thực dụng, và theo thứ tự hành động.
- Nếu có line “ít công” nhưng trần thấp hơn rõ rệt line khác, hãy nêu tradeoff.
- Nếu spot đủ đẹp để top 1, phải nói thẳng line cap nào giúp top 1 và mốc nào phải lên cấp/roll/chuyển bài.
`.trim();

// Initialize all round state
state.rounds = createEmptyRoundsState();
loadSavedGameState();
loadQuickDecisionState();

// ---- DOM ----
const timeline       = document.getElementById('timeline');
const editorContent  = document.getElementById('editor-content');
const editorPlaceholder = document.getElementById('editor-placeholder');
const promptPreview  = document.getElementById('prompt-preview');
const TAG_SEARCH_ALIASES = {
  champions: {
    [normalizeSearchText('Mordekaiser')]: ['morderkaiser', 'mordekiser', 'morde'],
    [normalizeSearchText("Kai'Sa")]: ['kaisa', 'kai sa'],
    [normalizeSearchText("Bel'Veth")]: ['belveth', 'bel veth'],
    [normalizeSearchText("Cho'Gath")]: ['chogath', 'cho gath'],
    [normalizeSearchText("Rek'Sai")]: ['reksai', 'rek sai'],
    [normalizeSearchText("Tahm Kench")]: ['tahmkench'],
    [normalizeSearchText("Twisted Fate")]: ['tf'],
    [normalizeSearchText("Master Yi")]: ['yi'],
    [normalizeSearchText("Miss Fortune")]: ['mf'],
    [normalizeSearchText('Aurelion Sol')]: ['asol', 'a sol'],
    [normalizeSearchText('LeBlanc')]: ['lb'],
  },
  pool: {
    [normalizeSearchText('Mordekaiser')]: ['morderkaiser', 'mordekiser', 'morde'],
    [normalizeSearchText("Kai'Sa")]: ['kaisa', 'kai sa'],
    [normalizeSearchText("Bel'Veth")]: ['belveth', 'bel veth'],
    [normalizeSearchText("Cho'Gath")]: ['chogath', 'cho gath'],
    [normalizeSearchText("Rek'Sai")]: ['reksai', 'rek sai'],
    [normalizeSearchText('Aurelion Sol')]: ['asol', 'a sol'],
    [normalizeSearchText('LeBlanc')]: ['lb'],
  },
};

function createEmptyRoundState() {
  return { champions: [], pool: [], items: [], tier: null, augments: [], god: null, chosenAugment: null, augmentSearch: '', pendingTagQty: {} };
}

function createDefaultQuickDecisionState() {
  return {
    round: '',
    hp: '',
    gold: '',
    level: '',
    streak: 'even',
    plan: 'flex',
    damageType: 'flex',
    board: '',
    bench: '',
    items: '',
    augments: '',
    god: '',
    notes: '',
  };
}

function createEmptyRoundsState() {
  const rounds = {};
  TFT_DATA.rounds.forEach(r => {
    rounds[r.id] = createEmptyRoundState();
  });
  return rounds;
}

function sanitizeRoundState(round) {
  return {
    champions: Array.isArray(round?.champions) ? round.champions : [],
    pool: Array.isArray(round?.pool) ? round.pool : [],
    items: Array.isArray(round?.items) ? round.items : [],
    tier: round?.tier || null,
    augments: Array.isArray(round?.augments) ? round.augments : [],
    god: round?.god || null,
    chosenAugment: round?.chosenAugment || null,
    augmentSearch: '',
    pendingTagQty: {},
  };
}

function loadSavedGameState() {
  const raw = localStorage.getItem(STORAGE_KEYS.currentGame);
  if (!raw) return;
  try {
    const saved = JSON.parse(raw);
    state.currentRoundId = saved.currentRoundId || null;
    const rounds = createEmptyRoundsState();
    Object.keys(rounds).forEach(roundId => {
      rounds[roundId] = sanitizeRoundState(saved.rounds?.[roundId]);
    });
    state.rounds = rounds;
  } catch {
    localStorage.removeItem(STORAGE_KEYS.currentGame);
  }
}

function saveCurrentGameState() {
  localStorage.setItem(STORAGE_KEYS.currentGame, JSON.stringify({
    currentRoundId: state.currentRoundId,
    rounds: state.rounds,
    savedAt: new Date().toISOString(),
  }));
}

function loadQuickDecisionState() {
  const raw = localStorage.getItem(STORAGE_KEYS.quickDecision);
  if (!raw) return;
  try {
    const saved = JSON.parse(raw);
    Object.assign(quickDecisionState, createDefaultQuickDecisionState(), saved || {});
  } catch {
    localStorage.removeItem(STORAGE_KEYS.quickDecision);
  }
}

function saveQuickDecisionState() {
  localStorage.setItem(STORAGE_KEYS.quickDecision, JSON.stringify(quickDecisionState));
}

function archiveCurrentGameState() {
  const prompt = generatePrompt();
  if (!prompt) return;
  localStorage.setItem(STORAGE_KEYS.previousGame, JSON.stringify({
    currentRoundId: state.currentRoundId,
    rounds: state.rounds,
    prompt,
    savedAt: new Date().toISOString(),
  }));
}

function getPreviousGameContext() {
  const raw = localStorage.getItem(STORAGE_KEYS.previousGame);
  if (!raw) return '';
  try {
    const previous = JSON.parse(raw);
    if (!previous?.prompt) return '';
    const savedAt = previous.savedAt ? new Date(previous.savedAt).toLocaleString('vi-VN') : 'không rõ thời gian';
    return `### PREVIOUS GAME SNAPSHOT:\nĐây là dữ liệu ván trước đã lưu tự động vào lúc ${savedAt} để tham khảo và phân tích lại quyết định.\n${previous.prompt}`;
  } catch {
    localStorage.removeItem(STORAGE_KEYS.previousGame);
    return '';
  }
}

// ============================================================
// TIMELINE
// ============================================================
function buildTimeline() {
  timeline.innerHTML = '';
  let lastStage = null;

  TFT_DATA.rounds.forEach(r => {
    if (r.stage !== lastStage) {
      const sec = document.createElement('div');
      sec.className = 'tl-section';
      sec.textContent = r.stage;
      timeline.appendChild(sec);
      lastStage = r.stage;
    }

    const item = document.createElement('div');
    item.className = 'timeline-item';
    item.dataset.id = r.id;
    item.onclick = () => selectRound(r.id);

    const s  = state.rounds[r.id];
    const filled = isRoundFilled(r, s);
    if (filled) item.classList.add('completed');
    if (r.id === state.currentRoundId) item.classList.add('active');

    const badgeClass = { round: 'badge-round', augment: 'badge-augment', god: 'badge-god' }[r.type];

    item.innerHTML = `
      <span class="tl-dot"></span>
      <span class="tl-label">${r.label}</span>
      ${filled ? '<span class="tl-check">✓</span>' : ''}
    `;
    timeline.appendChild(item);
  });
}

function isRoundFilled(r, s) {
  if (r.type === 'round')   return s.champions.length > 0 || s.pool.length > 0 || s.items.length > 0;
  if (r.type === 'augment') return s.tier !== null && s.augments.length > 0;
  if (r.type === 'god')     return s.god !== null;
  return false;
}

// ============================================================
// SELECT ROUND → Render Editor
// ============================================================
function selectRound(id) {
  state.currentRoundId = id;
  saveCurrentGameState();
  if (appMode !== 'timeline') setAppMode('timeline');
  buildTimeline();

  const r = TFT_DATA.rounds.find(x => x.id === id);
  const s = state.rounds[id];

  editorPlaceholder.classList.add('hidden');
  editorContent.classList.remove('hidden');

  if (r.type === 'round')   renderRoundEditor(r, s);
  else if (r.type === 'augment') renderAugmentEditor(r, s);
  else if (r.type === 'god')     renderGodEditor(r, s);

  updatePromptPreview();
}

function setAppMode(mode) {
  appMode = mode;
  localStorage.setItem(STORAGE_KEYS.appMode, mode);
  document.getElementById('mode-quick')?.classList.toggle('active', mode === 'quick');
  document.getElementById('mode-timeline')?.classList.toggle('active', mode === 'timeline');

  if (mode === 'quick') {
    editorPlaceholder.classList.add('hidden');
    editorContent.classList.remove('hidden');
    renderQuickDecisionEditor();
  } else if (state.currentRoundId && state.rounds[state.currentRoundId]) {
    selectRound(state.currentRoundId);
  } else {
    editorContent.classList.add('hidden');
    editorPlaceholder.classList.remove('hidden');
  }
  updatePromptPreview();
}

function renderQuickDecisionEditor() {
  const q = quickDecisionState;
  const gods = TFT_DATA.gods.map(g => `<option value="${g.name}" ${q.god === g.name ? 'selected' : ''}>${g.name}</option>`).join('');

  editorContent.innerHTML = `
    <div class="quick-card">
      <div class="round-header quick-header">
        <div class="round-badge type-augment">⚡</div>
        <div>
          <div class="round-title">Quick Decision</div>
          <div class="round-desc">Chỉ nhập vài thông tin cốt lõi rồi để AI chốt line, level, roll và việc cần làm ngay.</div>
        </div>
      </div>

      <div class="quick-grid">
        <div class="field-group">
          <div class="field-label">Round hiện tại</div>
          <input class="form-input" value="${escapeHtmlAttr(q.round)}" placeholder="Ví dụ 3-2" oninput="updateQuickDecisionField('round', this.value)" />
        </div>
        <div class="field-group">
          <div class="field-label">Máu</div>
          <input class="form-input" value="${escapeHtmlAttr(q.hp)}" placeholder="72" oninput="updateQuickDecisionField('hp', this.value)" />
        </div>
        <div class="field-group">
          <div class="field-label">Vàng</div>
          <input class="form-input" value="${escapeHtmlAttr(q.gold)}" placeholder="50" oninput="updateQuickDecisionField('gold', this.value)" />
        </div>
        <div class="field-group">
          <div class="field-label">Cấp độ</div>
          <input class="form-input" value="${escapeHtmlAttr(q.level)}" placeholder="7" oninput="updateQuickDecisionField('level', this.value)" />
        </div>
        <div class="field-group">
          <div class="field-label">Nhịp trận</div>
          <select class="form-input" onchange="updateQuickDecisionField('streak', this.value)">
            <option value="win" ${q.streak === 'win' ? 'selected' : ''}>Đang winstreak</option>
            <option value="lose" ${q.streak === 'lose' ? 'selected' : ''}>Đang lose streak</option>
            <option value="even" ${q.streak === 'even' ? 'selected' : ''}>Đang ngang</option>
          </select>
        </div>
        <div class="field-group">
          <div class="field-label">Ý định</div>
          <select class="form-input" onchange="updateQuickDecisionField('plan', this.value)">
            <option value="flex" ${q.plan === 'flex' ? 'selected' : ''}>Chưa biết / Flex</option>
            <option value="reroll" ${q.plan === 'reroll' ? 'selected' : ''}>Muốn reroll</option>
            <option value="fast8" ${q.plan === 'fast8' ? 'selected' : ''}>Muốn fast 8</option>
            <option value="fast9" ${q.plan === 'fast9' ? 'selected' : ''}>Muốn fast 9</option>
          </select>
        </div>
        <div class="field-group">
          <div class="field-label">Hướng carry</div>
          <select class="form-input" onchange="updateQuickDecisionField('damageType', this.value)">
            <option value="flex" ${q.damageType === 'flex' ? 'selected' : ''}>Flex</option>
            <option value="ad" ${q.damageType === 'ad' ? 'selected' : ''}>AD</option>
            <option value="ap" ${q.damageType === 'ap' ? 'selected' : ''}>AP</option>
          </select>
        </div>
        <div class="field-group">
          <div class="field-label">Thần đang theo</div>
          <select class="form-input" onchange="updateQuickDecisionField('god', this.value)">
            <option value="">Chưa chọn</option>
            ${gods}
          </select>
        </div>
      </div>

      <div class="field-group">
        <div class="field-label">Board hiện tại</div>
        <textarea class="form-input quick-textarea" placeholder="Ví dụ: 2 Mordekaiser, 2 LeBlanc, frontline tạm..." oninput="updateQuickDecisionField('board', this.value)">${q.board}</textarea>
      </div>
      <div class="field-group">
        <div class="field-label">Bench / shop đáng chú ý</div>
        <textarea class="form-input quick-textarea" placeholder="Ví dụ: có 2 Karma, shop thấy Vex, đang giữ Fiora..." oninput="updateQuickDecisionField('bench', this.value)">${q.bench}</textarea>
      </div>
      <div class="quick-grid quick-grid-two">
        <div class="field-group">
          <div class="field-label">Đồ đang có</div>
          <textarea class="form-input quick-textarea" placeholder="Ví dụ: Guinsoo, Shojin, Găng..." oninput="updateQuickDecisionField('items', this.value)">${q.items}</textarea>
        </div>
        <div class="field-group">
          <div class="field-label">Lõi / ghi chú</div>
          <textarea class="form-input quick-textarea" placeholder="Ví dụ: lõi đang thấy, lobby nhiều AD, muốn giữ máu..." oninput="updateQuickDecisionField('augments', this.value)">${q.augments}</textarea>
        </div>
      </div>
      <div class="field-group">
        <div class="field-label">Ghi chú thêm</div>
        <textarea class="form-input quick-textarea quick-textarea-sm" placeholder="Ví dụ: muốn bài dễ chơi, không muốn pivot nhiều..." oninput="updateQuickDecisionField('notes', this.value)">${q.notes}</textarea>
      </div>

      <div class="quick-actions">
        <button class="btn btn-primary" onclick="sendQuickDecisionToAI()">Phân tích ngay</button>
        <button class="btn btn-ghost" onclick="clearQuickDecision()">Xóa nhanh</button>
      </div>
    </div>
  `;
}

function updateQuickDecisionField(field, value) {
  quickDecisionState[field] = value;
  saveQuickDecisionState();
  updatePromptPreview();
}

function clearQuickDecision() {
  Object.assign(quickDecisionState, createDefaultQuickDecisionState());
  saveQuickDecisionState();
  renderQuickDecisionEditor();
  updatePromptPreview();
}

function buildQuickDecisionPrompt() {
  const q = quickDecisionState;
  const lines = [];
  if (q.round) lines.push(`Round hiện tại: ${q.round}`);
  if (q.hp) lines.push(`Máu: ${q.hp}`);
  if (q.gold) lines.push(`Vàng: ${q.gold}`);
  if (q.level) lines.push(`Cấp: ${q.level}`);
  if (q.streak && q.streak !== 'even') lines.push(`Nhịp trận: ${q.streak === 'win' ? 'Đang winstreak' : 'Đang lose streak'}`);
  if (q.plan && q.plan !== 'flex') lines.push(`Ý định: ${q.plan === 'reroll' ? 'Reroll' : q.plan === 'fast8' ? 'Fast 8' : 'Fast 9'}`);
  if (q.damageType && q.damageType !== 'flex') lines.push(`Hướng carry mong muốn: ${q.damageType.toUpperCase()}`);
  if (q.god) lines.push(`Thần đang theo: ${q.god}`);
  if (q.board) lines.push(`Board hiện tại: ${q.board}`);
  if (q.bench) lines.push(`Bench / shop đáng chú ý: ${q.bench}`);
  if (q.items) lines.push(`Đồ hiện có: ${q.items}`);
  if (q.augments) lines.push(`Lõi / thông tin quan trọng: ${q.augments}`);
  if (q.notes) lines.push(`Ghi chú thêm: ${q.notes}`);
  if (!lines.length) return '';
  return `### QUICK DECISION SNAPSHOT:\n${lines.join('\n')}`;
}

async function sendQuickDecisionToAI() {
  const snapshot = buildQuickDecisionPrompt();
  if (!snapshot) {
    showToast('Điền ít nhất vài thông tin nhanh trước khi hỏi AI.', 'warn');
    return;
  }
  if (!aiChatOpen) toggleAIChat();
  const inputEl = document.getElementById('ai-chat-input');
  inputEl.value = 'Phân tích nhanh spot này. Hãy cho line dễ đánh nhất, mốc level/roll, đồ nên ghép và 3 việc cần làm ngay để tối đa top 1.';
  await sendChatMessage();
}

// ============================================================
// ROUND EDITOR (tướng trên sàn, bể, trang bị)
// ============================================================
function renderRoundEditor(r, s) {
  const idx = TFT_DATA.rounds.findIndex(x => x.id === r.id);

  editorContent.innerHTML = `
    <div class="round-header">
      <div class="round-badge type-round">${r.id}</div>
      <div>
        <div class="round-title">${r.label}</div>
        <div class="round-desc">${r.desc}</div>
      </div>
    </div>

    <div class="field-group">
      <div class="field-label"><span>⚔️</span>Tướng trên sàn của tôi</div>
      ${buildTagInput('champions', r.id, s.champions, TFT_DATA.allChampions, 'Nhập tên tướng...')}
    </div>

    <div class="field-group">
      <div class="field-label"><span>🏊</span>Bể tướng đang bán</div>
      ${buildTagInput('pool', r.id, s.pool, TFT_DATA.allChampions, 'Tướng trong bể...')}
    </div>

    <div class="field-group">
      <div class="field-label"><span>🎒</span>Trang bị / Mảnh</div>
      ${buildTagInput('items', r.id, s.items, TFT_DATA.items, 'Nhập trang bị...')}
    </div>

    <div class="action-bar">
      ${idx > 0 ? `<button class="btn-nav btn-nav-prev" onclick="selectRound('${TFT_DATA.rounds[idx-1].id}')">← Trước</button>` : ''}
      ${idx < TFT_DATA.rounds.length-1 ? `<button class="btn-nav btn-nav-next" onclick="selectRound('${TFT_DATA.rounds[idx+1].id}')">Tiếp →</button>` : ''}
    </div>
  `;

  // Bind tag inputs
  bindTagInput('champions', r.id, TFT_DATA.allChampions);
  bindTagInput('pool',      r.id, TFT_DATA.allChampions);
  bindTagInput('items',     r.id, TFT_DATA.items);
}

// ============================================================
// AUGMENT EDITOR (Lõi)
// ============================================================
function renderAugmentEditor(r, s) {
  const idx = TFT_DATA.rounds.findIndex(x => x.id === r.id);
  const tiers = ['Sắt', 'Vàng', 'Bạch Kim'];
  const tierClass = { Sắt: 'tier-sat', Vàng: 'tier-vang', 'Bạch Kim': 'tier-bach-kim' };
  const tierIcon  = { Sắt: '🪨', Vàng: '✨', 'Bạch Kim': '💎' };

  editorContent.innerHTML = `
    <div class="round-header">
      <div class="round-badge type-augment">🧩</div>
      <div>
        <div class="round-title">${r.label} — Chọn Lõi</div>
        <div class="round-desc">${r.desc}</div>
      </div>
    </div>

    <div class="field-group">
      <div class="field-label">Bậc Lõi được chọn</div>
      <div class="tier-chooser">
        ${tiers.map(t => `
          <button class="tier-btn ${tierClass[t]} ${s.tier === t ? 'active' : ''}"
            onclick="selectTier('${r.id}', '${t}')">
            <span class="tier-icon">${tierIcon[t]}</span>
            <span class="tier-name">${t}</span>
          </button>
        `).join('')}
      </div>
    </div>

    <div class="field-group" id="augment-pick-section" style="${!s.tier ? 'display:none' : ''}">
      <div class="field-label">
        <span>🃏</span>3 Lõi trên màn hình
        <span style="color:var(--text-muted);font-size:11px;margin-left:8px;">(chọn đúng 3)</span>
      </div>
      <div class="augment-search-wrap">
        <input
          type="text"
          id="augment-search-${r.id}"
          class="augment-search-input"
          placeholder="Tìm lõi bằng tiếng Việt hoặc English..."
          autocomplete="off"
          value="${escapeHtmlAttr(s.augmentSearch || '')}"
          oninput="setAugmentSearch('${r.id}', this.value)"
        />
      </div>
      <div class="augment-list" id="augment-list">
        ${renderAugmentCards(r.id, s)}
      </div>
      ${s.augments.length === 3 ? `
        <div style="margin-top:8px;font-size:12px;color:var(--accent-green);">
          ✓ Đã chọn: ${s.augments.join(', ')}
        </div>
      ` : `
        <div style="margin-top:8px;font-size:12px;color:var(--text-muted);">
          Đã chọn ${s.augments.length}/3
        </div>
      `}
    </div>

    ${s.augments.length > 0 ? `
    <div class="field-group">
      <div class="field-label"><span>🎯</span>Lõi bạn sẽ chọn (không bắt buộc)</div>
      <div class="chip-grid" id="chosen-augment-chips">
        ${s.augments.map(a => `
          <span class="chip ${s.chosenAugment === a ? getAugmentChipClass(s.tier) : ''}"
            onclick="chooseAugment('${r.id}','${a}')">${a}</span>
        `).join('')}
      </div>
    </div>
    ` : ''}

    <div class="action-bar">
      ${idx > 0 ? `<button class="btn-nav btn-nav-prev" onclick="selectRound('${TFT_DATA.rounds[idx-1].id}')">← Trước</button>` : ''}
      ${s.augments.length === 3 ? `<button class="btn-nav btn-nav-next" onclick="selectRound('${TFT_DATA.rounds[idx+1].id}')">Tiếp →</button>` : ''}
    </div>
  `;
}

function renderAugmentCards(roundId, s) {
  if (!s.tier) return '';
  const searchTerm = normalizeSearchText(s.augmentSearch || '');
  const list = (TFT_DATA.augments[s.tier] || []).filter(name => {
    if (!searchTerm) return true;
    return getAugmentSearchText(name).includes(searchTerm);
  });
  const tierColorClass = { Sắt: '', Vàng: 'selected-gold', 'Bạch Kim': 'selected-purple' };
  if (!list.length) {
    return `<div class="augment-empty-state">Không thấy lõi nào khớp với từ khóa này.</div>`;
  }
  return list.map(a => `
    <div class="augment-card ${s.augments.includes(a) ? (tierColorClass[s.tier] || 'selected') : ''}"
      onclick="toggleAugment('${roundId}','${a}')">
      ${getAugmentIconUrl(a)
        ? `<img class="augment-icon-img" src="${getAugmentIconUrl(a)}" alt="${a}" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling?.classList.remove('hidden')">`
        : ''}
      <span class="augment-dot ${getAugmentIconUrl(a) ? 'hidden' : ''}"></span>
      <span class="augment-name">${a}</span>
    </div>
  `).join('');
}

function getAugmentIconUrl(augmentName) {
  return (typeof AUGMENT_ICON_MAP !== 'undefined' && AUGMENT_ICON_MAP[augmentName]) || '';
}

function getAugmentSearchText(augmentName) {
  const englishAlias = (typeof AUGMENT_SEARCH_ALIASES !== 'undefined' && AUGMENT_SEARCH_ALIASES[augmentName]) || '';
  return normalizeSearchText(`${augmentName} ${englishAlias}`);
}

function normalizeSearchText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function escapeHtmlAttr(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function setAugmentSearch(roundId, value) {
  const s = state.rounds[roundId];
  s.augmentSearch = value;
  const listEl = document.getElementById('augment-list');
  if (listEl) listEl.innerHTML = renderAugmentCards(roundId, s);
  saveCurrentGameState();
}

function selectTier(roundId, tier) {
  const s = state.rounds[roundId];
  s.tier = tier;
  s.augments = [];
  s.chosenAugment = null;
  s.augmentSearch = '';
  renderAugmentEditor(TFT_DATA.rounds.find(x => x.id === roundId), s);
  updatePromptPreview();
  buildTimeline();
  saveCurrentGameState();
}

function toggleAugment(roundId, augment) {
  const s = state.rounds[roundId];
  if (s.augments.includes(augment)) {
    s.augments = s.augments.filter(a => a !== augment);
    if (s.chosenAugment === augment) s.chosenAugment = null;
  } else {
    if (s.augments.length < 3) s.augments.push(augment);
  }
  renderAugmentEditor(TFT_DATA.rounds.find(x => x.id === roundId), s);
  updatePromptPreview();
  buildTimeline();
  saveCurrentGameState();
}

function chooseAugment(roundId, augment) {
  const s = state.rounds[roundId];
  s.chosenAugment = s.chosenAugment === augment ? null : augment;
  renderAugmentEditor(TFT_DATA.rounds.find(x => x.id === roundId), s);
  updatePromptPreview();
  saveCurrentGameState();
}

function getAugmentChipClass(tier) {
  return { Sắt: 'selected-blue', Vàng: 'selected-gold', 'Bạch Kim': 'selected-purple' }[tier] || 'selected-blue';
}

// ============================================================
// GOD EDITOR (Ân Huệ)
// ============================================================
function renderGodEditor(r, s) {
  const idx = TFT_DATA.rounds.findIndex(x => x.id === r.id);

  editorContent.innerHTML = `
    <div class="round-header">
      <div class="round-badge type-god">✨</div>
      <div>
        <div class="round-title">${r.label} — Ân Huệ</div>
        <div class="round-desc">${r.desc}</div>
      </div>
    </div>

    <div class="field-group">
      <div class="field-label"><span>🌟</span>Chọn vị thần / Ân Huệ</div>
      <div class="god-grid">
        ${TFT_DATA.gods.map(g => `
          <div class="god-card ${s.god === g.id ? 'selected' : ''}" onclick="selectGod('${r.id}','${g.id}')">
            <div class="god-icon">${g.icon}</div>
            <div class="god-name">${g.name}</div>
            <div class="god-desc">${g.desc}</div>
          </div>
        `).join('')}
      </div>
    </div>

    <div class="action-bar">
      ${idx > 0 ? `<button class="btn-nav btn-nav-prev" onclick="selectRound('${TFT_DATA.rounds[idx-1].id}')">← Trước</button>` : ''}
      ${idx < TFT_DATA.rounds.length-1 && s.god ? `<button class="btn-nav btn-nav-next" onclick="selectRound('${TFT_DATA.rounds[idx+1].id}')">Tiếp →</button>` : ''}
    </div>
  `;
}

function selectGod(roundId, godId) {
  const s = state.rounds[roundId];
  s.god = s.god === godId ? null : godId;
  renderGodEditor(TFT_DATA.rounds.find(x => x.id === roundId), s);
  updatePromptPreview();
  buildTimeline();
  saveCurrentGameState();
}

// ============================================================
// TAG INPUT
// ============================================================
function buildTagInput(field, roundId, current, suggestions, placeholder) {
  const id = `tag-${field}-${roundId}`;
  return `
    <div class="tag-wrapper">
      <div class="tag-container" id="${id}-container" onclick="document.getElementById('${id}-input').focus()">
        ${current.map((t, idx) => `
          <span class="tag">
            ${t.name}${t.stars ? `<span class="tag-star">${t.stars}★</span>` : ''}${t.qty > 1 ? `<span class="tag-qty">×${t.qty}</span>` : ''}
            <span class="tag-remove" onclick="removeTag('${field}','${roundId}',${idx},event)">×</span>
          </span>
        `).join('')}
        <input type="text" class="tag-input" id="${id}-input"
          placeholder="${current.length === 0 ? placeholder : ''}"
          autocomplete="off" />
      </div>
      <div class="tag-suggestions hidden" id="${id}-suggestions"></div>
    </div>
  `;
}

function getTagInputId(field, roundId) {
  return `tag-${field}-${roundId}-input`;
}

function focusTagInput(field, roundId) {
  requestAnimationFrame(() => {
    const input = document.getElementById(getTagInputId(field, roundId));
    if (input) input.focus();
  });
}

function focusNextTagInput(field, roundId) {
  const fieldOrder = ['champions', 'pool', 'items'];
  const currentIndex = fieldOrder.indexOf(field);
  const nextField = fieldOrder[currentIndex + 1];
  if (!nextField) return;
  const nextInput = document.getElementById(getTagInputId(nextField, roundId));
  if (nextInput) nextInput.focus();
}

function bindTagInput(field, roundId, suggestions) {
  const id = `tag-${field}-${roundId}`;
  const input = document.getElementById(`${id}-input`);
  const suggestBox = document.getElementById(`${id}-suggestions`);
  if (!input) return;

  let highlightIdx = -1;

  input.addEventListener('input', () => {
    const val = input.value.trim();
    if (!val) { suggestBox.classList.add('hidden'); return; }

    const matches = findSuggestionMatches(field, val, suggestions);

    if (matches.length === 0) { suggestBox.classList.add('hidden'); return; }

    highlightIdx = 0;
    suggestBox.innerHTML = matches.map((m, i) =>
      `<div class="tag-suggestion-item ${i === highlightIdx ? 'highlighted' : ''}" data-val="${escapeHtmlAttr(m.name)}" data-stars="${m.stars || ''}" data-idx="${i}">${formatSuggestionLabel(m)}</div>`
    ).join('');
    suggestBox.classList.remove('hidden');

    suggestBox.querySelectorAll('.tag-suggestion-item').forEach(el => {
      el.addEventListener('mousedown', (e) => {
        e.preventDefault();
        addTag(field, roundId, el.dataset.val, Number(el.dataset.stars || 0) || null);
        input.value = '';
        suggestBox.classList.add('hidden');
      });
    });
  });

  input.addEventListener('keydown', (e) => {
    const items = suggestBox.querySelectorAll('.tag-suggestion-item');
    if (e.key === 'ArrowDown') {
      highlightIdx = Math.min(highlightIdx + 1, items.length - 1);
      updateHighlight(items, highlightIdx);
    } else if (e.key === 'ArrowUp') {
      highlightIdx = Math.max(highlightIdx - 1, -1);
      updateHighlight(items, highlightIdx);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightIdx >= 0 && items[highlightIdx]) {
        addTag(field, roundId, items[highlightIdx].dataset.val, Number(items[highlightIdx].dataset.stars || 0) || null, true);
      } else if (input.value.trim()) {
        const parsed = parseTagInput(field, input.value.trim());
        addTag(field, roundId, parsed.name, parsed.stars, true, parsed.starsOnly, parsed.qtyOnly);
      }
      input.value = '';
      suggestBox.classList.add('hidden');
      highlightIdx = -1;
    } else if (e.key === 'Tab') {
      e.preventDefault();
      suggestBox.classList.add('hidden');
      focusNextTagInput(field, roundId);
    } else if (e.key === 'Backspace' && !input.value) {
      const s = state.rounds[roundId][field];
      if (s.length > 0) removeTag(field, roundId, s.length - 1, null, true);
    } else if (e.key === 'Escape') {
      suggestBox.classList.add('hidden');
    }
  });

  input.addEventListener('blur', () => {
    setTimeout(() => suggestBox.classList.add('hidden'), 150);
  });
}

function updateHighlight(items, idx) {
  items.forEach((el, i) => {
    el.classList.toggle('highlighted', i === idx);
  });
}

function formatSuggestionLabel(match) {
  return `${match.name}${match.stars ? ` <span class="tag-suggestion-meta">${match.stars}★</span>` : ''}`;
}

function parseTagInput(field, rawValue) {
  const value = String(rawValue || '').trim();
  if (!value) return { name: '', stars: null, starsOnly: false, qtyOnly: null, qty: null };

  if (field !== 'champions') {
    const qtyOnlyMatch = value.match(/^(\d+)$/);
    if (qtyOnlyMatch) {
      return { name: '', stars: null, starsOnly: false, qtyOnly: Number(qtyOnlyMatch[1]) || null, qty: null };
    }
    return { name: value, stars: null, starsOnly: false, qtyOnly: null, qty: null };
  }

  const qtyOnlyMatch = value.match(/^(\d+)$/);
  if (qtyOnlyMatch) {
    return {
      name: '',
      stars: null,
      starsOnly: false,
      qtyOnly: Number(qtyOnlyMatch[1]) || null,
      qty: null,
    };
  }

  const starsOnlyMatch = value.match(/^([123])\s*(?:sao|\*)$/i);
  if (starsOnlyMatch) {
    return {
      name: '',
      stars: Number(starsOnlyMatch[1]) || null,
      starsOnly: true,
      qtyOnly: null,
      qty: null,
    };
  }

  const match = value.match(/^(.*?)(?:[\s,/-]+([123])\s*(?:sao|\*))$/i);
  if (!match) return { name: value, stars: null, starsOnly: false, qtyOnly: null, qty: null };

  return {
    name: match[1].trim(),
    stars: Number(match[2]) || null,
    starsOnly: false,
    qtyOnly: null,
    qty: null,
  };
}

function findSuggestionMatches(field, rawQuery, suggestions) {
  const parsed = parseTagInput(field, rawQuery);
  const query = normalizeSearchText(parsed.name);
  if (!query) return [];

  return suggestions
    .map(name => {
      const score = getSuggestionScore(field, query, name);
      if (score === -1) return null;
      return { name, stars: parsed.stars, score };
    })
    .filter(Boolean)
    .sort((a, b) => a.score - b.score || a.name.localeCompare(b.name))
    .slice(0, 10);
}

function getSuggestionScore(field, normalizedQuery, suggestion) {
  const suggestionText = getSuggestionSearchText(field, suggestion);
  if (!suggestionText.includes(normalizedQuery)) return -1;
  if (suggestionText === normalizedQuery) return 0;
  if (suggestionText.startsWith(normalizedQuery)) return 1;
  if (suggestionText.split(' ').some(part => part.startsWith(normalizedQuery))) return 2;
  return 3;
}

function getSuggestionSearchText(field, suggestion) {
  const normalizedSuggestion = normalizeSearchText(suggestion);
  const aliases = TAG_SEARCH_ALIASES[field]?.[normalizedSuggestion] || [];
  return [normalizedSuggestion, ...aliases.map(normalizeSearchText)].join(' ');
}

function addTag(field, roundId, value, stars = null, keepFocus = false, starsOnly = false, qtyOnly = null) {
  const s = state.rounds[roundId];

  if (qtyOnly) {
    s.pendingTagQty[field] = qtyOnly;
    if (keepFocus) focusTagInput(field, roundId);
    return;
  }

  if (field === 'champions' && starsOnly && stars) {
    const lastChampion = s[field][s[field].length - 1];
    if (lastChampion) {
      lastChampion.stars = stars;
      selectRound(roundId);
      updatePromptPreview();
      buildTimeline();
      if (keepFocus) focusTagInput(field, roundId);
    }
    return;
  }

  if (!value) return;
  const pendingQty = s.pendingTagQty[field];
  const existing = s[field].find(t => t.name === value && (t.stars || null) === (stars || null));
  if (existing) {
    existing.qty += pendingQty || 1;
  } else {
    s[field].push({ name: value, qty: pendingQty || 1, stars: stars || null });
  }
  delete s.pendingTagQty[field];
  selectRound(roundId);
  updatePromptPreview();
  buildTimeline();
  saveCurrentGameState();
  if (keepFocus) focusTagInput(field, roundId);
}

function removeTag(field, roundId, index, event, keepFocus = false) {
  if (event) event.stopPropagation();
  const s = state.rounds[roundId];
  const existing = s[field][index];
  if (existing) {
    if (existing.qty > 1) existing.qty--;
    else s[field] = s[field].filter((_, idx) => idx !== index);
  }
  selectRound(roundId);
  updatePromptPreview();
  buildTimeline();
  saveCurrentGameState();
  if (keepFocus) focusTagInput(field, roundId);
}

// ============================================================
// PROMPT GENERATION
// ============================================================
function buildPromptSections() {
  const sections = [];

  TFT_DATA.rounds.forEach(r => {
    const s = state.rounds[r.id];
    const lines = [];

    if (r.type === 'round') {
      const hasSth = s.champions.length > 0 || s.pool.length > 0 || s.items.length > 0;
      if (!hasSth) return;

      lines.push(`### ${r.label}:`);
      const fmtTag = t => {
        const base = `${t.name}${t.stars ? ` ${t.stars} sao` : ''}`;
        return t.qty > 1 ? `${t.qty}x ${base}` : base;
      };
      if (s.champions.length > 0)
        lines.push(`Tướng trên sàn: ${s.champions.map(fmtTag).join(', ')}`);
      if (s.pool.length > 0)
        lines.push(`Bể tướng đang bán: ${s.pool.map(fmtTag).join(', ')}`);
      if (s.items.length > 0)
        lines.push(`Trang bị/Mảnh: ${s.items.map(fmtTag).join(', ')}`);
      lines.push('');

    } else if (r.type === 'augment') {
      if (!s.tier || s.augments.length === 0) return;
      lines.push(`### ${r.label} — Chọn Lõi (bậc ${s.tier}):`);
      lines.push(`Lobby chọn lõi ${s.tier}. Trên màn hình tôi có 3 lõi: ${s.augments.join(', ')}.`);
      if (s.chosenAugment) {
        lines.push(`Tôi định chọn: **${s.chosenAugment}** — cho ý kiến nhé.`);
      } else {
        lines.push(`Nếu không ổn kêu tôi roll option pick lõi.`);
      }
      lines.push('');

    } else if (r.type === 'god') {
      if (!s.god) return;
      const god = TFT_DATA.gods.find(g => g.id === s.god);
      if (!god) return;
      lines.push(`### ${r.label} — Ân Huệ:`);
      lines.push(`Lobby ân huệ, tôi chọn **${god.name}** (${god.desc}).`);
      lines.push('');
    }

    const content = lines.join('\n').trim();
    if (content) {
      sections.push({
        roundId: r.id,
        title: r.label,
        content,
      });
    }
  });

  return sections;
}

function generatePrompt() {
  const quickPrompt = buildQuickDecisionPrompt();
  const timelinePrompt = buildPromptSections().map(section => section.content).join('\n\n').trim();
  return [quickPrompt, timelinePrompt].filter(Boolean).join('\n\n').trim();
}

function updatePromptPreview() {
  const sections = [];
  const quickPrompt = buildQuickDecisionPrompt();
  if (quickPrompt) {
    sections.push({ roundId: 'quick', title: 'Quick Decision', content: quickPrompt });
  }
  sections.push(...buildPromptSections());
  if (!sections.length) {
    promptPreview.innerHTML = '<span class="prompt-empty">Prompt sẽ hiện ở đây khi bạn điền thông tin...</span>';
    return;
  }

  promptPreview.innerHTML = sections.map((section, index) => {
    const bodyHtml = section.content
      .split('\n')
      .map(line => {
        if (line.startsWith('### ')) {
          return `<div class="prompt-line-header">${line.replace('### ','')}</div>`;
        }
        if (line === '') return '';
        const rendered = line.replace(/\*\*(.*?)\*\*/g, '<strong style="color:var(--accent-gold)">$1</strong>');
        return `<div class="prompt-line prompt-line-content">${rendered}</div>`;
      })
      .join('');

    return `
      <div class="prompt-section ${index > 0 ? 'with-divider' : ''}">
        <div class="prompt-section-actions">
          <button class="btn btn-sm btn-ghost prompt-copy-btn" onclick="copyPromptSection('${section.roundId}')">Copy</button>
        </div>
        ${bodyHtml}
      </div>
    `;
  }).join('');
}

// ============================================================
// COPY PROMPT
// ============================================================
function copyPrompt() {
  const prompt = generatePrompt();
  if (!prompt) { showToast('Chưa có dữ liệu để copy!', 'warn'); return; }
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(prompt)
      .then(() => showToast('✅ Đã copy prompt vào clipboard!'))
      .catch(() => fallbackCopyPrompt(prompt));
    return;
  }
  fallbackCopyPrompt(prompt);
}

function copyPromptSection(roundId) {
  const allSections = [];
  const quickPrompt = buildQuickDecisionPrompt();
  if (quickPrompt) allSections.push({ roundId: 'quick', title: 'Quick Decision', content: quickPrompt });
  allSections.push(...buildPromptSections());
  const section = allSections.find(item => item.roundId === roundId);
  if (!section?.content) {
    showToast('Section này chưa có dữ liệu để copy!', 'warn');
    return;
  }
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(section.content)
      .then(() => showToast(`✅ Đã copy ${section.title}!`))
      .catch(() => fallbackCopyPrompt(section.content));
    return;
  }
  fallbackCopyPrompt(section.content);
}

function fallbackCopyPrompt(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.position = 'fixed';
  ta.style.top = '0';
  ta.style.left = '0';
  ta.style.width = '1px';
  ta.style.height = '1px';
  ta.style.padding = '0';
  ta.style.border = '0';
  ta.style.outline = '0';
  ta.style.boxShadow = 'none';
  ta.style.background = 'transparent';
  ta.style.opacity = '0';
  ta.style.pointerEvents = 'none';
  document.body.appendChild(ta);

  const selection = document.getSelection();
  const originalRange = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;

  ta.focus();
  ta.select();
  ta.setSelectionRange(0, ta.value.length);

  try {
    const ok = document.execCommand('copy');
    showToast(ok ? '✅ Đã copy prompt vào clipboard!' : 'Không thể copy tự động. Hãy thử lại.', ok ? 'success' : 'warn');
  } catch {
    showToast('Không thể copy tự động. Hãy thử lại.', 'warn');
  } finally {
    if (selection) {
      selection.removeAllRanges();
      if (originalRange) selection.addRange(originalRange);
    }
    ta.remove();
  }
}

function showToast(msg, type = 'success') {
  const old = document.querySelector('.toast');
  if (old) old.remove();
  const t = document.createElement('div');
  t.className = 'toast';
  t.style.borderColor = type === 'warn' ? 'var(--accent-gold)' : 'var(--accent-green)';
  t.style.color = type === 'warn' ? 'var(--accent-gold)' : 'var(--accent-green)';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2500);
}

// ============================================================
// RESET
// ============================================================
let _resetPending = false;

function resetAll() {
  if (!_resetPending) {
    // First click: ask for confirmation via toast
    _resetPending = true;
    const old = document.querySelector('.toast');
    if (old) old.remove();
    const t = document.createElement('div');
    t.className = 'toast';
    t.style.borderColor = 'var(--accent-red)';
    t.style.color = 'var(--accent-red)';
    t.style.display = 'flex';
    t.style.gap = '12px';
    t.style.alignItems = 'center';
    t.innerHTML = `
      <span>⚠️ Reset toàn bộ dữ liệu?</span>
      <button onclick="doReset()" style="
        background:var(--accent-red);color:#fff;border:none;border-radius:6px;
        padding:4px 12px;cursor:pointer;font-size:12px;font-weight:600;">Xác nhận</button>
    `;
    document.body.appendChild(t);
    // Auto-cancel after 4s
    setTimeout(() => { t.remove(); _resetPending = false; }, 4000);
  } else {
    doReset();
  }
}

function doReset() {
  _resetPending = false;
  const old = document.querySelector('.toast');
  if (old) old.remove();

  archiveCurrentGameState();
  state.rounds = createEmptyRoundsState();
  state.currentRoundId = null;
  editorContent.classList.add('hidden');
  editorPlaceholder.classList.remove('hidden');
  buildTimeline();
  updatePromptPreview();
  saveCurrentGameState();
  showToast('✅ Đã reset toàn bộ!');
}

// ============================================================
// INIT
// ============================================================
buildTimeline();
updatePromptPreview();
setAppMode(appMode);

// ============================================================
// META COMPS PANEL
// ============================================================
const metaFilters = { tier: 'all', diff: 'all', play: 'all' };

function openMetaPanel() {
  document.getElementById('meta-modal').classList.remove('hidden');
  renderMetaComps();
  document.addEventListener('keydown', _handleMetaEsc);
}

function closeMetaPanel() {
  document.getElementById('meta-modal').classList.add('hidden');
  document.removeEventListener('keydown', _handleMetaEsc);
}

function closeMetaOnBackdrop(e) {
  if (e.target === document.getElementById('meta-modal')) closeMetaPanel();
}

function _handleMetaEsc(e) {
  if (e.key === 'Escape') closeMetaPanel();
}

function setFilter(type, val, el) {
  metaFilters[type] = val;
  // Update active pill in that group
  const groupId = { tier: 'filter-tier', diff: 'filter-diff', play: 'filter-play' }[type];
  document.querySelectorAll(`#${groupId} .filter-pill`).forEach(p => p.classList.remove('active'));
  el.classList.add('active');
  renderMetaComps();
}

function renderMetaComps() {
  const grid = document.getElementById('meta-comp-grid');
  if (!grid) return;

  let comps = META_COMPS;

  // Apply filters
  if (metaFilters.tier !== 'all')
    comps = comps.filter(c => c.tier === metaFilters.tier);
  if (metaFilters.diff !== 'all')
    comps = comps.filter(c => c.difficulty === metaFilters.diff);
  if (metaFilters.play !== 'all')
    comps = comps.filter(c => c.playstyle.includes(metaFilters.play));

  if (comps.length === 0) {
    grid.innerHTML = `
      <div class="meta-no-results">
        <div class="no-results-icon">🔍</div>
        Không tìm thấy comp nào với bộ lọc này.
      </div>
    `;
    return;
  }

  const diffClass = { EASY: 'badge-easy', MEDIUM: 'badge-medium', HARD: 'badge-hard' };
  const diffLabel = { EASY: '🟢 Dễ', MEDIUM: '🟡 TB', HARD: '🔴 Khó' };

  grid.innerHTML = comps.map(c => `
    <div class="comp-card" data-tier="${c.tier}">
      <div class="comp-card-top">
        <div class="comp-tier-badge">${c.tier}</div>
        <div class="comp-name">${c.name}</div>
        <div class="comp-badges">
          <span class="comp-badge ${diffClass[c.difficulty]}">${diffLabel[c.difficulty]}</span>
          <span class="comp-badge badge-playstyle">${c.playstyle}</span>
        </div>
        <div class="comp-champs">
          ${c.key_champions.slice(0, 8).map(ch => `<span class="comp-champ-tag">${ch}</span>`).join('')}
          ${c.key_champions.length > 8 ? `<span class="comp-champ-tag">+${c.key_champions.length-8}</span>` : ''}
        </div>
      </div>
      ${c.item_priority && c.item_priority.length > 0 ? `
        <div class="comp-items">
          <span class="comp-item-tag">🎒</span>
          ${c.item_priority.slice(0, 3).map(it => `<span class="comp-item-tag">${it}</span>`).join('')}
        </div>
      ` : ''}
      ${c.tip ? `<div class="comp-tip">💡 ${c.tip}</div>` : ''}
    </div>
  `).join('');
}

// ============================================================
// AI CHATBOT FUNCTIONALITY
// ============================================================

let aiChatOpen = false;
let chatMessages = [
  {"role": "system", "content": "You are an expert Teamfight Tactics (TFT) assistant for Patch 17.1. Provide helpful, short, concise, and professional gameplay advice in Vietnamese. Format important parts with bold and inline code. Use the provided context about the current game state to guide your advice. The user wants the lowest-effort line that still maximizes placement and pushes for top 1 whenever the spot allows it."}
];

function toggleAIChat() {
  const window = document.getElementById('ai-chat-window');
  aiChatOpen = !aiChatOpen;
  if (aiChatOpen) {
    window.classList.remove('hidden');
    document.getElementById('ai-chat-input').focus();
    // Khởi tạo mặc định nếu rỗng
    if(!localStorage.getItem('ai_apikey')) {
      localStorage.setItem('ai_apikey', 'psk_LpxORhyXYEYZestCeeRgFXFPv/t2YqfG');
      localStorage.setItem('ai_baseurl', '/api/v1');
      localStorage.setItem('ai_model', 'gpt-5.3-codex');
    }
  } else {
    window.classList.add('hidden');
  }
}

function openAISettings() {
  document.getElementById('ai-settings-modal').classList.remove('hidden');
  document.getElementById('cfg-apikey').value = localStorage.getItem('ai_apikey') || 'psk_LpxORhyXYEYZestCeeRgFXFPv/t2YqfG';
  document.getElementById('cfg-baseurl').value = localStorage.getItem('ai_baseurl') || '/api/v1';
  document.getElementById('cfg-model').value = localStorage.getItem('ai_model') || 'gpt-5.3-codex';
}

function closeAISettings() {
  document.getElementById('ai-settings-modal').classList.add('hidden');
}

function closeAISettingsOnBackdrop(e) {
  if (e.target.id === 'ai-settings-modal') closeAISettings();
}

function saveAISettings() {
  localStorage.setItem('ai_apikey', document.getElementById('cfg-apikey').value);
  localStorage.setItem('ai_baseurl', document.getElementById('cfg-baseurl').value);
  localStorage.setItem('ai_model', document.getElementById('cfg-model').value);
  closeAISettings();
  showToast('✅ Đã lưu cấu hình AI!');
}

function handleChatEnter(e) {
  if (e.key === 'Enter') {
    e.preventDefault();
    sendChatMessage();
  }
}

function formatMetaCompLine(comp) {
  const parts = [
    `${comp.name}`,
    `Tier ${comp.tier}`,
    comp.difficulty ? `Độ khó: ${comp.difficulty}` : null,
    comp.playstyle ? `Lối chơi: ${comp.playstyle}` : null,
    comp.traits?.length ? `Tộc hệ: ${comp.traits.join(', ')}` : null,
    comp.key_champions?.length ? `Champ chủ chốt: ${comp.key_champions.join(', ')}` : null,
    comp.item_priority?.length ? `Ưu tiên đồ: ${comp.item_priority.join(', ')}` : null,
    comp.tip ? `Ghi chú: ${comp.tip}` : null,
  ].filter(Boolean);

  return `- ${parts.join(' | ')}`;
}

function buildMetaCompsContext() {
  const tierOrder = ['S', 'A', 'B', 'C', 'X'];
  return tierOrder.map(tier => {
    const comps = META_COMPS.filter(comp => comp.tier === tier);
    if (!comps.length) return '';
    const tierLabel = tier === 'X' ? 'Tier X (situational)' : `Tier ${tier}`;
    return [`#### ${tierLabel}`, ...comps.map(formatMetaCompLine)].join('\n');
  }).filter(Boolean).join('\n\n');
}

function buildMetaCompStatsContext() {
  const tierOrder = ['S', 'A', 'B', 'C', 'X'];
  const counts = tierOrder.map(tier => {
    const count = META_COMPS.filter(comp => comp.tier === tier).length;
    const label = tier === 'X' ? 'X (situational)' : tier;
    return `${label}: ${count}`;
  });

  return `Tổng số meta comp trong dataset hiện tại: ${META_COMPS.length}. Số lượng theo tier: ${counts.join(', ')}.`;
}

function getAIContext() {
  // Build context string from current game state
  let promptPreview = generatePrompt() || "Chưa có dữ liệu vòng đấu nào được chọn. Người chơi đang ở sảnh chờ hoặc chưa cập nhật số liệu.";
  const metaCompStats = buildMetaCompStatsContext();
  const metaCompContext = buildMetaCompsContext();
  const previousGameContext = getPreviousGameContext();
  return `### USER GOAL:\nNgười chơi muốn bỏ ít công nhất nhưng vẫn leo rank hiệu quả nhất. Khi có nhiều line tương đương, hãy ưu tiên line dễ đánh, ít xoay bài, ít pivot, ít yêu cầu nhớ nhiều mốc nhỏ. Tuy vậy mục tiêu cuối cùng vẫn là tối đa hóa placement và phải chỉ ra line/top cap có khả năng top 1 khi spot đủ đẹp.\n\n### CURRENT GAME STATE:\n${promptPreview}\n\n${previousGameContext ? `${previousGameContext}\n\n` : ''}${STRATEGY_GUIDE_CONTEXT}\n\n### PATCH 17.1 META COMPS:\nDưới đây là dữ liệu meta comp cần dùng để tư vấn. Tier X là đội hình tình huống, chỉ đề xuất khi điều kiện phù hợp.\n${metaCompStats}\nKhi người chơi hỏi có bao nhiêu bài thuộc một tier, hãy trả lời đúng theo dataset này, không tự suy diễn từ kiến thức bên ngoài.\n\n${metaCompContext}`;
}

async function sendChatMessage() {
  const inputEl = document.getElementById('ai-chat-input');
  const text = inputEl.value.trim();
  if (!text) return;

  const apiKey = localStorage.getItem('ai_apikey') || 'psk_LpxORhyXYEYZestCeeRgFXFPv/t2YqfG';
  const baseUrl = localStorage.getItem('ai_baseurl') || '/api/v1';
  const modelName = localStorage.getItem('ai_model') || 'gpt-5.3-codex';

  inputEl.value = '';
  appendChatMessage(text, 'user');
  
  // Set system prompt dynamically with the latest context from the UI
  chatMessages[0].content = `You are an expert Teamfight Tactics (TFT) assistant for Patch 17.1. Provide helpful, short, concise, and professional gameplay advice in Vietnamese. Format important parts with bold and inline code. The user wants the lowest-effort line that still produces the highest rank possible, and should be pushed toward top-1 lines whenever realistic for the spot. \n\n${getAIContext()}`;
  
  chatMessages.push({"role": "user", "content": text});
  
  const loadingEl = appendChatLoading();
  const btnSend = document.querySelector('.btn-send');
  btnSend.disabled = true;

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: modelName,
        messages: chatMessages,
        temperature: 0.7,
        stream: true
      })
    });

    loadingEl.remove();
    btnSend.disabled = false;

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData?.error?.message || errData?.detail || `Error API: ${res.status}`);
    }

    // Stream the response token by token
    const msgEl = appendChatMessage('', 'bot');
    const contentEl = msgEl.querySelector('.ai-msg-content');
    const body = document.getElementById('ai-chat-body');
    let botReply = '';

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const raw = line.slice(6).trim();
        if (raw === '[DONE]') break;
        try {
          const chunk = JSON.parse(raw);
          const token = chunk.choices?.[0]?.delta?.content;
          if (token) {
            botReply += token;
            let html = botReply.replace(/\n/g, '<br/>');
            html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            html = html.replace(/`(.*?)`/g, '<code>$1</code>');
            contentEl.innerHTML = html;
            body.scrollTop = body.scrollHeight;
          }
        } catch {}
      }
    }

    chatMessages.push({"role": "assistant", "content": botReply});

  } catch (err) {
    loadingEl.remove();
    btnSend.disabled = false;
    appendChatMessage(`*Lỗi gọi API: ${err.message}. Vui lòng kiểm tra lại URL hoặc API Key ở phần Cài đặt AI.*`, 'bot');
    chatMessages.pop();
  }
}

function appendChatMessage(text, role) {
  const body = document.getElementById('ai-chat-body');
  const el = document.createElement('div');
  el.className = `ai-msg ${role}`;
  
  // Basic markdown formatting
  let htmlText = text.replace(/\n/g, '<br/>');
  if (role === 'bot') {
    htmlText = htmlText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    htmlText = htmlText.replace(/\`(.*?)\`/g, '<code>$1</code>');
  }
  
  el.innerHTML = `<div class="ai-msg-content">${htmlText}</div>`;
  body.appendChild(el);
  body.scrollTop = body.scrollHeight;
  return el;
}

function appendChatLoading() {
  const body = document.getElementById('ai-chat-body');
  const el = document.createElement('div');
  el.className = `ai-msg bot`;
  el.innerHTML = `
    <div class="ai-msg-content">
      <div class="typing-dots">
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
      </div>
    </div>
  `;
  body.appendChild(el);
  body.scrollTop = body.scrollHeight;
  return el;
}
