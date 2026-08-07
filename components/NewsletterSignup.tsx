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
      {/* Optical alignment, not box alignment. The pill's EDGE already sat flush
          with the "The Edit, in your inbox" eyebrow above it (both measured at
          x=1085), but the placeholder inside started at 1102 — pushed right by
          this border (1px) plus the input's padding-left (16px) — so the field
          read as indented under its own label. 17px of this is the mechanical
          correction — border + padding — which lands the placeholder exactly on
          the eyebrow's 1085. The extra 3px is Tina's optical call: the eyebrow
          is Marcellus at 10px with 0.28em tracking and the placeholder is Jost
          at 13px, and their differing left side-bearings make a geometric match
          still read a touch right. The cost, chosen deliberately: the pill
          overhangs the footer column by 20px.
          If the border width or the input padding changes, the 17 must change
          with them; the 3 is taste and can stay. */}
      <div
        className="flex items-center overflow-hidden"
        style={{
          marginLeft: -20,
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
            padding: '10px 18px',
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
