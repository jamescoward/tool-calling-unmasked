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
const rightPanelContent = document.getElementById('right-panel-content');
const rightPanelTitle = document.querySelector('.right-panel-title');
const progressDots = document.getElementById('progress-dots');
const progressLabel = document.getElementById('progress-label');

// ── State tracking for undo ──
// Each step records what it added so we can reverse it
const stateStack = [];

const STAGE_NAMES = [
  '',
  'The Chat Interface',
  'The Context Window',
  'Reasoning Models',
  'Tool Calling',
  'RAG',
  'System Prompts',
  'Skills',
  'Conclusion'
];

const TOTAL_STAGES = 8;

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

function showRightPanel() {
  leftPanel.classList.remove('full-width');
  leftPanel.classList.add('split');
  rightPanel.classList.add('visible');
}

function hideRightPanel() {
  leftPanel.classList.add('full-width');
  leftPanel.classList.remove('split');
  rightPanel.classList.remove('visible');
}

function setRightPanelContent(html) {
  rightPanelContent.innerHTML = html;
}

function appendRightPanelContent(html) {
  rightPanelContent.innerHTML += html;
  rightPanelContent.scrollTop = rightPanelContent.scrollHeight;
}

// ── Progress bar ──

function initProgressBar() {
  progressDots.innerHTML = '';
  for (let i = 1; i <= TOTAL_STAGES; i++) {
    const dot = document.createElement('div');
    dot.className = 'progress-dot';
    dot.dataset.stage = i;
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

  // Step: Show empty chat (initial state)
  addStep(1,
    () => {
      hideRightPanel();
      clearInput();
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

  // Step: Reveal the right panel
  addStep(2,
    () => {
      showRightPanel();
      rightPanelTitle.textContent = 'Under the Hood — API Request';
      setRightPanelContent(`
        <div class="context-bar-container">
          <div class="context-bar-label">
            <span>Context Window</span>
            <span id="context-pct">8%</span>
          </div>
          <div class="context-bar"><div class="context-bar-fill" id="context-fill" style="width: 8%"></div></div>
        </div>
        <div id="context-sections"></div>
      `);
      // Show the context from the existing conversation
      document.getElementById('context-sections').innerHTML = `
        <div class="context-section user-msg highlight-new">
          <div class="context-label"><span class="dot"></span> User</div>
          <div class="context-body">What is the capital of France?</div>
        </div>
        <div class="context-section assistant-msg">
          <div class="context-label"><span class="dot"></span> Assistant</div>
          <div class="context-body">The capital of France is Paris. It's the largest city in France and serves as the country's political, economic, and cultural centre.</div>
        </div>
        <div class="context-section user-msg">
          <div class="context-label"><span class="dot"></span> User</div>
          <div class="context-body">What about Germany?</div>
        </div>
        <div class="context-section assistant-msg">
          <div class="context-label"><span class="dot"></span> Assistant</div>
          <div class="context-body">The capital of Germany is Berlin. It's the largest city in Germany and has a rich history, particularly during the Cold War when it was divided into East and West Berlin.</div>
        </div>
      `;
    },
    () => {
      hideRightPanel();
      setRightPanelContent('');
    }
  );

  // Step: User asks another question (context grows)
  addStep(2,
    () => { setInputText('And Spain?'); },
    () => { clearInput(); }
  );

  let msg3user;
  addStep(2,
    () => {
      clearInput();
      msg3user = addChatMessage('user', 'And Spain?');
      // Add to context view
      const sections = document.getElementById('context-sections');
      if (sections) {
        sections.innerHTML += `
          <div class="context-section user-msg highlight-new">
            <div class="context-label"><span class="dot"></span> User</div>
            <div class="context-body">And Spain?</div>
          </div>
        `;
        rightPanelContent.scrollTop = rightPanelContent.scrollHeight;
      }
      const fill = document.getElementById('context-fill');
      const pct = document.getElementById('context-pct');
      if (fill) fill.style.width = '10%';
      if (pct) pct.textContent = '10%';
    },
    () => {
      removeChatMessage(msg3user);
      setInputText('And Spain?');
      // Remove last context section
      const sections = document.getElementById('context-sections');
      if (sections && sections.lastElementChild) {
        sections.removeChild(sections.lastElementChild);
      }
      const fill = document.getElementById('context-fill');
      const pct = document.getElementById('context-pct');
      if (fill) fill.style.width = '8%';
      if (pct) pct.textContent = '8%';
    }
  );

  addStep(2,
    () => { showTypingIndicator(); },
    () => { removeTypingIndicator(); }
  );

  let msg3asst;
  addStep(2,
    () => {
      removeTypingIndicator();
      msg3asst = addChatMessage('assistant', 'The capital of Spain is Madrid. It\'s located in the centre of the Iberian Peninsula and is known for its rich cultural heritage, including the Prado Museum and the Royal Palace.');
      const sections = document.getElementById('context-sections');
      if (sections) {
        sections.innerHTML += `
          <div class="context-section assistant-msg highlight-new">
            <div class="context-label"><span class="dot"></span> Assistant</div>
            <div class="context-body">The capital of Spain is Madrid. It's located in the centre of the Iberian Peninsula and is known for its rich cultural heritage.</div>
          </div>
        `;
        rightPanelContent.scrollTop = rightPanelContent.scrollHeight;
      }
      const fill = document.getElementById('context-fill');
      const pct = document.getElementById('context-pct');
      if (fill) fill.style.width = '14%';
      if (pct) pct.textContent = '14%';
    },
    () => {
      removeChatMessage(msg3asst);
      showTypingIndicator();
      const sections = document.getElementById('context-sections');
      if (sections && sections.lastElementChild) {
        sections.removeChild(sections.lastElementChild);
      }
      const fill = document.getElementById('context-fill');
      const pct = document.getElementById('context-pct');
      if (fill) fill.style.width = '10%';
      if (pct) pct.textContent = '10%';
    }
  );

  // Step: Highlight callout - "The ENTIRE conversation is sent every time"
  addStep(2,
    () => {
      const sections = document.getElementById('context-sections');
      if (sections) {
        // Add annotation
        sections.innerHTML = `
          <div style="text-align:center; padding: 10px; margin-bottom: 12px; border: 1px dashed var(--orange); border-radius: 8px; color: var(--orange); font-family: var(--font-sans); font-size: 13px;">
            ↑ The <strong>entire</strong> conversation is sent with every request.<br>The model is stateless — it re-reads everything each time.
          </div>
        ` + sections.innerHTML;
        rightPanelContent.scrollTop = 0;
      }
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
      setInputText('I have 3 boxes. Box A contains a cat. I swap Box A and Box C, then swap Box B and Box C. Where is the cat?');
    },
    () => { clearInput(); }
  );

  let msg4user;
  addStep(3,
    () => {
      clearInput();
      msg4user = addChatMessage('user', 'I have 3 boxes. Box A contains a cat. I swap Box A and Box C, then swap Box B and Box C. Where is the cat?');
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
            <div class="context-body">I have 3 boxes. Box A contains a cat. I swap Box A and Box C, then swap Box B and Box C. Where is the cat?</div>
          </div>
        </div>
      `);
    },
    () => {
      removeChatMessage(msg4user);
      setInputText('I have 3 boxes. Box A contains a cat. I swap Box A and Box C, then swap Box B and Box C. Where is the cat?');
      // Restore Stage 2 right panel
      rightPanelTitle.textContent = 'Under the Hood — API Request';
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
            <div class="context-body">Let me trace through the swaps step by step:

Start: Box A = cat, Box B = empty, Box C = empty

Swap 1: Box A ↔ Box C
  Box A = empty, Box B = empty, Box C = cat

Swap 2: Box B ↔ Box C
  Box A = empty, Box B = cat, Box C = empty

So the cat ends up in Box B.</div>
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
      msg4asst = addChatMessage('assistant', 'The cat is in <strong>Box B</strong>. After swapping A↔C, the cat moved to Box C. Then swapping B↔C moved it to Box B.');
      const sections = document.getElementById('context-sections');
      if (sections) {
        sections.innerHTML += `
          <div class="context-section assistant-msg highlight-new">
            <div class="context-label"><span class="dot"></span> Assistant</div>
            <div class="context-body">The cat is in Box B. After swapping A↔C, the cat moved to Box C. Then swapping B↔C moved it to Box B.</div>
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

  // ════════════════════════════════════════
  // STAGE 4: Tool Calling (The Agent Loop)
  // ════════════════════════════════════════

  // Step: User asks about weather
  addStep(4,
    () => {
      setInputText('What\'s the weather like in London right now?');
    },
    () => { clearInput(); }
  );

  let msg5user;
  addStep(4,
    () => {
      clearInput();
      msg5user = addChatMessage('user', 'What\'s the weather like in London right now?');
      rightPanelTitle.textContent = 'Under the Hood — Tool Calling';
      setRightPanelContent(`
        <div id="loop-container">
          <div class="loop-diagram" id="loop-diagram"></div>
        </div>
      `);
    },
    () => {
      removeChatMessage(msg5user);
      setInputText('What\'s the weather like in London right now?');
      rightPanelTitle.textContent = 'Under the Hood — Thinking';
    }
  );

  // Step: Show user message in loop
  addStep(4,
    () => {
      const diagram = document.getElementById('loop-diagram');
      diagram.innerHTML = `
        <div class="loop-step user-step visible" id="ls-user">📨 User sends message</div>
      `;
    },
    () => {
      const diagram = document.getElementById('loop-diagram');
      diagram.innerHTML = '';
    }
  );

  // Step: Arrow + model call
  addStep(4,
    () => {
      const diagram = document.getElementById('loop-diagram');
      diagram.innerHTML += `
        <div class="loop-arrow visible">↓</div>
        <div class="loop-step model-step visible active" id="ls-model1">🤖 Model (API call #1)</div>
      `;
    },
    () => {
      const diagram = document.getElementById('loop-diagram');
      // Remove last 2 elements
      diagram.removeChild(diagram.lastElementChild);
      diagram.removeChild(diagram.lastElementChild);
    }
  );

  // Step: Model returns tool_use
  addStep(4,
    () => {
      const diagram = document.getElementById('loop-diagram');
      const model1 = document.getElementById('ls-model1');
      if (model1) model1.classList.remove('active');
      diagram.innerHTML += `
        <div class="loop-arrow visible">↓</div>
        <div class="loop-step tool-step visible active" id="ls-toolcall">🔧 tool_use: get_weather("London")</div>
        <div class="loop-label visible">Model doesn't know the weather — it asks for a tool</div>
      `;
    },
    () => {
      const diagram = document.getElementById('loop-diagram');
      const model1 = document.getElementById('ls-model1');
      if (model1) model1.classList.add('active');
      // Remove last 3
      diagram.removeChild(diagram.lastElementChild);
      diagram.removeChild(diagram.lastElementChild);
      diagram.removeChild(diagram.lastElementChild);
    }
  );

  // Step: Harness executes tool
  addStep(4,
    () => {
      const diagram = document.getElementById('loop-diagram');
      const tc = document.getElementById('ls-toolcall');
      if (tc) tc.classList.remove('active');
      diagram.innerHTML += `
        <div class="loop-arrow visible">↓</div>
        <div class="loop-step harness-step visible active" id="ls-harness">⚙️ Harness executes tool</div>
        <div class="loop-label visible">Your code calls the weather API and gets the result</div>
      `;
    },
    () => {
      const diagram = document.getElementById('loop-diagram');
      const tc = document.getElementById('ls-toolcall');
      if (tc) tc.classList.add('active');
      diagram.removeChild(diagram.lastElementChild);
      diagram.removeChild(diagram.lastElementChild);
      diagram.removeChild(diagram.lastElementChild);
    }
  );

  // Step: Tool result injected, second API call
  addStep(4,
    () => {
      const diagram = document.getElementById('loop-diagram');
      const h = document.getElementById('ls-harness');
      if (h) h.classList.remove('active');
      diagram.innerHTML += `
        <div class="loop-arrow visible">↓</div>
        <div class="loop-step model-step visible active" id="ls-model2">🤖 Model (API call #2)</div>
        <div class="loop-label visible">Tool result injected into context → call model again</div>
      `;
    },
    () => {
      const diagram = document.getElementById('loop-diagram');
      const h = document.getElementById('ls-harness');
      if (h) h.classList.add('active');
      diagram.removeChild(diagram.lastElementChild);
      diagram.removeChild(diagram.lastElementChild);
      diagram.removeChild(diagram.lastElementChild);
    }
  );

  // Step: Final response
  let msg5asst;
  addStep(4,
    () => {
      const diagram = document.getElementById('loop-diagram');
      const m2 = document.getElementById('ls-model2');
      if (m2) m2.classList.remove('active');
      diagram.innerHTML += `
        <div class="loop-arrow visible">↓</div>
        <div class="loop-step response-step visible" id="ls-response">💬 Text response (no more tool calls)</div>
      `;
      msg5asst = addChatMessage('assistant', 'It\'s currently 12°C and overcast in London, with light rain expected this afternoon. Typical London weather!');
    },
    () => {
      removeChatMessage(msg5asst);
      const diagram = document.getElementById('loop-diagram');
      const m2 = document.getElementById('ls-model2');
      if (m2) m2.classList.add('active');
      diagram.removeChild(diagram.lastElementChild);
      diagram.removeChild(diagram.lastElementChild);
    }
  );

  // Step: Show the "loop" annotation
  addStep(4,
    () => {
      const diagram = document.getElementById('loop-diagram');
      diagram.innerHTML += `
        <div style="margin-top: 16px; text-align: center; padding: 12px; border: 1px dashed var(--orange); border-radius: 8px; color: var(--orange); font-family: var(--font-sans); font-size: 13px;">
          An "agent" is just this loop running until the model<br>stops calling tools. That's it. That's the whole trick.
        </div>
      `;
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
      rightPanelTitle.textContent = 'Under the Hood — Tool Calling';
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
        <div style="margin-top: 12px; text-align: center; padding: 12px; border: 1px dashed var(--yellow); border-radius: 8px; color: var(--yellow); font-family: var(--font-sans); font-size: 13px;">
          RAG is just "search, then stuff results into context".<br>The model thinks it always knew this information.
        </div>
      `;
      rightPanelContent.scrollTop = rightPanelContent.scrollHeight;
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
      rightPanelTitle.textContent = 'Under the Hood — RAG';
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
      agentSection.style.background = '#2d1a2e';
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
- get_weather: Get weather data
- create_ticket: Create HR tickets</div>
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
        <div style="margin-top: 8px; text-align: center; padding: 12px; border: 1px dashed var(--purple); border-radius: 8px; color: var(--purple); font-family: var(--font-sans); font-size: 13px;">
          Personality, rules, and capabilities are all just text<br>prepended to the context window. More context.
        </div>
      `;
      rightPanelContent.scrollTop = rightPanelContent.scrollHeight;
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
      rightPanelTitle.textContent = 'Under the Hood — System Prompt';
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
        <div style="margin-top: 12px; text-align: center; padding: 12px; border: 1px dashed var(--cyan); border-radius: 8px; color: var(--cyan); font-family: var(--font-sans); font-size: 13px;">
          Skills are prompt templates that expand into context.<br>
          The user says "save my changes" → the model picks the right<br>
          skill → detailed instructions appear → model follows them.
        </div>
      `;
      rightPanelContent.scrollTop = rightPanelContent.scrollHeight;
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
      rightPanelTitle.textContent = 'Under the Hood — Skills';
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
        <div class="context-section system" style="padding: 8px 12px; margin-bottom: 6px; border-color: rgba(247, 120, 186, 0.4); background: #2d1a2e;">
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
          This presentation was built with a coding agent.
        </div>
      `;
      rightPanelContent.scrollTop = rightPanelContent.scrollHeight;
    },
    () => {
      const fp = document.getElementById('full-picture');
      fp.removeChild(fp.lastElementChild);
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

init();
