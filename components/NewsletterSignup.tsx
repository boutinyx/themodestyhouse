'use client';

import { useState } from 'react';

type State = 'idle' | 'sending' | 'done' | 'error';

/**
 * Newsletter sign-up pill for the footer.
 *
 * Posts to /api/subscribe, which emails the address to the site owner. There is
 * no subscriber database yet (see lib/subscribe.ts), so the copy promises to be
 * "added to the list" rather than claiming an issue is on its way.
 */
export function NewsletterSignup() {
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState(''); // honeypot
  const [state, setState] = useState<State>('idle');
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (state === 'sending') return;
    setState('sending');
    setError('');
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, website }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setError(data.error || 'Something went wrong. Please try again.');
        setState('error');
        return;
      }
      setState('done');
      setEmail('');
    } catch {
      setError('Something went wrong. Please try again.');
      setState('error');
    }
  }

  if (state === 'done') {
    return (
      <p className="mt-2 text-sm" style={{ color: 'rgba(243,238,228,0.7)' }}>
        Thank you — you&rsquo;re on the list.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="mt-3">
      {/* BOX alignment, not optical alignment — reversed 2026-08-09.
          This pill used to carry `marginLeft: -20`, so that the PLACEHOLDER
          text lined up with the eyebrow above it rather than the pill's edge.
          The cost was written down at the time and accepted: the pill hangs 20px
          into the gutter. Seen on a real phone that is the only thing you
          notice — the field starts left of every other element in the footer,
          and Tina's read was that it is not aligned with the other words.
          Measured at 390px: column and eyebrow at x=32, pill at x=12.
          So the pill's edge now sits on the column like everything else, and the
          17px of border + padding that the old offset was cancelling is simply
          the normal inset of text inside a field.

          items-stretch, not items-center. The button sets its own height from
          its 11px type; the input sets its own from 16px (forced on touch
          devices so iOS does not zoom the page on focus — globals.css). Centred,
          the shorter one floats: measured 36.5px of brass inside a 42px pill,
          i.e. 3.8px of dark gap above and below the button, which is what made
          it read as broken. Stretched, the brass fills the cap and the pill is
          one shape again. */}
      <div
        className="flex items-stretch overflow-hidden"
        style={{
          borderRadius: 'var(--radius-button)',
          border: '1px solid rgba(243,238,228,0.22)',
          background: 'rgba(243,238,228,0.06)',
        }}
      >
        <label htmlFor="newsletter-email" className="sr-only">Email address</label>
        <input
          id="newsletter-email"
          type="email"
          name="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Your email"
          className="flex-1 bg-transparent outline-none"
          style={{
            padding: '9px 16px',
            fontSize: 13,
            color: 'var(--parchment)',
            fontFamily: 'var(--font-ui-stack)',
            minWidth: 0,
          }}
        />
        {/* Honeypot: hidden from people, irresistible to bots. */}
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          aria-hidden="true"
          style={{ position: 'absolute', left: '-9999px', width: 1, height: 1 }}
        />
        <button
          type="submit"
          disabled={state === 'sending'}
          className="shrink-0"
          style={{
            background: 'var(--brass)',
            color: 'var(--ink)',
            fontFamily: 'var(--font-label-stack)',
            textTransform: 'uppercase',
            letterSpacing: 'var(--track-label)',
            fontSize: 11,
            // Vertical padding is gone: the button now takes its height from the
            // row (items-stretch above), so a fixed 10px here would fight it.
            padding: '0 18px',
            opacity: state === 'sending' ? 0.7 : 1,
          }}
        >
          {state === 'sending' ? 'Sending' : 'Sign up'}
        </button>
      </div>
      {error && (
        <p className="mt-2 text-sm" role="alert" style={{ color: '#e0b4a8' }}>
          {error}
        </p>
      )}
    </form>
  );
}
