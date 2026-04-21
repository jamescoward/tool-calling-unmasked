# Tool Calling, Up Close — Presentation Build Plan

## Context

This is a follow-up talk to "Demystifying Agents" (the parent repo this was
forked from). The parent talk gives a tour of the whole agent stack in ~15
minutes. This talk goes narrow and deep on two things:

1. **What tool calls actually look like on the wire**, and how the harness
   maps the model's JSON output to function invocations.
2. **That LLMs are text completion engines** — the chat transcript is a
   fiction the template builds on top of raw string completion.

Audience: more technical than the parent talk (developers, people who've
used an LLM API but haven't looked closely at the protocol).

Duration target: ~15 minutes.

## Reuse from parent repo

Keep the existing harness — don't rebuild it:

- Split-panel layout (`index.html`): left = chat, right = "Under the Hood".
- Step-based navigation in `app.js` (ArrowRight/ArrowLeft, one beat per
  keypress). See the `steps` array pattern.
- Typing animation, message bubbles, typing indicator — all already built.
- Dark/light theme toggle, progress dots.
- `panelSnapshots` pattern for backward navigation.

New stages replace the old Stage 2–8. Keep Stage 1 (the familiar chat UI)
as the opener. Delete or archive the other stages' code — don't leave dead
branches in the `steps` array.

## Narrative arc

### Stage 1 — Familiar chat (reused)
Short. One exchange. Sets the mental model we're about to break.

### Stage 2 — "It's just a script"
**The text-completion reveal.**

- Right panel slides in showing the raw string the model sees — not the
  `messages: [...]` JSON, the actual templated string with special tokens:
  ```
  <|im_start|>system
  You are a helpful assistant.<|im_end|>
  <|im_start|>user
  What's the capital of France?<|im_end|>
  <|im_start|>assistant
  ```
- Cursor blinks at the end. Frame it: "the model's job is to complete this
  string." The assistant's reply appears character-by-character as
  completion, then `<|im_end|>` closes it.
- Second exchange: same thing, but now the string is longer. Drive home
  that every turn re-sends the whole transcript.
- Land the line: *"We're basically getting it to write a script of a chat
  between a bot and a person."*

**Why this beat matters:** sets up tool calling as "the model completes
text that happens to contain structured JSON" rather than "the model calls
a function." Everything downstream rests on this.

### Stage 3 — A tool call on the wire
**Single-turn tool call, dissected.**

- User asks something that needs a tool. Pick a technical-but-simple
  example: `"How many lines are in app.js?"` (tool: `read_file`).
- Right panel shows the raw API response JSON, pretty-printed:
  ```json
  {
    "stop_reason": "tool_use",
    "content": [{
      "type": "tool_use",
      "id": "toolu_01A...",
      "name": "read_file",
      "input": { "path": "app.js" }
    }]
  }
  ```
- **The animation (this is the centerpiece):**
  - Fields visually lift out of the JSON block.
  - `name: "read_file"` slides across and lands as the function name in a
    rendered call: `read_file(...)`.
  - `input.path: "app.js"` slides across and lands inside the parens:
    `read_file(path="app.js")`.
  - The `id` field slides to a "correlation id" slot — foreshadowing why
    it matters for multi-turn.
- Then show the tool result being wrapped back into the next request:
  ```json
  { "type": "tool_result", "tool_use_id": "toolu_01A...", "content": "1447" }
  ```
- Highlight: `tool_use_id` matches the earlier `id`. That's how the model
  knows which call this result belongs to.
- Model's next completion is plain text: "app.js has 1447 lines."

**Implementation notes:**
- The "lift and map" animation can be done with absolutely-positioned
  clones of the JSON tokens that transition to target positions using CSS
  `transform` + `transition`. Keep the originals in place, fade them while
  the clones fly. Don't use a heavy animation library — the existing CSS
  transition patterns are enough.
- Each field lift/land should be its own step (one ArrowRight per move) so
  the presenter controls the pacing.

### Stage 4 — Multi-turn: a real task
**A few turns of tool calls chained together.**

Task: *"Fix the typo in README.md and commit."* — something an audience
member would actually do with Claude Code.

Turns (one step per arrow-press for each beat):

1. `read_file("README.md")` → returns contents with the typo visible.
2. `edit_file("README.md", old, new)` → returns success.
3. **Deliberate malformed call:** model emits `run_bash` with a shell
   command that has unescaped quotes, harness returns an error:
   ```json
   { "type": "tool_result", "is_error": true,
     "content": "SyntaxError: unexpected EOF while looking for matching quote" }
   ```
4. Model's next turn: recovers, issues corrected `run_bash("git commit -m '...')`.
5. Final text response: "Done."

**Why the malformed call gets real airtime:**
- Nobody shows the error path in tool-calling demos. It's where the
  "agent" abstraction actually earns its name — the loop handles failure.
- Visualise the failed call in red on the right panel; the recovered call
  in green. Leave them both on screen so the audience sees the repair.

The right panel should accumulate turns as a vertical stack (like a
terminal transcript), not replace them — so by the end the audience can
see the whole conversation-plus-tool-calls history in one view. This is
the payoff for Stage 2: that whole stack is *one string* the model keeps
completing.

### Stage 5 — Strip the template
**The callback to Stage 2.**

- Take the final multi-turn state from Stage 4.
- Animate the JSON/pretty-printed view collapsing back into the raw
  templated string — tool calls included, now visible as structured
  blocks inside the transcript:
  ```
  <|im_start|>assistant
  <tool_use>{"name":"read_file","input":{"path":"README.md"}}</tool_use><|im_end|>
  <|im_start|>tool
  <tool_result id="...">...</tool_result><|im_end|>
  ...
  ```
  (Use whichever template style fits the model you're referencing — the
  point is it's all one string.)
- Land the closing line: *"It's completions all the way down."*

## Build phases

### Phase 1 — Prune
- [ ] Remove Stages 2–8 from the parent repo's `steps` array and any
      helper functions only those stages used. Leave Stage 1 intact.
- [ ] Update `STAGE_NAMES` and `TOTAL_STAGES`.
- [ ] Confirm the app still runs and Stage 1 still plays.

### Phase 2 — Raw-string view (Stage 2)
- [ ] New right-panel renderer: mono-font block, special tokens styled
      distinctly (e.g. dimmed + bracketed).
- [ ] Character-by-character completion animation reusing the existing
      typing helpers.
- [ ] Second exchange appends to the string — don't clear between turns.

### Phase 3 — JSON-to-call animation (Stage 3)
- [ ] Right panel shows pretty-printed JSON response.
- [ ] Build the "lift field → land in rendered call" animation. One step
      per field. Keep it CSS-transform based.
- [ ] Show the tool_result wrap-back and the id correlation highlight.

### Phase 4 — Multi-turn + malformed recovery (Stage 4)
- [ ] Stack turns vertically in the right panel.
- [ ] Style error turn in red, recovered turn in green.
- [ ] Each tool call reuses the Stage 3 lift animation, but faster (don't
      re-explain — the audience has seen it once).

### Phase 5 — Template collapse (Stage 5)
- [ ] Animate the structured view collapsing back into the raw string
      from Stage 2, now much longer.
- [ ] Final title card.

### Phase 6 — Polish
- [ ] Test end-to-end forward and backward with arrow keys.
- [ ] Check at 1920×1080 (projector).
- [ ] Verify no network dependencies at runtime.

## Open questions to decide before building

1. **Which model's chat template?** Claude's (`Human:`/`Assistant:` style),
   ChatML (`<|im_start|>`), or Llama 3's? Pick one and commit — mixing
   templates will confuse the audience. Claude's is simplest; ChatML looks
   more "technical" on screen.
2. **Show real API JSON or a stylised version?** Real is more honest but
   noisier. Recommendation: real shape, trimmed fields (drop `usage`,
   `model`, `stop_sequence`, etc.) so the eye lands on `name`/`input`/`id`.
3. **The sample task in Stage 4** — README typo + commit is safe. If you
   want something more visually interesting, a 3-file refactor works but
   eats more stage time.

## Verification

- Click through every step forward, then every step backward. Every stage
  should render identically in both directions (that's what
  `panelSnapshots` is for — reuse the pattern).
- Read the raw-string views out loud. If you stumble over the special
  tokens, the audience will too — adjust styling until they're skimmable.
- The malformed-call recovery should be obvious without narration. If a
  test viewer can't tell what went wrong and how it got fixed just from
  the animation, the visual needs work.