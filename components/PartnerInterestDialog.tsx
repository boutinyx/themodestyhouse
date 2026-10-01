'use client';

import { Dialog } from '@base-ui-components/react/dialog';
import { Sparkle, X } from '@phosphor-icons/react';
import { ContactForm } from './ContactForm';

/**
 * The CTA button on /partner-with-us and the popup it opens.
 *
 * Tina: "the pill with I'm interested is not that exciting... why are they
 * coming there in the first place." "I'm interested" describes a feeling;
 * "Get me listed" names the thing they actually came to this page to do —
 * see their brand in the directory next to Aab and Inayah.
 *
 * Opens a popup with the contact form, replacing the form that used to sit
 * inline at the foot of the page — one clear action instead of a form
 * nobody asked to see yet.
 *
 * The header BAR is solid `var(--aubergine)` — Tina pointed at the "Send
 * message" button's exact purple and asked for that, on just the bar "it is
 * on top", not the whole form. The gradient she wanted is on the BACKDROP
 * instead — the dimmed overlay behind the popup — not inside the popup at
 * all; corrected after a first pass wrongly stretched the gradient over the
 * form fields themselves ("i didnt mean that... not the whole form").
 * `ContactForm`'s labels stay in their default light-page colours here,
 * since the form itself is white again. The backdrop gradient is anchored
 * on `--ink` (the footer's dark) rather than `--aubergine` — Tina: "i want
 * dark purple like the footer color" — fading into aubergine, not the
 * reverse.
 */
export function PartnerInterestDialog({
  siteKey,
  defaultTopic,
  defaultMessage,
}: {
  siteKey?: string;
  defaultTopic?: string;
  defaultMessage?: string;
}) {
  return (
    <Dialog.Root>
      <Dialog.Trigger
        className="btn-pill inline-flex items-center gap-2"
        style={{ fontSize: 14, padding: '14px 32px' }}
      >
        <Sparkle size={14} weight="fill" aria-hidden />
        Get me listed
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop
          className="fixed inset-0"
          style={{ background: 'linear-gradient(160deg, rgba(36,27,36,0.85), rgba(68,25,67,0.85))', zIndex: 60 }}
        />
        <Dialog.Popup
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-2xl overflow-hidden flex flex-col w-[calc(100vw-32px)] max-w-md max-h-[90vh]"
          style={{ zIndex: 61 }}
        >
          <div className="p-6 md:p-8 relative shrink-0" style={{ background: 'var(--aubergine)' }}>
            <Dialog.Close
              aria-label="Close"
              className="absolute top-4 right-4 flex items-center justify-center"
              style={{ width: 32, height: 32, borderRadius: 999, background: 'rgba(255,255,255,0.15)' }}
            >
              <X size={16} weight="bold" style={{ color: 'var(--parchment)' }} />
            </Dialog.Close>
            <Dialog.Title className="section-heading text-2xl" style={{ color: 'var(--parchment)', paddingRight: 32 }}>
              Let&rsquo;s talk
            </Dialog.Title>
          </div>
          <div className="p-6 md:p-8 overflow-y-auto" style={{ background: '#fff' }}>
            <h3 className="section-heading text-xl" style={{ color: 'var(--ink)' }}>What we need from you</h3>
            <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>
              Answer these four things below — that&rsquo;s all we need to get started.
            </p>
            <p className="mt-4 text-sm font-semibold" style={{ color: 'var(--ink)' }}>
              We&rsquo;ll follow up within a few days of hearing from you.
            </p>
            <div className="mt-6" style={{ borderTop: '1px solid var(--hairline)' }} />
            <div className="mt-6">
              <ContactForm siteKey={siteKey} defaultTopic={defaultTopic} defaultMessage={defaultMessage} lockTopic />
            </div>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
