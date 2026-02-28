// ── Demystifying Agents - Presentation Engine ──

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
  'The Context Window',
  'Reasoning Models',
  'Tool Calling',
  'RAG',
  'System Prompts',
  'Skills',
  'Conclusion',
  'Build Playback'
];

const TOTAL_STAGES = 9;

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
          <h1>Agents Unmasked</h1>
          <div class="subtitle">How LLM agents actually work under the hood</div>
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
  let typing1;
  addStep(1,
    () => { typing1 = showTypingIndicator(); },
    () => { removeTypingIndicator(); }
  );

  // Step: Assistant responds
  let msg1asst;
  addStep(1,
    () => {
      removeTypingIndicator();
      msg1asst = addChatMessage('assistant', 'The capital of France is Paris. It\'s the largest city in France and serves as the country\'s political, economic, and cultural centre.');
    },
    () => {
      removeChatMessage(msg1asst);
      showTypingIndicator();
    }
  );

  // Step: User types second question
  addStep(1,
    () => { setInputText('What about Germany?'); },
    () => { clearInput(); }
  );

  // Step: User sends second message
  let msg2user;
  addStep(1,
    () => {
      clearInput();
      msg2user = addChatMessage('user', 'What about Germany?');
    },
    () => {
      removeChatMessage(msg2user);
      setInputText('What about Germany?');
    }
  );

  // Step: Typing indicator
  addStep(1,
    () => { showTypingIndicator(); },
    () => { removeTypingIndicator(); }
  );

  // Step: Assistant responds
  let msg2asst;
  addStep(1,
    () => {
      removeTypingIndicator();
      msg2asst = addChatMessage('assistant', 'The capital of Germany is Berlin. It\'s the largest city in Germany and has a rich history, particularly during the Cold War when it was divided into East and West Berlin.');
    },
    () => {
      removeChatMessage(msg2asst);
      showTypingIndicator();
    }
  );

  // ════════════════════════════════════════
  // STAGE 2: The Context Window
  // ════════════════════════════════════════

  // Helper to set up the context panel scaffold
  function initContextPanel(pct) {
    rightPanelTitle.textContent = 'Under the Hood — API Request';
    setRightPanelContent(`
      <div class="context-bar-container">
        <div class="context-bar-label">
          <span>Context Window</span>
          <span id="context-pct">${pct}%</span>
        </div>
        <div class="context-bar"><div class="context-bar-fill" id="context-fill" style="width: ${pct}%"></div></div>
      </div>
      <div id="context-sections"></div>
    `);
  }

  function updateContextBar(pct) {
    const fill = document.getElementById('context-fill');
    const pctEl = document.getElementById('context-pct');
    if (fill) fill.style.width = pct + '%';
    if (pctEl) pctEl.textContent = pct + '%';
  }

  function appendContextSection(type, label, body) {
    const sections = document.getElementById('context-sections');
    if (!sections) return;
    const div = document.createElement('div');
    div.className = `context-section ${type}`;
    div.innerHTML = `
      <div class="context-label"><span class="dot"></span> ${label}</div>
      <div class="context-body">${body}</div>
    `;
    sections.appendChild(div);
    rightPanelContent.scrollTop = rightPanelContent.scrollHeight;
  }

  function removeLastContextSection() {
    const sections = document.getElementById('context-sections');
    if (sections && sections.lastElementChild) {
      sections.removeChild(sections.lastElementChild);
    }
  }

  function restoreTitleSlide() {
    rightPanelTitle.textContent = '';
    setRightPanelContent(`
      <div class="title-slide">
        <h1>Agents Unmasked</h1>
        <div class="subtitle">How LLM agents actually work under the hood</div>
        <div class="author">James Coward</div>
      </div>
    `);
  }

  // Step: Transition — show the context panel with just the first user message
  addStep(2,
    () => {
      initContextPanel(2);
      appendContextSection('user-msg', 'User', 'What is the capital of France?');
    },
    () => { restoreTitleSlide(); }
  );

  // Step: First assistant response appears in context
  addStep(2,
    () => {
      appendContextSection('assistant-msg', 'Assistant',
        "The capital of France is Paris. It's the largest city in France and serves as the country's political, economic, and cultural centre.");
      updateContextBar(4);
    },
    () => { removeLastContextSection(); updateContextBar(2); }
  );

  // Step: Second user message in context
  addStep(2,
    () => {
      appendContextSection('user-msg', 'User', 'What about Germany?');
      updateContextBar(5);
    },
    () => { removeLastContextSection(); updateContextBar(4); }
  );

  // Step: Second assistant response in context
  addStep(2,
    () => {
      appendContextSection('assistant-msg', 'Assistant',
        "The capital of Germany is Berlin. It's the largest city in Germany and has a rich history, particularly during the Cold War when it was divided into East and West Berlin.");
      updateContextBar(8);
    },
    () => { removeLastContextSection(); updateContextBar(5); }
  );

  // Step: User types a new question
  addStep(2,
    () => { setInputText('And Spain?'); },
    () => { clearInput(); }
  );

  // Step: User sends — appears in both chat and context simultaneously
  let msg3user;
  addStep(2,
    () => {
      clearInput();
      msg3user = addChatMessage('user', 'And Spain?');
      appendContextSection('user-msg', 'User', 'And Spain?');
      updateContextBar(9);
    },
    () => {
      removeChatMessage(msg3user);
      setInputText('And Spain?');
      removeLastContextSection();
      updateContextBar(8);
    }
  );

  // Step: Typing indicator
  addStep(2,
    () => { showTypingIndicator(); },
    () => { removeTypingIndicator(); }
  );

  // Step: Assistant responds — both chat and context
  let msg3asst;
  addStep(2,
    () => {
      removeTypingIndicator();
      msg3asst = addChatMessage('assistant', 'The capital of Spain is Madrid. It\'s located in the centre of the Iberian Peninsula and is known for its rich cultural heritage, including the Prado Museum and the Royal Palace.');
      appendContextSection('assistant-msg', 'Assistant',
        "The capital of Spain is Madrid. It's located in the centre of the Iberian Peninsula and is known for its rich cultural heritage.");
      updateContextBar(14);
    },
    () => {
      removeChatMessage(msg3asst);
      showTypingIndicator();
      removeLastContextSection();
      updateContextBar(9);
    }
  );

  // Step: Callout — "The ENTIRE conversation is sent every time"
  addStep(2,
    () => {
      const sections = document.getElementById('context-sections');
      if (sections) {
        const callout = document.createElement('div');
        callout.className = 'context-callout';
        callout.innerHTML = `The <strong>entire</strong> conversation is sent with every request.<br>The model is stateless — it re-reads everything each time.`;
        sections.insertBefore(callout, sections.firstChild);
        rightPanelContent.scrollTop = 0;
      }
      snapshotRightPanel('end-of-stage-2');
    },
    () => {
      const sections = document.getElementById('context-sections');
      if (sections && sections.firstElementChild) {
        sections.removeChild(sections.firstElementChild);
      }
    }
  );

  // ════════════════════════════════════════
  // STAGE 3: Reasoning Models (Thinking)
  // ════════════════════════════════════════

  // Step: New question in chat
  addStep(3,
    () => {
      setInputText('What is the capital of Czechoslovakia?');
    },
    () => { clearInput(); }
  );

  let msg4user;
  addStep(3,
    () => {
      clearInput();
      msg4user = addChatMessage('user', 'What is the capital of Czechoslovakia?');
      // Update right panel title
      rightPanelTitle.textContent = 'Under the Hood — Thinking';
      // Reset right panel content
      setRightPanelContent(`
        <div class="context-bar-container">
          <div class="context-bar-label">
            <span>Context Window</span>
            <span id="context-pct">18%</span>
          </div>
          <div class="context-bar"><div class="context-bar-fill" id="context-fill" style="width: 18%"></div></div>
        </div>
        <div id="context-sections">
          <div class="context-section user-msg" style="opacity: 0.5">
            <div class="context-label"><span class="dot"></span> User</div>
            <div class="context-body">What is the capital of France?</div>
          </div>
          <div class="context-section assistant-msg" style="opacity: 0.5">
            <div class="context-label"><span class="dot"></span> Assistant</div>
            <div class="context-body">The capital of France is Paris...</div>
          </div>
          <div style="text-align: center; color: var(--text-muted); font-size: 12px; padding: 4px;">⋮ (earlier messages)</div>
          <div class="context-section user-msg highlight-new">
            <div class="context-label"><span class="dot"></span> User</div>
            <div class="context-body">What is the capital of Czechoslovakia?</div>
          </div>
        </div>
      `);
    },
    () => {
      removeChatMessage(msg4user);
      setInputText('What is the capital of Czechoslovakia?');
      restoreRightPanel('end-of-stage-2');
    }
  );

  // Step: Show thinking block in response
  addStep(3,
    () => {
      const sections = document.getElementById('context-sections');
      if (sections) {
        sections.innerHTML += `
          <div class="context-section thinking highlight-new">
            <div class="context-label"><span class="dot"></span> Thinking <span style="font-size: 10px; opacity: 0.6; font-weight: 400; text-transform: none;">(hidden from user)</span></div>
            <div class="context-body">The user is asking about Czechoslovakia, but that country no longer exists. It dissolved on 1 January 1993 into two independent states: the Czech Republic (now Czechia) and Slovakia.

Rather than just saying "it doesn't exist", I should be helpful and give them the capitals of both successor states:
  - Czech Republic → Prague
  - Slovakia → Bratislava

I'll also mention that the historic capital of Czechoslovakia was Prague.</div>
          </div>
        `;
        rightPanelContent.scrollTop = rightPanelContent.scrollHeight;
      }
      const fill = document.getElementById('context-fill');
      const pct = document.getElementById('context-pct');
      if (fill) fill.style.width = '26%';
      if (pct) pct.textContent = '26%';
    },
    () => {
      const sections = document.getElementById('context-sections');
      if (sections && sections.lastElementChild) {
        sections.removeChild(sections.lastElementChild);
      }
      const fill = document.getElementById('context-fill');
      const pct = document.getElementById('context-pct');
      if (fill) fill.style.width = '18%';
      if (pct) pct.textContent = '18%';
    }
  );

  // Step: Assistant responds (only final answer shown in chat)
  let msg4asst;
  addStep(3,
    () => {
      msg4asst = addChatMessage('assistant', 'Czechoslovakia dissolved in 1993. The historic capital was <strong>Prague</strong>, which is now the capital of the Czech Republic (Czechia). The capital of Slovakia is <strong>Bratislava</strong>.');
      const sections = document.getElementById('context-sections');
      if (sections) {
        sections.innerHTML += `
          <div class="context-section assistant-msg highlight-new">
            <div class="context-label"><span class="dot"></span> Assistant</div>
            <div class="context-body">Czechoslovakia dissolved in 1993. The historic capital was Prague (now capital of Czechia). The capital of Slovakia is Bratislava.</div>
          </div>
        `;
        rightPanelContent.scrollTop = rightPanelContent.scrollHeight;
      }
      const fill = document.getElementById('context-fill');
      const pct = document.getElementById('context-pct');
      if (fill) fill.style.width = '30%';
      if (pct) pct.textContent = '30%';
    },
    () => {
      removeChatMessage(msg4asst);
      const sections = document.getElementById('context-sections');
      if (sections && sections.lastElementChild) {
        sections.removeChild(sections.lastElementChild);
      }
      const fill = document.getElementById('context-fill');
      const pct = document.getElementById('context-pct');
      if (fill) fill.style.width = '26%';
      if (pct) pct.textContent = '26%';
    }
  );

  // Step: Reasoning callout
  addStep(3,
    () => {
      const sections = document.getElementById('context-sections');
      if (sections) {
        const callout = document.createElement('div');
        callout.className = 'context-callout';
        callout.style.borderColor = 'var(--orange)';
        callout.style.color = 'var(--orange)';
        callout.innerHTML = `"Reasoning" is just the model thinking out loud in the context window.<br>It uses more tokens, but produces better answers for complex questions.`;
        sections.appendChild(callout);
        rightPanelContent.scrollTop = rightPanelContent.scrollHeight;
      }
      snapshotRightPanel('end-of-stage-3');
    },
    () => {
      const sections = document.getElementById('context-sections');
      if (sections && sections.lastElementChild) {
        sections.removeChild(sections.lastElementChild);
      }
    }
  );

  // ════════════════════════════════════════
  // STAGE 4: Tool Calling (The Agent Loop)
  // ════════════════════════════════════════

  // Step: User asks to save to notes
  addStep(4,
    () => {
      setInputText('Save these capitals to my notes');
    },
    () => { clearInput(); }
  );

  let msg5user;
  addStep(4,
    () => {
      clearInput();
      msg5user = addChatMessage('user', 'Save these capitals to my notes');
      rightPanelTitle.textContent = 'Under the Hood — Tool Calling';
      setRightPanelContent(`
        <div id="loop-container">
          <div class="loop-diagram" id="loop-diagram"></div>
        </div>
      `);
    },
    () => {
      removeChatMessage(msg5user);
      setInputText('Save these capitals to my notes');
      restoreRightPanel('end-of-stage-3');
    }
  );

  // Step: Show user message in loop
  addStep(4,
    () => {
      const diagram = document.getElementById('loop-diagram');
      diagram.innerHTML = `
        <div class="loop-step user-step visible" id="ls-user">📨 User sends message</div>
      `;
      rightPanelContent.scrollTop = rightPanelContent.scrollHeight;
    },
    () => {
      const diagram = document.getElementById('loop-diagram');
      diagram.innerHTML = '';
    }
  );

  // Step: Arrow + model call #1
  addStep(4,
    () => {
      const diagram = document.getElementById('loop-diagram');
      diagram.innerHTML += `
        <div class="loop-arrow visible">↓</div>
        <div class="loop-step model-step visible active" id="ls-model1">🤖 Model (API call #1)</div>
      `;
      rightPanelContent.scrollTop = rightPanelContent.scrollHeight;
    },
    () => {
      const diagram = document.getElementById('loop-diagram');
      diagram.removeChild(diagram.lastElementChild);
      diagram.removeChild(diagram.lastElementChild);
    }
  );

  // Step: Model asks to read the file first
  addStep(4,
    () => {
      const diagram = document.getElementById('loop-diagram');
      const model1 = document.getElementById('ls-model1');
      if (model1) model1.classList.remove('active');
      diagram.innerHTML += `
        <div class="loop-arrow visible">↓</div>
        <div class="loop-step tool-step visible active" id="ls-toolcall1">🔧 tool_use: read_file("notes.txt")</div>
        <div class="loop-label visible">Model can't read files itself — it asks for a tool</div>
      `;
      rightPanelContent.scrollTop = rightPanelContent.scrollHeight;
    },
    () => {
      const diagram = document.getElementById('loop-diagram');
      const model1 = document.getElementById('ls-model1');
      if (model1) model1.classList.add('active');
      diagram.removeChild(diagram.lastElementChild);
      diagram.removeChild(diagram.lastElementChild);
      diagram.removeChild(diagram.lastElementChild);
    }
  );

  // Step: Harness reads the file
  addStep(4,
    () => {
      const diagram = document.getElementById('loop-diagram');
      const tc1 = document.getElementById('ls-toolcall1');
      if (tc1) tc1.classList.remove('active');
      diagram.innerHTML += `
        <div class="loop-arrow visible">↓</div>
        <div class="loop-step harness-step visible active" id="ls-harness1">⚙️ Harness reads the file</div>
        <div class="loop-label visible">The harness opens notes.txt and returns the contents</div>
      `;
      rightPanelContent.scrollTop = rightPanelContent.scrollHeight;
    },
    () => {
      const diagram = document.getElementById('loop-diagram');
      const tc1 = document.getElementById('ls-toolcall1');
      if (tc1) tc1.classList.add('active');
      diagram.removeChild(diagram.lastElementChild);
      diagram.removeChild(diagram.lastElementChild);
      diagram.removeChild(diagram.lastElementChild);
    }
  );

  // Step: Model call #2 → asks to write
  addStep(4,
    () => {
      const diagram = document.getElementById('loop-diagram');
      const h1 = document.getElementById('ls-harness1');
      if (h1) h1.classList.remove('active');
      diagram.innerHTML += `
        <div class="loop-arrow visible">↓</div>
        <div class="loop-step model-step visible" id="ls-model2">🤖 Model (API call #2)</div>
        <div class="loop-arrow visible">↓</div>
        <div class="loop-step tool-step visible active" id="ls-toolcall2">🔧 tool_use: write_file("notes.txt", ...)</div>
        <div class="loop-label visible">Model sees the contents, appends the capitals, asks to write</div>
      `;
      rightPanelContent.scrollTop = rightPanelContent.scrollHeight;
    },
    () => {
      const diagram = document.getElementById('loop-diagram');
      const h1 = document.getElementById('ls-harness1');
      if (h1) h1.classList.add('active');
      diagram.removeChild(diagram.lastElementChild);
      diagram.removeChild(diagram.lastElementChild);
      diagram.removeChild(diagram.lastElementChild);
      diagram.removeChild(diagram.lastElementChild);
      diagram.removeChild(diagram.lastElementChild);
    }
  );

  // Step: Harness writes, model call #3, final response
  let msg5asst;
  addStep(4,
    () => {
      const diagram = document.getElementById('loop-diagram');
      const tc2 = document.getElementById('ls-toolcall2');
      if (tc2) tc2.classList.remove('active');
      diagram.innerHTML += `
        <div class="loop-arrow visible">↓</div>
        <div class="loop-step harness-step visible" id="ls-harness2">⚙️ Harness writes the file</div>
        <div class="loop-arrow visible">↓</div>
        <div class="loop-step model-step visible" id="ls-model3">🤖 Model (API call #3)</div>
        <div class="loop-arrow visible">↓</div>
        <div class="loop-step response-step visible" id="ls-response">💬 Text response (no more tool calls)</div>
      `;
      rightPanelContent.scrollTop = rightPanelContent.scrollHeight;
      msg5asst = addChatMessage('assistant', 'Done! I\'ve saved the capital cities to your notes.');
    },
    () => {
      removeChatMessage(msg5asst);
      const diagram = document.getElementById('loop-diagram');
      const tc2 = document.getElementById('ls-toolcall2');
      if (tc2) tc2.classList.add('active');
      diagram.removeChild(diagram.lastElementChild);
      diagram.removeChild(diagram.lastElementChild);
      diagram.removeChild(diagram.lastElementChild);
      diagram.removeChild(diagram.lastElementChild);
      diagram.removeChild(diagram.lastElementChild);
      diagram.removeChild(diagram.lastElementChild);
    }
  );

  // Step: Show the "loop" annotation
  addStep(4,
    () => {
      const diagram = document.getElementById('loop-diagram');
      diagram.innerHTML += `
        <div class="context-callout" style="margin-top: 16px; border-color: var(--orange); color: var(--orange);">
          An "agent" is just this loop running until the model<br>stops calling tools. That's it.
        </div>
      `;
      rightPanelContent.scrollTop = rightPanelContent.scrollHeight;
      snapshotRightPanel('end-of-stage-4');
    },
    () => {
      const diagram = document.getElementById('loop-diagram');
      if (diagram.lastElementChild) {
        diagram.removeChild(diagram.lastElementChild);
      }
    }
  );

  // ════════════════════════════════════════
  // STAGE 5: RAG
  // ════════════════════════════════════════

  addStep(5,
    () => {
      setInputText('What\'s our parental leave policy?');
    },
    () => { clearInput(); }
  );

  let msg6user;
  addStep(5,
    () => {
      clearInput();
      msg6user = addChatMessage('user', 'What\'s our parental leave policy?');
      rightPanelTitle.textContent = 'Under the Hood — RAG';
      setRightPanelContent(`
        <div class="rag-flow" id="rag-flow"></div>
      `);
    },
    () => {
      removeChatMessage(msg6user);
      setInputText('What\'s our parental leave policy?');
      restoreRightPanel('end-of-stage-4');
    }
  );

  // Step: Query
  addStep(5,
    () => {
      const flow = document.getElementById('rag-flow');
      flow.innerHTML = `
        <div class="rag-step query-step visible">📝 User query: "parental leave policy"</div>
      `;
    },
    () => {
      document.getElementById('rag-flow').innerHTML = '';
    }
  );

  // Step: Search
  addStep(5,
    () => {
      const flow = document.getElementById('rag-flow');
      flow.innerHTML += `
        <div class="rag-arrow visible">↓</div>
        <div class="rag-step search-step visible">🔍 Search vector index</div>
        <div class="loop-label visible">Before calling the model, search for relevant documents</div>
      `;
    },
    () => {
      const flow = document.getElementById('rag-flow');
      flow.removeChild(flow.lastElementChild);
      flow.removeChild(flow.lastElementChild);
      flow.removeChild(flow.lastElementChild);
    }
  );

  // Step: Retrieve chunks
  addStep(5,
    () => {
      const flow = document.getElementById('rag-flow');
      flow.innerHTML += `
        <div class="rag-arrow visible">↓</div>
        <div class="rag-step retrieve-step visible">📄 Retrieved 3 chunks</div>
      `;
    },
    () => {
      const flow = document.getElementById('rag-flow');
      flow.removeChild(flow.lastElementChild);
      flow.removeChild(flow.lastElementChild);
    }
  );

  // Step: Inject into context
  addStep(5,
    () => {
      const flow = document.getElementById('rag-flow');
      flow.innerHTML += `
        <div class="rag-arrow visible">↓</div>
        <div class="rag-step inject-step visible">💉 Inject into context window</div>
      `;
    },
    () => {
      const flow = document.getElementById('rag-flow');
      flow.removeChild(flow.lastElementChild);
      flow.removeChild(flow.lastElementChild);
    }
  );

  // Step: Show what context looks like now
  addStep(5,
    () => {
      const flow = document.getElementById('rag-flow');
      flow.innerHTML += `
        <div class="rag-arrow visible">↓</div>
        <div class="rag-step model-step visible">🤖 Call model with enriched context</div>
        <div style="width: 100%; margin-top: 16px;">
          <div class="context-section rag">
            <div class="context-label"><span class="dot"></span> Retrieved Documents</div>
            <div class="context-body">[handbook/parental-leave.md]
"All employees are entitled to 16 weeks of paid parental leave. Leave can be taken in blocks or continuously within the first 12 months..."

[handbook/benefits-overview.md]
"Parental leave is available to all employees regardless of gender or tenure. Additional unpaid leave of up to 8 weeks may be requested..."</div>
          </div>
          <div class="context-section user-msg">
            <div class="context-label"><span class="dot"></span> User</div>
            <div class="context-body">What's our parental leave policy?</div>
          </div>
        </div>
      `;
      rightPanelContent.scrollTop = rightPanelContent.scrollHeight;
    },
    () => {
      const flow = document.getElementById('rag-flow');
      // Remove last 3 items
      flow.removeChild(flow.lastElementChild);
      flow.removeChild(flow.lastElementChild);
      flow.removeChild(flow.lastElementChild);
    }
  );

  // Step: Assistant responds
  let msg6asst;
  addStep(5,
    () => {
      msg6asst = addChatMessage('assistant', 'Our parental leave policy offers <strong>16 weeks of paid leave</strong> for all employees, regardless of gender or tenure. You can take it in continuous blocks or split it within the first 12 months. Additional unpaid leave of up to 8 weeks is also available upon request.');
      const flow = document.getElementById('rag-flow');
      flow.innerHTML += `
        <div class="context-callout" style="margin-top: 12px; border-color: var(--yellow); color: var(--yellow);">
          RAG is just "search, then put the results into context".<br>The result is no different than if you'd supplied those files yourself.
        </div>
      `;
      rightPanelContent.scrollTop = rightPanelContent.scrollHeight;
      snapshotRightPanel('end-of-stage-5');
    },
    () => {
      removeChatMessage(msg6asst);
      const flow = document.getElementById('rag-flow');
      if (flow.lastElementChild) flow.removeChild(flow.lastElementChild);
    }
  );

  // ════════════════════════════════════════
  // STAGE 6: System Prompts & agent.md
  // ════════════════════════════════════════

  addStep(6,
    () => {
      rightPanelTitle.textContent = 'Under the Hood — System Prompt';
      setRightPanelContent(`
        <div id="context-sections">
          <div class="context-section system highlight-new" style="border-width: 2px;">
            <div class="context-label"><span class="dot"></span> System Prompt</div>
            <div class="context-body">You are a helpful assistant for Acme Corp.
You answer questions about company policies.
Be concise, friendly, and professional.
If you don't know something, say so.
Never make up information about policies.</div>
          </div>
          <div style="text-align: center; color: var(--text-muted); font-size: 12px; padding: 4px;">⋮ (this was always here — just hidden until now)</div>
          <div class="context-section user-msg" style="opacity: 0.5">
            <div class="context-label"><span class="dot"></span> User</div>
            <div class="context-body">What is the capital of France?</div>
          </div>
          <div class="context-section assistant-msg" style="opacity: 0.5">
            <div class="context-label"><span class="dot"></span> Assistant</div>
            <div class="context-body">The capital of France is Paris...</div>
          </div>
          <div style="text-align: center; color: var(--text-muted); font-size: 12px; padding: 4px;">⋮ (conversation continues)</div>
        </div>
      `);
    },
    () => {
      restoreRightPanel('end-of-stage-5');
    }
  );

  // Step: Show agent.md being loaded
  addStep(6,
    () => {
      const sections = document.getElementById('context-sections');
      const systemSection = sections.querySelector('.context-section.system');
      // Insert agent.md before the system section
      const agentSection = document.createElement('div');
      agentSection.className = 'context-section system highlight-new';
      agentSection.style.borderColor = 'rgba(247, 120, 186, 0.4)';
      agentSection.style.background = 'var(--pink-dim)';
      agentSection.innerHTML = `
        <div class="context-label" style="color: var(--pink);"><span class="dot" style="background: var(--pink);"></span> agent.md</div>
        <div class="context-body"># Acme Corp Assistant

## Identity
- Name: AcmeBot
- Role: Internal HR & Policy Assistant

## Rules
- Only reference official handbook documents
- Escalate sensitive topics to HR team
- Log all policy queries for compliance

## Available Tools
- search_handbook: Search company docs
- create_ticket: Create HR tickets
- bash: Run terminal commands</div>
      `;
      sections.insertBefore(agentSection, systemSection);
      rightPanelContent.scrollTop = 0;
    },
    () => {
      const sections = document.getElementById('context-sections');
      if (sections && sections.firstElementChild) {
        sections.removeChild(sections.firstElementChild);
      }
    }
  );

  // Step: Annotation
  addStep(6,
    () => {
      const sections = document.getElementById('context-sections');
      sections.innerHTML += `
        <div class="context-callout" style="margin-top: 8px; border-color: var(--purple); color: var(--purple);">
          Personality, rules, and capabilities are all just text<br>prepended to the context window. More context.
        </div>
      `;
      rightPanelContent.scrollTop = rightPanelContent.scrollHeight;
      snapshotRightPanel('end-of-stage-6');
    },
    () => {
      const sections = document.getElementById('context-sections');
      if (sections.lastElementChild) sections.removeChild(sections.lastElementChild);
    }
  );

  // ════════════════════════════════════════
  // STAGE 7: Skills / Slash Commands
  // ════════════════════════════════════════

  addStep(7,
    () => {
      setInputText('save my changes');
      rightPanelTitle.textContent = 'Under the Hood — Skills';
      setRightPanelContent(`
        <div id="skill-flow"></div>
      `);
    },
    () => {
      clearInput();
      restoreRightPanel('end-of-stage-6');
    }
  );

  let msg7user;
  addStep(7,
    () => {
      clearInput();
      msg7user = addChatMessage('user', 'save my changes');
      const flow = document.getElementById('skill-flow');
      flow.innerHTML = `
        <div class="context-section system" style="margin-bottom: 16px;">
          <div class="context-label"><span class="dot"></span> System Prompt — Available Skills</div>
          <div class="context-body">## Skills
The following skills are available. When the user's
request matches a skill, call the load_skill tool
to fetch detailed instructions.

- <span style="color: var(--orange);">commit</span>: Save and commit code changes
  Triggers: /commit, "save my changes", "commit this"
- <span style="color: var(--orange);">review-pr</span>: Review a pull request
  Triggers: /review-pr, "review this PR"
- <span style="color: var(--orange);">explain</span>: Explain how code works
  Triggers: /explain, "what does this do"</div>
        </div>
      `;
    },
    () => {
      removeChatMessage(msg7user);
      setInputText('save my changes');
      document.getElementById('skill-flow').innerHTML = '';
    }
  );

  // Step: Model matches intent → tool call
  addStep(7,
    () => {
      const flow = document.getElementById('skill-flow');
      flow.innerHTML += `
        <div class="context-section tool-call highlight-new">
          <div class="context-label"><span class="dot"></span> Tool Call</div>
          <div class="context-body">load_skill("commit")

The model matched "save my changes" to the commit skill.
This is itself a form of tool calling!</div>
        </div>
        <div class="skill-expansion"><div class="arrow-down">↓</div></div>
      `;
      rightPanelContent.scrollTop = rightPanelContent.scrollHeight;
    },
    () => {
      const flow = document.getElementById('skill-flow');
      flow.removeChild(flow.lastElementChild);
      flow.removeChild(flow.lastElementChild);
    }
  );

  // Step: Skill template expands into context
  addStep(7,
    () => {
      const flow = document.getElementById('skill-flow');
      flow.innerHTML += `
        <div class="context-section tool-result highlight-new">
          <div class="context-label"><span class="dot"></span> Skill Expansion → Injected into Context</div>
          <div class="context-body">## Commit Skill Instructions

1. Run \`git status\` to see all changes
2. Run \`git diff\` to understand what changed
3. Run \`git log --oneline -5\` for recent style
4. Stage relevant files (not .env or secrets)
5. Write a concise commit message:
   - Summarise the "why" not the "what"
   - Use conventional commit format
6. Create the commit
7. Show the result to the user

Never push unless explicitly asked.</div>
        </div>
      `;
      rightPanelContent.scrollTop = rightPanelContent.scrollHeight;
    },
    () => {
      const flow = document.getElementById('skill-flow');
      flow.removeChild(flow.lastElementChild);
    }
  );

  // Step: Show the assistant acting on it
  let msg7asst;
  addStep(7,
    () => {
      msg7asst = addChatMessage('assistant', 'I\'ll save your changes. Let me check what\'s been modified...\n\n<code>git status</code>\n<code>git diff</code>\n\nYou\'ve modified 3 files. I\'ll create a commit with a descriptive message.');

      const flow = document.getElementById('skill-flow');
      flow.innerHTML += `
        <div class="context-callout" style="margin-top: 12px; border-color: var(--cyan); color: var(--cyan);">
          Skills are prompt templates that expand into context.<br>
          The user says "save my changes" → the model picks the right<br>
          skill → detailed instructions appear → model follows them.
        </div>
      `;
      rightPanelContent.scrollTop = rightPanelContent.scrollHeight;
      snapshotRightPanel('end-of-stage-7');
    },
    () => {
      removeChatMessage(msg7asst);
      const flow = document.getElementById('skill-flow');
      if (flow.lastElementChild) flow.removeChild(flow.lastElementChild);
    }
  );

  // ════════════════════════════════════════
  // STAGE 8: Conclusion
  // ════════════════════════════════════════

  addStep(8,
    () => {
      rightPanelTitle.textContent = 'The Full Picture';
      setRightPanelContent(`
        <div class="full-picture" id="full-picture">
          <div class="conclusion-title">It's context all the way down</div>
        </div>
      `);
    },
    () => {
      restoreRightPanel('end-of-stage-7');
    }
  );

  // Step: Stack up all the layers
  addStep(8,
    () => {
      const fp = document.getElementById('full-picture');
      fp.innerHTML += `
        <div class="context-section system" style="padding: 8px 12px; margin-bottom: 6px;">
          <div class="context-label"><span class="dot"></span> System Prompt</div>
          <div class="context-body" style="font-size: 11px;">You are a helpful assistant...</div>
        </div>
      `;
    },
    () => {
      const fp = document.getElementById('full-picture');
      fp.removeChild(fp.lastElementChild);
    }
  );

  addStep(8,
    () => {
      const fp = document.getElementById('full-picture');
      fp.innerHTML += `
        <div class="context-section system" style="padding: 8px 12px; margin-bottom: 6px; border-color: rgba(247, 120, 186, 0.4); background: var(--pink-dim);">
          <div class="context-label" style="color: var(--pink);"><span class="dot" style="background: var(--pink);"></span> agent.md</div>
          <div class="context-body" style="font-size: 11px;">Identity, rules, available tools...</div>
        </div>
      `;
    },
    () => {
      const fp = document.getElementById('full-picture');
      fp.removeChild(fp.lastElementChild);
    }
  );

  addStep(8,
    () => {
      const fp = document.getElementById('full-picture');
      fp.innerHTML += `
        <div class="context-section tool-result" style="padding: 8px 12px; margin-bottom: 6px;">
          <div class="context-label"><span class="dot"></span> Skill Expansion</div>
          <div class="context-body" style="font-size: 11px;">Detailed instructions loaded on demand...</div>
        </div>
      `;
    },
    () => {
      const fp = document.getElementById('full-picture');
      fp.removeChild(fp.lastElementChild);
    }
  );

  addStep(8,
    () => {
      const fp = document.getElementById('full-picture');
      fp.innerHTML += `
        <div class="context-section rag" style="padding: 8px 12px; margin-bottom: 6px;">
          <div class="context-label"><span class="dot"></span> RAG Chunks</div>
          <div class="context-body" style="font-size: 11px;">Retrieved documents injected before the call...</div>
        </div>
      `;
    },
    () => {
      const fp = document.getElementById('full-picture');
      fp.removeChild(fp.lastElementChild);
    }
  );

  addStep(8,
    () => {
      const fp = document.getElementById('full-picture');
      fp.innerHTML += `
        <div class="context-section user-msg" style="padding: 8px 12px; margin-bottom: 6px;">
          <div class="context-label"><span class="dot"></span> Conversation History</div>
          <div class="context-body" style="font-size: 11px;">Every message, every turn, sent every time...</div>
        </div>
      `;
    },
    () => {
      const fp = document.getElementById('full-picture');
      fp.removeChild(fp.lastElementChild);
    }
  );

  addStep(8,
    () => {
      const fp = document.getElementById('full-picture');
      fp.innerHTML += `
        <div class="context-section thinking" style="padding: 8px 12px; margin-bottom: 6px;">
          <div class="context-label"><span class="dot"></span> Thinking Blocks</div>
          <div class="context-body" style="font-size: 11px;">Chain-of-thought reasoning, hidden from user...</div>
        </div>
      `;
    },
    () => {
      const fp = document.getElementById('full-picture');
      fp.removeChild(fp.lastElementChild);
    }
  );

  addStep(8,
    () => {
      const fp = document.getElementById('full-picture');
      fp.innerHTML += `
        <div class="context-section tool-call" style="padding: 8px 12px; margin-bottom: 6px;">
          <div class="context-label"><span class="dot"></span> Tool Calls & Results</div>
          <div class="context-body" style="font-size: 11px;">Looping until the task is done...</div>
        </div>
      `;
    },
    () => {
      const fp = document.getElementById('full-picture');
      fp.removeChild(fp.lastElementChild);
    }
  );

  // Step: The reveal
  addStep(8,
    () => {
      const fp = document.getElementById('full-picture');
      fp.innerHTML += `
        <div class="built-with-agent visible" style="margin-top: 12px;">
          This presentation was built with Claude Code. (in about an hour)
        </div>
      `;
      rightPanelContent.scrollTop = rightPanelContent.scrollHeight;
    },
    () => {
      const fp = document.getElementById('full-picture');
      fp.removeChild(fp.lastElementChild);
    }
  );

  // Step: Show the prompts used to build this
  addStep(8,
    () => {
      const fp = document.getElementById('full-picture');
      fp.innerHTML += `
        <div class="prompts-reveal visible" style="margin-top: 12px;">
          <div class="prompts-header">The prompts that built this presentation:</div>
          <ol class="prompts-list">
            <li>The plan <span class="prompt-meta">(stage structure, layout, tech choices)</span></li>
            <li>"Can you pause after each phase so we can discuss" <span class="prompt-meta">(so I can keep up)</span></li>
            <li>"I was thinking the right panel should always be there" <span class="prompt-meta">(a bit of layout direction)</span></li>
            <li>"Could we add a light mode toggle" <span class="prompt-meta">(already asking for extra features!)</span></li>
            <li>"Lets go for Agents Unmasked" <span class="prompt-meta">(brainstorming titles for the talk)</span></li>
            <li>"Lets move onto phase 2" <span class="prompt-meta">(this is where I realise claude has one-shotted my vision)</span></li>
            <li>"Can you go through the rest of the phases to check for polish" <span class="prompt-meta">(tidy up and fix anything that was missed)</span></li>
            <li>"Can you pull out all my prompts for the final slide" <span class="prompt-meta">(a bit of extra flair)</span></li>
          </ol>
        </div>
      `;
      rightPanelContent.scrollTop = rightPanelContent.scrollHeight;
    },
    () => {
      const fp = document.getElementById('full-picture');
      fp.removeChild(fp.lastElementChild);
    }
  );

  // ════════════════════════════════════════
  // STAGE 9: Build Playback
  // ════════════════════════════════════════

  // Entry step: switch layout to full-width playback mode.
  // The individual event steps are appended dynamically by Playback.load().
  addStep(9,
    () => {
      // Expand left panel, hide right panel
      leftPanel.classList.remove('split');
      leftPanel.classList.add('full');
      rightPanel.classList.remove('visible');
      chatHeaderTitle.textContent = 'How This Was Built';

      // Swap chat UI for playback feed
      chatMessages.classList.add('hidden');
      chatInputArea.classList.add('hidden');
      const feed = document.getElementById('playback-feed');
      const status = document.getElementById('playback-status');
      feed.classList.remove('hidden');
      status.classList.remove('hidden');

      // Clear any events from a previous visit and reset cursor
      Playback.reset();

      if (Playback.getLoadedCount() === 0) {
        // build-session.jsonl not found — show setup instructions
        feed.innerHTML = `
          <div class="playback-placeholder">
            <h3>📼 Build Playback</h3>
            <p>Copy your Claude Code session file here, then serve the folder:</p>
            <code>~/.claude/projects/…/&lt;session-id&gt;.jsonl</code>
            <code style="color:var(--green)">→ agents-unmasked/build-session.jsonl</code>
            <p style="margin-top:4px">Then run:</p>
            <code>npx serve .</code>
          </div>`;
      }

      Playback.updateStatus();
    },
    () => {
      // Restore split layout and chat UI
      leftPanel.classList.add('split');
      leftPanel.classList.remove('full');
      rightPanel.classList.add('visible');
      chatHeaderTitle.textContent = 'Chat';

      chatMessages.classList.remove('hidden');
      chatInputArea.classList.remove('hidden');
      document.getElementById('playback-feed').classList.add('hidden');
      document.getElementById('playback-status').classList.add('hidden');
    }
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

async function init() {
  defineSteps();
  // Fetch build-session.jsonl and register event steps before the progress
  // bar is drawn, so the dot count is stable from the start.
  await Playback.load(addStep);
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
