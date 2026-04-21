// ── Tool Calling Unmasked - Presentation Engine ──

// ── Step definitions ──
// Each step is { stage, action } where action is a function.
// ArrowRight advances to the next step, ArrowLeft goes back.

const steps = [];
let currentStep = -1;
let isAnimating = false;

// ── DOM refs ──
const leftPanel = document.getElementById('left-panel');
const rightPanel = document.getElementById('right-panel');
const chatMessages = document.getElementById('chat-messages');
const chatInputText = document.getElementById('chat-input-text');
const chatCursor = document.getElementById('chat-cursor');
const chatInputArea = document.getElementById('chat-input-area');
const chatHeaderTitle = document.querySelector('.chat-header-title');
const rightPanelContent = document.getElementById('right-panel-content');
const rightPanelTitle = document.querySelector('.right-panel-title');
const progressDots = document.getElementById('progress-dots');
const progressLabel = document.getElementById('progress-label');

// ── Snapshot/restore for stage transitions ──
// Stores the right panel innerHTML at key moments so backward navigation
// can restore it without replaying every step.
const panelSnapshots = {};

const STAGE_NAMES = [
  '',
  'The Chat Interface',
  "It's Just a Script",
  'A Tool Call on the Wire',
  'Multi-turn: A Real Task',
  'Strip the Template'
];

const TOTAL_STAGES = 5;

// ── Utility functions ──

