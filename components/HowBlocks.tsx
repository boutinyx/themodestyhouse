'use client';

import { useEffect, useRef, useState } from 'react';
import { trackGoal, type GoalEvent } from '@/lib/pulse';
import { CaretDown } from '@phosphor-icons/react';

export type HowBlock = { step: string; title: string; body: string };

/**
 * The "how it works" steps on /about: title only, opening to reveal the body.
 *
 * WHY THIS IS A CLIENT COMPONENT AND NOT `:hover` IN CSS
 * -----------------------------------------------------
 * Tina asked for "when you hover over the blocks they open". A CSS-only
 * `:hover` reveal is a desktop-pointer construct and is **unoperable on every
 * iPhone and iPad** — that is CLAUDE.md §10.25, where the filter dropdowns were
 * revealed by `group-hover` plus `group-focus-within` and neither half ever
 * fired on touch, because a touch screen has no hover and Safari deliberately
 * does not move focus to a <button> when you tap it. Chromium hid the bug
 * completely: its emulated tap DOES focus the button, so every Chromium check
 * reported the page clean.
 *
 * So the open state is React state, driven by three independent inputs:
 *   - mouse     — onPointerEnter / onPointerLeave, which is the hover Tina asked for
 *   - touch     — onClick toggles, so a tap works with no hover at all
 *   - keyboard  — the control is a real <button> with aria-expanded, so Enter
 *                 and Space toggle it for free
 *
 * THERE IS DELIBERATELY NO onFocus HANDLER. Opening on focus reads well for a
 * keyboard user, and it was written that way first — but Chromium's touch
 * emulation (and Android) MOVES FOCUS to a <button> when you tap it, which is
 * the §10.25 behaviour in reverse. Focus opened the block and the click that
 * followed toggled it shut, so a tap measurably did nothing in Chromium at
 * 390px while passing in WebKit. Enter/Space on a real button is the standard
 * disclosure interaction and cannot collide with anything.
 *
 * `pointerType === 'mouse'` IS LOAD-BEARING, not a tidy-up. A touch tap does
 * not only produce a click: browsers also synthesise the pointer/mouse
 * sequence around it. Instrumented on the real element, a Chromium tap fires
 * pointerenter:touch -> pointerdown -> pointerleave:touch -> mousedown ->
 * click. With the hover bound to plain onMouseEnter/onMouseLeave, the enter
 * opened the block and the click toggled it straight back shut, so a tap
 * measurably did nothing — the §10.25 outcome reached by a different road.
 * Gating on pointerType means touch never opens by "hover" and the tap is the
 * only thing that toggles.
 *
 * One open at a time. With hover driving it, two blocks left open behind the
 * pointer would read as broken, and it keeps the column's height honest.
 *
 * The body stays in the DOM when closed — it is real page content and should
 * be in the HTML a crawler sees — but goes `visibility: hidden`, which takes it
 * out of the accessibility tree and out of tab order so it cannot contradict
 * `aria-expanded`. The delayed visibility transition lets the close animate
 * before the content is taken away.
 */
