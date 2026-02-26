# Demystifying Agents - Presentation Build Plan

## Context
Build an interactive web-based presentation that progressively reveals how LLM agents work under the hood. It starts as a familiar chatbot UI and gradually peels back layers to show context windows, tool calling, RAG, and the full agent loop. The meta angle: the presentation itself was built with a coding agent.

Target: technical audience (software engineers) but accessible to non-technical people. Presented from a laptop/projector.

## Key Decisions
- **Duration**: ~15 minutes. Keep explanations concise, don't get bogged down in technical detail.
- **No live demos**: The animated right panel serves as the illustration. All content is pre-scripted.
- **Navigation**: Fine-grained - each keypress (ArrowRight) advances one step (a message, an animation beat, a reveal). ArrowLeft goes back. This gives full control over pacing during the talk.

## Approach: Static webpage, no frameworks
- Single `index.html` + `styles.css` + `app.js` (possibly split JS into modules later)
- No build tools, no React, no bundler - vanilla HTML/CSS/JS
- Dark theme (think VS Code / terminal aesthetic)
- Smooth CSS transitions between steps

## Layout Design
Split-panel layout that evolves:
- **Left panel**: The chat interface (always visible, familiar chatbot look). Starts full-width, shrinks when right panel appears.
- **Right panel**: "Under the hood" view that slides in from Stage 2 onwards
  - Shows context payloads, tool calls, thinking blocks, RAG flow etc.
  - Colour-coded sections so the audience can track what's what
- Bottom bar: subtle step indicator (dots or progress bar)

## Narrative Stages (8 sections)

### Stage 1: The Chat Interface
- Full-width chat UI, looks like ChatGPT/Claude
- Pre-scripted messages that "type" in with a typing animation
- Simple Q&A exchange (e.g. "What is the capital of France?" → "The capital of France is Paris.")
- **Goal**: Establish the familiar mental model

### Stage 2: The Context Window
- Right panel slides in, showing the raw API request/response JSON
- As each message appears in chat, the JSON payload visibly grows
- Highlight that the FULL conversation is sent every time (the model is stateless)
- Animation: pulse/highlight the growing messages array in the JSON
- Maybe show a "context window" bar filling up
- **Goal**: First "aha" - the model doesn't remember anything, it re-reads everything

### Stage 3: Reasoning Models (Thinking)
- Chat shows a more complex question (e.g. a logic puzzle)
- Right panel shows a `<thinking>` block expanding in the API response
- The thinking content is shown but visually marked as "hidden from user"
- Chat side only shows the final answer
- **Goal**: Reasoning/chain-of-thought is just more context, same pattern

### Stage 4: Tool Calling (The Agent Loop)
- This is the centrepiece - needs the best animation
- Chat: user asks something that requires a tool (e.g. "What's the weather in London?")
- Right panel shows the API response containing a `tool_use` block instead of text
- Animation: show the harness intercepting, executing the tool, then making a SECOND API call with the tool result injected
- Visual: a loop diagram or flowchart that builds itself - user → model → tool call → harness → model → response
- Show that the "agent" is really just this loop running until the model stops calling tools
- **Goal**: The core reveal - agents are just automated tool-call loops

### Stage 5: RAG
- Chat: user asks about internal company docs ("What's our parental leave policy?")
- Right panel: show a search step BEFORE the model is called
- Animation: query → search index → retrieve chunks → inject into context → then call model
- The model's context now has `[Retrieved documents]` section visible
- **Goal**: RAG is just "search then stuff into context"

### Stage 6: System Prompts & agent.md
- Right panel: reveal that there's been a system prompt all along (slide it in at the top of the context)
- Show an `agent.md` file being loaded and prepended
- Content: rules, persona, constraints
- **Goal**: Personality and rules are just more context at the top

### Stage 7: Skills / Slash Commands
- Chat: user types `/commit` (explicit skill) OR just says "save my changes" (discoverable skill)
- Right panel: show the system prompt listing available skills with descriptions
- The model matches the user's intent to a skill → calls a tool to fetch the skill template → template expands into detailed instructions injected into context
- Discoverable skills: the user doesn't need to know the skill exists - the model infers which skill to use from the request and the skill descriptions. This is itself a form of tool calling.
- **Goal**: Skills are just prompt templates that expand into context. Discoverable skills show how tool calling and prompt expansion compose together.

### Stage 8: Conclusion
- Both panels visible, fully annotated
- Zoom out to show the full picture: system prompt + agent.md + skill expansion + RAG chunks + conversation history + thinking blocks + tool calls - all feeding into one context window
- Title: "It's context all the way down"
- Subtle reveal: "This presentation was built with a coding agent"
- **Goal**: Tie it all together

## Build Order (Implementation Phases)

### Phase 1: Scaffold & Chat UI ✅
- [x] Set up `index.html`, `styles.css`, `app.js`
- [x] Build the chat interface (dark theme, message bubbles, typing animation)
- [x] Implement the stage navigation system (keyboard arrows, stage indicator)
- [x] Pre-script a few chat messages for Stage 1
- **Deliverable**: A realistic-looking chatbot that types out pre-scripted messages

### Phase 2: The Right Panel & Context Window (Stage 2)
- [ ] Add the split-panel layout with the right panel
- [ ] Build the JSON/context visualisation for the right panel
- [ ] Animate the context growing as messages are added
- [ ] Style the JSON view (syntax highlighting, collapsible sections)
- **Deliverable**: Stage 1 → Stage 2 transition works with the reveal animation

### Phase 3: Reasoning (Stage 3) & Tool Calling (Stage 4)
- [ ] Add thinking block visualisation
- [ ] Build the tool calling animation (the loop diagram)
- [ ] This is the most important animation - spend time making it clear
- **Deliverable**: The core "agent loop" explanation is working

### Phase 4: RAG, System Prompts, Skills (Stages 5-7)
- [ ] Add the RAG search → inject flow
- [ ] Add system prompt reveal animation
- [ ] Add skill expansion animation
- [ ] These are variations on the same theme so should go faster

### Phase 5: Conclusion & Polish (Stage 8)
- [ ] Build the zoomed-out "full picture" view
- [ ] Add the "built with an agent" reveal
- [ ] Polish transitions, timing, typography
- [ ] Test the full flow end-to-end

## Tech Details
- **Fonts**: Mono font for code/JSON (JetBrains Mono or Fira Code via Google Fonts), sans-serif for chat (Inter or system font)
- **Colours**: Dark background (#1a1a2e or similar), accent colours for different context types (blue for user messages, green for assistant, orange for tool calls, purple for thinking, yellow for RAG chunks)
- **Animations**: CSS transitions + minimal JS for sequencing. `requestAnimationFrame` for typing effects.
- **Navigation**: `keydown` listener for ArrowRight/ArrowLeft. Each stage is a function that sets up its visuals.

## Verification
- Open `index.html` in a browser and click through all 8 stages
- Check that animations are smooth and text is readable at projector resolution (test at 1920x1080)
- Verify keyboard navigation works forwards and backwards
- Ensure no external dependencies that require network (or bundle the font)
