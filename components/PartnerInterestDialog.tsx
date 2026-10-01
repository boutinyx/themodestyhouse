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
 * The gradient lives on the popup's HEADER, not behind the form fields:
 * `ContactForm`'s labels default to `.eyebrow` (`var(--muted)`, a
 * brown-grey) for a parchment/white page — on a dark aubergine-to-plum
 * gradient directly behind them those would be close to unreadable, and
 * re-theming a shared form for one dark popup was more risk than benefit.
 * The gradient band carries the title instead (its own text, so its own
 * colour is free to set), and the form sits on white underneath — a real,
 * clearly visible gradient background for the popup, without touching the
 * form's legibility. Tried `var(--ink)` (the footer's dark) instead — Tina:
 * "nvm its too dark" — back to the gradient.
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
          style={{ background: 'rgba(36,27,36,0.55)', zIndex: 60 }}
        />
        <Dialog.Popup
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-2xl overflow-hidden flex flex-col w-[calc(100vw-32px)] max-w-md max-h-[90vh]"
          style={{ zIndex: 61 }}
        >
          <div
            className="pt-5 pb-6 px-6 md:pt-6 md:pb-8 md:px-8 relative shrink-0"
            style={{ background: 'linear-gradient(135deg, var(--aubergine), var(--plum))' }}
          >
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
              <ContactForm siteKey={siteKey} defaultTopic={defaultTopic} defaultMessage={defaultMessage} />
            </div>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