export default function HowBlocks({
  blocks,
  headingLevel = 'h3',
  goal,
}: {
  blocks: HowBlock[];
  headingLevel?: 'h2' | 'h3';
  /** Pulse goal to emit when a block is deliberately opened. Opt-in per call
   *  site: /faq passes `faq_open`, /about passes nothing, because "which
   *  question did a reader have" is a real signal and "did someone sweep the
   *  pointer down the how-it-works column" is not. */
  goal?: GoalEvent;
}) {
  const [openStep, setOpenStep] = useState<string | null>(null);
  /** Steps already counted this page view. A hover-driven accordion opens and
   *  closes as the pointer travels, and the same question re-counted five times
   *  on the way past would read as interest it never had. */
  const counted = useRef<Set<string>>(new Set());

  // Deliberately NOT fired from the click handler. On a desktop these open on
  // hover (see the note above), so counting clicks alone would record only
  // touch users and silently under-report every mouse. Counting the OPEN STATE
  // instead covers both — but a bare pointer sweep down the column opens every
  // block in turn, so a block has to stay open for 700ms before it counts as
  // someone actually reading it.
  useEffect(() => {
    if (!goal || openStep === null || counted.current.has(openStep)) return;
    const step = openStep;
    const block = blocks.find((b) => b.step === step);
    const t = setTimeout(() => {
      counted.current.add(step);
      trackGoal(goal, { question: block?.title ?? step });
    }, 700);
    return () => clearTimeout(t);
  }, [openStep, goal, blocks]);
  // The disclosure button's title becomes a real heading (WAI-ARIA Accordion
  // Pattern: heading wraps the trigger button), not a styled <span> — this
  // used to render 10 "questions" on /faq with zero actual <h2>/<h3> tags,
  // which is both an accessibility gap (no heading-navigation) and an AEO
  // one (claude-seo's seo-geo skill names question-based headings as a
  // strong AI-citability signal). Caller picks the level since /about's use
  // sits under its own h2 (needs h3) while /faq has no other h2 (needs h2).
  const Heading = headingLevel;

  return (
    <ol className="grid gap-3" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {blocks.map((b) => {
        const isOpen = openStep === b.step;
        return (
          <li
            key={b.step}
            onPointerEnter={(e) => {
              if (e.pointerType === 'mouse') setOpenStep(b.step);
            }}
            onPointerLeave={(e) => {
              if (e.pointerType === 'mouse') setOpenStep((s) => (s === b.step ? null : s));
            }}
            style={{
              background: 'var(--parchment)',
              border: '1px solid var(--hairline)',
              /* 18px, the radius of the Style-It panel on the homepage — the
                 roundest card the brand uses. The 8px these carried is the
                 site's tight radius, for thumbnails and small surfaces. */
              borderRadius: 18,
              transition: 'border-color 200ms ease, box-shadow 200ms ease',
              borderColor: isOpen ? 'var(--brass)' : 'var(--hairline)',
              boxShadow: isOpen ? '0 18px 40px -28px rgba(68,25,67,0.35)' : 'none',
            }}
          >
            <Heading style={{ margin: 0 }}>
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={`how-body-${b.step}`}
                onClick={() => setOpenStep((s) => (s === b.step ? null : b.step))}
                className="w-full flex items-center gap-4 text-left"
                /* 56px of height, comfortably over the 44px tap-target floor the
                   mobile audit enforces, without padding that would double up on
                   the body underneath. */
                style={{ padding: '17px 20px', minHeight: 56, background: 'none', border: 0 }}
              >
                {/* aria-hidden: the step number is decorative for the heading's
                    accessible name — "01 What is an abaya?" reads worse than
                    "What is an abaya?" to a screen reader, and it's still
                    visible to sighted users. */}
                <span
                  className="eyebrow"
                  aria-hidden="true"
                  style={{ color: 'var(--plum)', fontVariantNumeric: 'lining-nums tabular-nums' }}
                >
                  {b.step}
                </span>
                <span
                  className="serif"
                  style={{ fontSize: 17, lineHeight: 1.25, color: 'var(--ink)', flex: 1 }}
                >
                  {b.title}
                </span>
                <CaretDown
                  size={14}
                  weight="bold"
                  aria-hidden
                  style={{
                    color: 'var(--muted)',
                    flexShrink: 0,
                    transition: 'transform 260ms ease',
                    transform: isOpen ? 'rotate(180deg)' : 'none',
                  }}
                />
              </button>
            </Heading>

            {/* 0fr -> 1fr on a grid row is what animates an unknown height.
                A max-height guess either clips a long body or eases against a
                number the content never reaches. */}
            <div
              id={`how-body-${b.step}`}
              style={{
                display: 'grid',
                gridTemplateRows: isOpen ? '1fr' : '0fr',
                transition: 'grid-template-rows 260ms ease',
              }}
            >
              <div
                style={{
                  overflow: 'hidden',
                  visibility: isOpen ? 'visible' : 'hidden',
                  transition: `visibility 0s linear ${isOpen ? '0s' : '260ms'}`,
                }}
              >
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: 'var(--ink)', margin: 0, padding: '0 20px 18px' }}
                >
                  {b.body}
                </p>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