function scrollChatToBottom() {
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function addChatMessage(role, html) {
  const msg = document.createElement('div');
  msg.className = `message ${role}`;
  msg.innerHTML = html;
  chatMessages.appendChild(msg);
  scrollChatToBottom();
  return msg;
}

function removeChatMessage(msg) {
  if (msg && msg.parentNode) {
    msg.parentNode.removeChild(msg);
  }
}

function showTypingIndicator() {
  const msg = document.createElement('div');
  msg.className = 'message assistant';
  msg.id = 'typing-indicator';
  msg.innerHTML = '<div class="typing-indicator"><span></span><span></span><span></span></div>';
  chatMessages.appendChild(msg);
  scrollChatToBottom();
  return msg;
}

function removeTypingIndicator() {
  const el = document.getElementById('typing-indicator');
  if (el) el.remove();
}

function setInputText(text) {
  chatInputText.textContent = text;
}

function clearInput() {
  chatInputText.textContent = '';
}

function setRightPanelContent(html) {
  rightPanelContent.innerHTML = html;
}

function appendRightPanelContent(html) {
  rightPanelContent.innerHTML += html;
  rightPanelContent.scrollTop = rightPanelContent.scrollHeight;
}

function showPanelOverlay(color, colorDim, html) {
  hidePanelOverlay();
  const overlay = document.createElement('div');
  overlay.id = 'panel-overlay';
  overlay.innerHTML = `<div class="overlay-card" style="color:${color};border:1px dashed ${color};background:${colorDim};">${html}</div>`;
  document.getElementById('right-panel').appendChild(overlay);
}

function hidePanelOverlay() {
  const existing = document.getElementById('panel-overlay');
  if (existing) existing.remove();
}

function snapshotRightPanel(key) {
  panelSnapshots[key] = {
    title: rightPanelTitle.textContent,
    content: rightPanelContent.innerHTML
  };
}

function restoreRightPanel(key) {
  const snap = panelSnapshots[key];
  if (snap) {
    rightPanelTitle.textContent = snap.title;
    rightPanelContent.innerHTML = snap.content;
  }
}

// ── Progress bar ──

function initProgressBar() {
  progressDots.innerHTML = '';
  for (let i = 1; i <= TOTAL_STAGES; i++) {
    const dot = document.createElement('div');
    dot.className = 'progress-dot';
    dot.dataset.stage = i;
    dot.addEventListener('click', () => jumpToStage(i));
    progressDots.appendChild(dot);
  }
  updateProgressBar(1);
}

function updateProgressBar(stage) {
  const dots = progressDots.querySelectorAll('.progress-dot');
  dots.forEach(dot => {
    const s = parseInt(dot.dataset.stage);
    dot.className = 'progress-dot';
    if (s < stage) dot.classList.add('completed');
    else if (s === stage) dot.classList.add('active');
  });
  progressLabel.textContent = `${stage} / ${TOTAL_STAGES}  ${STAGE_NAMES[stage] || ''}`;
}

// ── Step builder helpers ──

function addStep(stage, forward, backward) {
  steps.push({ stage, forward, backward });
}

// ── Raw-string / template helpers ──
// Shared by Stage 2 and Stage 5. Builds the ChatML-templated string view.

const SPECIAL_TOKEN_RE = /(&lt;\|[a-z_]+\|&gt;)/g;

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Render a chunk of template text, styling ChatML special tokens distinctly.
function renderTemplate(text) {
  return esc(text).replace(SPECIAL_TOKEN_RE, '<span class="sp-tok">$1</span>');
}

// Fly a clone of a source element to a target element's position, then call
// onLand. Uses absolute positioning inside the right panel.
function flyToTarget(sourceEl, targetEl, onLand) {
  const panel = document.getElementById('right-panel');
  const panelRect = panel.getBoundingClientRect();
  const srcRect = sourceEl.getBoundingClientRect();
  const dstRect = targetEl.getBoundingClientRect();

  const clone = sourceEl.cloneNode(true);
  clone.removeAttribute('id');
  clone.classList.add('flying-clone');
  clone.style.position = 'absolute';
  clone.style.left = (srcRect.left - panelRect.left) + 'px';
  clone.style.top  = (srcRect.top  - panelRect.top)  + 'px';
  clone.style.width = srcRect.width + 'px';
  clone.style.margin = '0';
  clone.style.zIndex = '20';
  panel.appendChild(clone);

  sourceEl.classList.add('lifted');

  // Force layout then animate.
  void clone.offsetWidth;
  const dx = dstRect.left - srcRect.left;
  const dy = dstRect.top  - srcRect.top;
  clone.style.transition = 'transform 0.55s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.55s ease';
  clone.style.transform = `translate(${dx}px, ${dy}px)`;

  setTimeout(() => {
    clone.remove();
    if (onLand) onLand();
  }, 600);
}

// Simple helper that toggles the "landed" state of a target slot.
function landField(targetEl, text) {
  targetEl.textContent = text;
  targetEl.classList.add('landed');
}
function unlandField(sourceEl, targetEl, placeholder) {
  targetEl.textContent = placeholder;
  targetEl.classList.remove('landed');
  if (sourceEl) sourceEl.classList.remove('lifted');
}

// ── Define all presentation steps ──

function defineSteps() {

  // ════════════════════════════════════════
  // STAGE 1: The Chat Interface
  // ════════════════════════════════════════

  // Step: Title slide
  addStep(1,
    () => {
      clearInput();
      rightPanelTitle.textContent = '';
      setRightPanelContent(`
        <div class="title-slide">
          <h1>Tool Calling Unmasked</h1>
          <div class="subtitle">What tool calls look like on the wire — and why it's all just text completion</div>
          <div class="author">James Coward</div>
        </div>
      `);
    },
    () => {}
  );

  // Step: User types question in input
  addStep(1,
    () => { setInputText('What is the capital of France?'); },
    () => { clearInput(); }
  );

  // Step: User "sends" the message
  let msg1user;
  addStep(1,
    () => {
      clearInput();
      msg1user = addChatMessage('user', 'What is the capital of France?');
    },
    () => {
      removeChatMessage(msg1user);
      setInputText('What is the capital of France?');
    }
  );

  // Step: Typing indicator
  addStep(1,
    () => { showTypingIndicator(); },
    () => { removeTypingIndicator(); }
  );

  // Step: Assistant responds
  let msg1asst;
  addStep(1,
    () => {
      removeTypingIndicator();
      msg1asst = addChatMessage('assistant', 'The capital of France is Paris.');
    },
    () => {
      removeChatMessage(msg1asst);
      showTypingIndicator();
    }
  );

  // ════════════════════════════════════════
  // STAGE 2: "It's just a script"
  // ════════════════════════════════════════
  //
  // Reveal: the model isn't taking JSON messages — it's completing a single
  // templated string. Build that string up, let the assistant's reply appear
  // as completion, then append a second turn.

  const tmplSystem   = '<|im_start|>system\nYou are a helpful assistant.<|im_end|>\n';
  const tmplUser1    = '<|im_start|>user\nWhat is the capital of France?<|im_end|>\n';
  const tmplAsstOpen = '<|im_start|>assistant\n';
  const tmplAsstBody = 'The capital of France is Paris.';
  const tmplAsstEnd  = '<|im_end|>\n';
  const tmplUser2    = '<|im_start|>user\nWhat about Germany?<|im_end|>\n';
  const tmplAsstBody2 = 'The capital of Germany is Berlin.';

  function setRawBuffer(contentText, options = {}) {
    const showCursor = options.cursor !== false;
    rightPanelTitle.textContent = 'The prompt, after templating';
    setRightPanelContent(`
      <div class="raw-string-view">
        <div class="raw-string-header">prompt (one big string)</div>
        <pre class="raw-string-body" id="raw-buffer">${renderTemplate(contentText)}${showCursor ? '<span class="raw-cursor blink">▋</span>' : ''}</pre>
      </div>
    `);
  }

  // Helper: append text to the raw buffer (used for both instant forward and
  // replay after backward nav).
  function rebuildRaw(contentText, showCursor) {
    const buf = document.getElementById('raw-buffer');
    if (!buf) return;
    buf.innerHTML = renderTemplate(contentText) + (showCursor
      ? '<span class="raw-cursor blink">▋</span>'
      : '');
    rightPanelContent.scrollTop = rightPanelContent.scrollHeight;
  }

  // 2.1 — Transition: swap the "title" right panel for the raw template buffer
  //       showing just the system prompt and pending user turn.
  let stage2Buffer = '';
  addStep(2,
    () => {
      stage2Buffer = tmplSystem + tmplUser1 + tmplAsstOpen;
      setRawBuffer(stage2Buffer);
    },
    () => {
      rightPanelTitle.textContent = '';
      setRightPanelContent(`
        <div class="title-slide">
          <h1>Tool Calling Unmasked</h1>
          <div class="subtitle">What tool calls look like on the wire — and why it's all just text completion</div>
          <div class="author">James Coward</div>
        </div>
      `);
    }
  );

  // 2.2 — The model completes the assistant turn
  addStep(2,
    () => {
      stage2Buffer += tmplAsstBody + tmplAsstEnd;
      rebuildRaw(stage2Buffer, true);
    },
    () => {
      stage2Buffer = tmplSystem + tmplUser1 + tmplAsstOpen;
      rebuildRaw(stage2Buffer, true);
    }
  );

  // 2.3 — Second user turn appears (same string, just longer)
  addStep(2,
    () => {
      stage2Buffer += tmplUser2 + tmplAsstOpen;
      rebuildRaw(stage2Buffer, true);
    },
    () => {
      stage2Buffer = tmplSystem + tmplUser1 + tmplAsstOpen + tmplAsstBody + tmplAsstEnd;
      rebuildRaw(stage2Buffer, true);
    }
  );

  // 2.4 — Second assistant completion
  addStep(2,
    () => {
      stage2Buffer += tmplAsstBody2 + tmplAsstEnd;
      rebuildRaw(stage2Buffer, true);
    },
    () => {
      stage2Buffer = tmplSystem + tmplUser1 + tmplAsstOpen + tmplAsstBody + tmplAsstEnd + tmplUser2 + tmplAsstOpen;
      rebuildRaw(stage2Buffer, true);
    }
  );

  // 2.5 — The reveal callout
  addStep(2,
    () => {
      showPanelOverlay('var(--orange)', 'var(--orange-dim)',
        `We're basically getting it to write a script<br>of a chat between a bot and a person.`
      );
      snapshotRightPanel('end-of-stage-2');
    },
    () => { hidePanelOverlay(); }
  );

  // ════════════════════════════════════════
  // STAGE 3: A tool call on the wire
  // ════════════════════════════════════════
  //
  // Swap raw template view for real API JSON, then animate named fields
  // lifting out and landing inside a rendered function call.

  // 3.1 — New user question (technical example)
  addStep(3,
    () => {
      hidePanelOverlay();
      setInputText('How many lines are in app.js?');
    },
    () => {
      clearInput();
      showPanelOverlay('var(--orange)', 'var(--orange-dim)',
        `We're basically getting it to write a script<br>of a chat between a bot and a person.`
      );
    }
  );

  // 3.2 — User sends; right panel transitions to JSON view with empty call slots
  let msgStage3User;
  addStep(3,
    () => {
      clearInput();
      msgStage3User = addChatMessage('user', 'How many lines are in app.js?');
      rightPanelTitle.textContent = 'API response';
      setRightPanelContent(`
        <div class="wire-view">
          <div class="wire-label">Raw API response</div>
          <pre class="json-block" id="stage3-json"><span class="json-bracket">{</span>
  <span class="json-key">"stop_reason"</span>: <span class="json-string">"tool_use"</span>,
  <span class="json-key">"content"</span>: [<span class="json-bracket">{</span>
    <span class="json-key">"type"</span>: <span class="json-string">"tool_use"</span>,
    <span class="json-key">"id"</span>: <span class="json-string" id="src-id">"toolu_01A..."</span>,
    <span class="json-key">"name"</span>: <span class="json-string" id="src-name">"read_file"</span>,
    <span class="json-key">"input"</span>: <span class="json-bracket">{</span> <span class="json-key">"path"</span>: <span class="json-string" id="src-path">"app.js"</span> <span class="json-bracket">}</span>
  <span class="json-bracket">}</span>]
<span class="json-bracket">}</span></pre>

          <div class="wire-label">What the harness actually runs</div>
          <div class="call-render">
            <span class="call-fn" id="dst-name">&lt;fn&gt;</span><span class="call-paren">(</span><span class="call-arg-key">path=</span><span class="call-arg-val" id="dst-path">&lt;arg&gt;</span><span class="call-paren">)</span>
          </div>

          <div class="wire-label">Correlation id (to match results later)</div>
          <div class="call-render corr-slot">
            <span class="call-arg-key">id=</span><span class="call-arg-val" id="dst-id">…</span>
          </div>
        </div>
      `);
    },
    () => {
      removeChatMessage(msgStage3User);
      setInputText('How many lines are in app.js?');
      restoreRightPanel('end-of-stage-2');
    }
  );

  // 3.3 — Lift "name": "read_file" → becomes the function name
  addStep(3,
    () => {
      const src = document.getElementById('src-name');
      const dst = document.getElementById('dst-name');
      if (src && dst) flyToTarget(src, dst, () => landField(dst, 'read_file'));
    },
    () => {
      const src = document.getElementById('src-name');
      const dst = document.getElementById('dst-name');
      unlandField(src, dst, '<fn>');
    }
  );

  // 3.4 — Lift input.path: "app.js" → becomes the argument value
  addStep(3,
    () => {
      const src = document.getElementById('src-path');
      const dst = document.getElementById('dst-path');
      if (src && dst) flyToTarget(src, dst, () => landField(dst, '"app.js"'));
    },
    () => {
      const src = document.getElementById('src-path');
      const dst = document.getElementById('dst-path');
      unlandField(src, dst, '<arg>');
    }
  );

  // 3.5 — Lift id → correlation slot
  addStep(3,
    () => {
      const src = document.getElementById('src-id');
      const dst = document.getElementById('dst-id');
      if (src && dst) flyToTarget(src, dst, () => landField(dst, 'toolu_01A...'));
    },
    () => {
      const src = document.getElementById('src-id');
      const dst = document.getElementById('dst-id');
      unlandField(src, dst, '…');
    }
  );

  // 3.6 — Show the tool_result being wrapped back into the next request
  addStep(3,
    () => {
      const existing = document.querySelector('.wire-view');
      if (!existing) return;
      const block = document.createElement('div');
      block.id = 'stage3-result';
      block.innerHTML = `
        <div class="wire-label" style="margin-top: 18px;">Next request includes the tool result</div>
        <pre class="json-block"><span class="json-bracket">{</span>
  <span class="json-key">"type"</span>: <span class="json-string">"tool_result"</span>,
  <span class="json-key">"tool_use_id"</span>: <span class="json-string">"toolu_01A..."</span>,
  <span class="json-key">"content"</span>: <span class="json-string">"1447"</span>
<span class="json-bracket">}</span></pre>
        <div class="corr-note">the <code>tool_use_id</code> matches the <code>id</code> above — that's how the model knows which call this result belongs to.</div>
      `;
      existing.appendChild(block);
      rightPanelContent.scrollTop = rightPanelContent.scrollHeight;
    },
    () => {
      const existing = document.getElementById('stage3-result');
      if (existing) existing.remove();
    }
  );

  // 3.7 — Model's next completion: plain text
  let msgStage3Asst;
  addStep(3,
    () => {
      msgStage3Asst = addChatMessage('assistant', 'app.js has 1447 lines.');
      snapshotRightPanel('end-of-stage-3');
    },
    () => {
      removeChatMessage(msgStage3Asst);
    }
  );

  // ════════════════════════════════════════
  // STAGE 4: Multi-turn with malformed recovery
  // ════════════════════════════════════════
  //
  // Task: "Fix the typo in README.md and commit."
  // The right panel accumulates turns as a vertical transcript so the audience
  // sees the whole conversation-plus-tool-calls history at the end.

  // 4.1 — New user message
  addStep(4,
    () => {
      setInputText('Fix the typo in README.md and commit.');
    },
    () => { clearInput(); }
  );

  // 4.2 — Send message and switch right panel to multi-turn transcript view
  let msgStage4User;
  addStep(4,
    () => {
      clearInput();
      msgStage4User = addChatMessage('user', 'Fix the typo in README.md and commit.');
      rightPanelTitle.textContent = 'On the wire — turn by turn';
      setRightPanelContent(`
        <div class="turn-stack" id="turn-stack">
          <div class="turn user-turn">
            <div class="turn-label"><span class="dot"></span>user</div>
            <div class="turn-body">Fix the typo in README.md and commit.</div>
          </div>
        </div>
      `);
    },
    () => {
      removeChatMessage(msgStage4User);
      setInputText('Fix the typo in README.md and commit.');
      restoreRightPanel('end-of-stage-3');
    }
  );

  function appendTurn(html) {
    const stack = document.getElementById('turn-stack');
    if (!stack) return null;
    const wrap = document.createElement('div');
    wrap.innerHTML = html.trim();
    const node = wrap.firstElementChild;
    stack.appendChild(node);
    rightPanelContent.scrollTop = rightPanelContent.scrollHeight;
    return node;
  }

  function removeLastTurn() {
    const stack = document.getElementById('turn-stack');
    if (stack && stack.lastElementChild) {
      stack.removeChild(stack.lastElementChild);
    }
  }

  // 4.3 — Turn 1: tool_use read_file("README.md")
  addStep(4,
    () => {
      appendTurn(`
        <div class="turn tool-call-turn">
          <div class="turn-label"><span class="dot"></span>assistant → tool_use</div>
          <div class="turn-body"><span class="call-fn">read_file</span><span class="call-paren">(</span><span class="call-arg-val">"README.md"</span><span class="call-paren">)</span></div>
        </div>
      `);
    },
    () => { removeLastTurn(); }
  );

  // 4.4 — Turn 1: tool_result with the typo visible
  addStep(4,
    () => {
      appendTurn(`
        <div class="turn tool-result-turn">
          <div class="turn-label"><span class="dot"></span>tool_result</div>
          <div class="turn-body pre">My Project

Welcome to my project. This is teh best place to learn.</div>
        </div>
      `);
    },
    () => { removeLastTurn(); }
  );

  // 4.5 — Turn 2: edit_file tool_use
  addStep(4,
    () => {
      appendTurn(`
        <div class="turn tool-call-turn">
          <div class="turn-label"><span class="dot"></span>assistant → tool_use</div>
          <div class="turn-body"><span class="call-fn">edit_file</span><span class="call-paren">(</span><span class="call-arg-val">"README.md"</span>, <span class="call-arg-val">"teh"</span>, <span class="call-arg-val">"the"</span><span class="call-paren">)</span></div>
        </div>
      `);
    },
    () => { removeLastTurn(); }
  );

  // 4.6 — Turn 2: tool_result success
  addStep(4,
    () => {
      appendTurn(`
        <div class="turn tool-result-turn">
          <div class="turn-label"><span class="dot"></span>tool_result</div>
          <div class="turn-body">ok — 1 replacement</div>
        </div>
      `);
    },
    () => { removeLastTurn(); }
  );

  // 4.7 — Turn 3: MALFORMED run_bash
  addStep(4,
    () => {
      appendTurn(`
        <div class="turn tool-call-turn error">
          <div class="turn-label"><span class="dot"></span>assistant → tool_use</div>
          <div class="turn-body"><span class="call-fn">run_bash</span><span class="call-paren">(</span><span class="call-arg-val">"git commit -m 'fix typo in 'README'"</span><span class="call-paren">)</span></div>
        </div>
      `);
    },
    () => { removeLastTurn(); }
  );

  // 4.8 — Turn 3: error tool_result
  addStep(4,
    () => {
      appendTurn(`
        <div class="turn tool-result-turn error">
          <div class="turn-label"><span class="dot"></span>tool_result · is_error=true</div>
          <div class="turn-body pre">SyntaxError: unexpected EOF while looking for matching quote</div>
        </div>
      `);
    },
    () => { removeLastTurn(); }
  );

  // 4.9 — Turn 4: RECOVERED run_bash (green)
  addStep(4,
    () => {
      appendTurn(`
        <div class="turn tool-call-turn success">
          <div class="turn-label"><span class="dot"></span>assistant → tool_use (recovered)</div>
          <div class="turn-body"><span class="call-fn">run_bash</span><span class="call-paren">(</span><span class="call-arg-val">"git commit -m 'fix typo in README'"</span><span class="call-paren">)</span></div>
        </div>
      `);
    },
    () => { removeLastTurn(); }
  );

  // 4.10 — Turn 4: success result
  addStep(4,
    () => {
      appendTurn(`
        <div class="turn tool-result-turn success">
          <div class="turn-label"><span class="dot"></span>tool_result</div>
          <div class="turn-body pre">[main e4f21a8] fix typo in README
 1 file changed, 1 insertion(+), 1 deletion(-)</div>
        </div>
      `);
    },
    () => { removeLastTurn(); }
  );

  // 4.11 — Final text response
  let msgStage4Asst;
  addStep(4,
    () => {
      appendTurn(`
        <div class="turn asst-text-turn">
          <div class="turn-label"><span class="dot"></span>assistant → text</div>
          <div class="turn-body">Done.</div>
        </div>
      `);
      msgStage4Asst = addChatMessage('assistant', 'Done.');
    },
    () => {
      removeLastTurn();
      removeChatMessage(msgStage4Asst);
    }
  );

  // 4.12 — Key takeaway about the error path
  addStep(4,
    () => {
      const stack = document.getElementById('turn-stack');
      if (stack) {
        const callout = document.createElement('div');
        callout.className = 'turn-callout';
        callout.innerHTML = `The "agent" loop is earning its name right here —<br>a tool failed, the model saw the error, and retried.`;
        stack.appendChild(callout);
        rightPanelContent.scrollTop = rightPanelContent.scrollHeight;
      }
      snapshotRightPanel('end-of-stage-4');
    },
    () => {
      const stack = document.getElementById('turn-stack');
      if (stack && stack.lastElementChild) stack.removeChild(stack.lastElementChild);
    }
  );

  // ════════════════════════════════════════
  // STAGE 5: Strip the template
  // ════════════════════════════════════════
  //
  // Callback to Stage 2: collapse the structured multi-turn view back into a
  // single raw templated string — tool calls are just more text in it.

  const stage5Raw =
    '<|im_start|>system\n' +
    'You are a helpful assistant. You have tools: read_file, edit_file, run_bash.<|im_end|>\n' +
    '<|im_start|>user\n' +
    'Fix the typo in README.md and commit.<|im_end|>\n' +
    '<|im_start|>assistant\n' +
    '<tool_use>{"name":"read_file","input":{"path":"README.md"}}</tool_use><|im_end|>\n' +
    '<|im_start|>tool\n' +
    '<tool_result id="1">My Project\n\nWelcome to my project. This is teh best place to learn.</tool_result><|im_end|>\n' +
    '<|im_start|>assistant\n' +
    '<tool_use>{"name":"edit_file","input":{"path":"README.md","old":"teh","new":"the"}}</tool_use><|im_end|>\n' +
    '<|im_start|>tool\n' +
    '<tool_result id="2">ok — 1 replacement</tool_result><|im_end|>\n' +
    '<|im_start|>assistant\n' +
    '<tool_use>{"name":"run_bash","input":{"cmd":"git commit -m \'fix typo in \'README\'"}}</tool_use><|im_end|>\n' +
    '<|im_start|>tool\n' +
    '<tool_result id="3" is_error="true">SyntaxError: unexpected EOF while looking for matching quote</tool_result><|im_end|>\n' +
    '<|im_start|>assistant\n' +
    '<tool_use>{"name":"run_bash","input":{"cmd":"git commit -m \'fix typo in README\'"}}</tool_use><|im_end|>\n' +
    '<|im_start|>tool\n' +
    '<tool_result id="4">[main e4f21a8] fix typo in README</tool_result><|im_end|>\n' +
    '<|im_start|>assistant\n' +
    'Done.<|im_end|>\n';

  // 5.1 — Collapse the structured turn stack into the raw templated string
  addStep(5,
    () => {
      rightPanelTitle.textContent = 'The same conversation, after templating';
      setRightPanelContent(`
        <div class="raw-string-view collapse-in">
          <div class="raw-string-header">prompt (still one big string)</div>
          <pre class="raw-string-body">${renderTemplate(stage5Raw)}<span class="raw-cursor blink">▋</span></pre>
        </div>
      `);
    },
    () => {
      restoreRightPanel('end-of-stage-4');
    }
  );

  // 5.2 — Highlight the tool_use / tool_result blocks inside the string
  addStep(5,
    () => {
      const body = document.querySelector('.raw-string-body');
      if (!body) return;
      // Wrap inline XML-ish tags in styled spans.
      body.innerHTML = body.innerHTML
        .replace(/(&lt;tool_use&gt;)/g, '<span class="tool-span use">$1</span>')
        .replace(/(&lt;\/tool_use&gt;)/g, '<span class="tool-span use">$1</span>')
        .replace(/(&lt;tool_result[^&]*&gt;)/g, '<span class="tool-span result">$1</span>')
        .replace(/(&lt;\/tool_result&gt;)/g, '<span class="tool-span result">$1</span>');
    },
    () => {
      // Re-render without the highlights.
      const view = document.querySelector('.raw-string-view');
      if (view) {
        view.innerHTML = `
          <div class="raw-string-header">prompt (still one big string)</div>
          <pre class="raw-string-body">${renderTemplate(stage5Raw)}<span class="raw-cursor blink">▋</span></pre>
        `;
      }
    }
  );

  // 5.3 — Closing line
  addStep(5,
    () => {
      showPanelOverlay('var(--orange)', 'var(--orange-dim)',
        `It's completions all the way down.`
      );
    },
    () => { hidePanelOverlay(); }
  );
}

// ── Navigation ──

function goForward() {
  if (isAnimating) return;
  if (currentStep >= steps.length - 1) return;

  currentStep++;
  const step = steps[currentStep];
  step.forward();
  updateProgressBar(step.stage);
}

function goBack() {
  if (isAnimating) return;
  if (currentStep < 0) return;

  const step = steps[currentStep];
  step.backward();
  currentStep--;

  if (currentStep >= 0) {
    updateProgressBar(steps[currentStep].stage);
  } else {
    updateProgressBar(1);
  }
}

function jumpToStage(targetStage) {
  if (isAnimating) return;

  // Find the index of the first step in the target stage
  const targetIndex = steps.findIndex(s => s.stage === targetStage);
  if (targetIndex === -1) return;
  if (targetIndex === currentStep) return;

  // Disable animations during rapid traversal
  document.documentElement.classList.add('no-animate');

  if (targetIndex > currentStep) {
    // Fast-forward
    while (currentStep < targetIndex) {
      currentStep++;
      steps[currentStep].forward();
    }
  } else {
    // Rewind
    while (currentStep >= targetIndex) {
      steps[currentStep].backward();
      currentStep--;
    }
    // Now step forward to land on the target
    currentStep++;
    steps[currentStep].forward();
  }

  updateProgressBar(steps[currentStep].stage);

  // Re-enable animations on next frame
  requestAnimationFrame(() => {
    document.documentElement.classList.remove('no-animate');
  });
}

// ── Keyboard handler ──

document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight' || e.key === ' ') {
    e.preventDefault();
    goForward();
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault();
    goBack();
  }
});

// ── Init ──

function init() {
  defineSteps();
  initProgressBar();
  // Start at the first step
  goForward();
}

// ── Theme toggle ──

const themeToggle = document.getElementById('theme-toggle');
const iconSun = document.getElementById('theme-icon-sun');
const iconMoon = document.getElementById('theme-icon-moon');

function setTheme(light) {
  if (light) {
    document.documentElement.classList.add('light');
    iconSun.style.display = 'none';
    iconMoon.style.display = 'block';
  } else {
    document.documentElement.classList.remove('light');
    iconSun.style.display = 'block';
    iconMoon.style.display = 'none';
  }
}

themeToggle.addEventListener('click', () => {
  const isLight = !document.documentElement.classList.contains('light');
  setTheme(isLight);
});

init();
