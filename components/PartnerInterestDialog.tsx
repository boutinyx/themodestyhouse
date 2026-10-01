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
 * The gradient now covers the WHOLE popup, header and form alike — Tina
 * wanted "more gradients of the whole thing" rather than the gradient
 * stopping at the header with a flat white form below it. `ContactForm`'s
 * `dark` prop re-themes its labels/copy to `--muted-on-dark` /
 * `--brass-on-dark` (already-defined, contrast-checked tokens — see
 * globals.css) for exactly this reason: a shared form can't assume its own
 * colours once the surface behind it is dark. The input/textarea fields
 * themselves stay white (their own `background: '#fff'` in `field`), so
 * they read as light cards sitting on the gradient rather than becoming
 * unreadable. Tried `var(--ink)` solid instead of the gradient — Tina:
 * "nvm its too dark" — gradient it is, just stretched further.
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
          style={{ zIndex: 61, background: 'linear-gradient(180deg, var(--aubergine), var(--plum))' }}
        >
          <div className="p-6 md:p-8 relative shrink-0">
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
          <div className="px-6 md:px-8 pb-6 md:pb-8 overflow-y-auto">
            <h3 className="section-heading text-xl" style={{ color: 'var(--parchment)' }}>What we need from you</h3>
            <p className="mt-2 text-sm" style={{ color: 'var(--muted-on-dark)' }}>
              Answer these four things below — that&rsquo;s all we need to get started.
            </p>
            <p className="mt-4 text-sm font-semibold" style={{ color: 'var(--parchment)' }}>
              We&rsquo;ll follow up within a few days of hearing from you.
            </p>
            <div className="mt-6" style={{ borderTop: '1px solid rgba(255,255,255,0.18)' }} />
            <div className="mt-6">
              <ContactForm siteKey={siteKey} defaultTopic={defaultTopic} defaultMessage={defaultMessage} lockTopic dark />
            </div>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
