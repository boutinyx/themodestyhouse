'use client';
import { useEffect, useRef, useState } from 'react';
import { trackGoal } from '@/lib/pulse';
import { TOPICS } from '@/lib/contactTopics';

type Status = 'idle' | 'sending' | 'sent' | 'error';

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      reset: (id?: string) => void;
    };
  }
}

const field: React.CSSProperties = {
  width: '100%',
  background: '#fff',
  border: '1px solid var(--hairline)',
  borderRadius: 12,
  padding: '11px 14px',
  fontSize: 14,
  color: 'var(--ink)',
  // Form controls do NOT inherit font-family from the page — the UA stylesheet
  // sets its own. Without this the Subject select rendered "General enquiry" in
  // Arial/Helvetica: the only body-weight text on the page not in the house
  // typeface, sitting in the middle of the form.
  fontFamily: 'var(--font-ui-stack)',
};

/** The Subject select, which needs two things the other fields do not.
 *
 *  `appearance: none` — WITHOUT IT WEBKIT DISCARDS border-radius AND padding on
 *  a menulist select, so on every iPhone and iPad this one field rendered as a
 *  squat native control in the middle of an otherwise styled form: measured 23px
 *  tall against its siblings' 43px, square corners against their 12px radius,
 *  text inset 9px against their 19px, and the native double-chevron stepper
 *  instead of a single caret. Chromium honoured all of it, so the form looked
 *  correct in every Chromium check and wrong on the whole of iOS.
 *
 *  Dropping the native arrow means drawing one: an inline SVG data-URI caret,
 *  with right padding to clear it. It is a background image rather than a
 *  Phosphor component because a <select> cannot contain an element (§6 is about
 *  icons in markup; there is no markup available here).
 */
const CARET =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8' fill='none'><path d='M1 1.5L6 6.5L11 1.5' stroke='%23796e5e' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/></svg>";
const selectField: React.CSSProperties = {
  ...field,
  appearance: 'none',
  WebkitAppearance: 'none',
  MozAppearance: 'none',
  paddingRight: 38,
  backgroundImage: `url("${CARET}")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 14px center',
};

export function ContactForm({ siteKey, defaultTopic }: { siteKey?: string; defaultTopic?: string }) {
  const [status, setStatus] = useState<Status>('idle');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const widgetRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | undefined>(undefined);
  const tokenRef = useRef('');

  // Turnstile is loaded only when a site key exists, so the form still works
  // (behind the honeypot and server-side checks) before Turnstile is configured.
  useEffect(() => {
    if (!siteKey || !widgetRef.current || widgetId.current) return;
    const render = () => {
      if (!window.turnstile || !widgetRef.current || widgetId.current) return;
      widgetId.current = window.turnstile.render(widgetRef.current, {
        sitekey: siteKey,
        callback: (t: string) => { tokenRef.current = t; },
        'expired-callback': () => { tokenRef.current = ''; },
        theme: 'light',
      });
    };
    if (window.turnstile) { render(); return; }
    const s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    s.async = true;
    s.onload = render;
    document.head.appendChild(s);
  }, [siteKey]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus('sending');
    setErrors({});
    setFormError('');

    const data = new FormData(e.currentTarget);
    const payload = {
      name: data.get('name'),
      email: data.get('email'),
      topic: data.get('topic'),
      message: data.get('message'),
      website: data.get('website'), // honeypot
      turnstileToken: tokenRef.current,
    };

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.ok) {
        // The TOPIC and nothing else. Name, email address and message body are
        // the one genuinely personal payload on this site and are not in this
        // goal's allowlist, so they cannot travel even if passed here by
        // mistake. Only a message the API accepted counts.
        trackGoal('contact_submit', { topic: String(payload.topic ?? '') });
        setStatus('sent');
        return;
      }
      setStatus('error');
      if (json.errors) setErrors(json.errors);
      setFormError(json.error || 'Something went wrong. Please try again.');
      if (window.turnstile && widgetId.current) window.turnstile.reset(widgetId.current);
      tokenRef.current = '';
    } catch {
      setStatus('error');
      setFormError('Could not reach the server. Please check your connection and try again.');
    }
  }

  if (status === 'sent') {
    return (
      <div className="mt-8 rounded-xl p-6 text-center" style={{ background: '#fff', border: '1px solid var(--hairline)' }}>
        <div className="eyebrow" style={{ color: 'var(--brass)' }}>Message sent</div>
        <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>
          Thank you — we&rsquo;ve got it and will reply to the address you gave us.
        </p>
      </div>
    );
  }

  const err = (k: string) =>
    errors[k] ? <p className="mt-1 text-xs" style={{ color: '#a3342f' }}>{errors[k]}</p> : null;

  return (
    <form onSubmit={onSubmit} className="mt-8 text-left space-y-4" noValidate>
      <div>
        <label htmlFor="name" className="eyebrow block mb-1">Name</label>
        <input id="name" name="name" required maxLength={100} style={field} autoComplete="name" />
        {err('name')}
      </div>

      <div>
        <label htmlFor="email" className="eyebrow block mb-1">Email</label>
        <input id="email" name="email" type="email" required maxLength={254} style={field} autoComplete="email" />
        {err('email')}
      </div>

      <div>
        <label htmlFor="topic" className="eyebrow block mb-1">Subject</label>
        <select id="topic" name="topic" defaultValue={defaultTopic ?? 'general'} style={selectField}>
          {TOPICS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        {err('topic')}
      </div>

      <div>
        <label htmlFor="message" className="eyebrow block mb-1">Message</label>
        <textarea id="message" name="message" required rows={7} maxLength={5000} style={{ ...field, resize: 'vertical' }} />
        {err('message')}
      </div>

      {/* Honeypot: hidden from people, irresistible to bots. Not display:none —
          some bots skip those; off-screen with aria-hidden is more effective. */}
      <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', opacity: 0, height: 0, overflow: 'hidden' }}>
        <label htmlFor="website">Website</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      {siteKey ? <div ref={widgetRef} className="pt-1" /> : null}

      {formError ? (
        <p className="text-sm" style={{ color: '#a3342f' }} role="alert">{formError}</p>
      ) : null}

      <button
        type="submit"
        disabled={status === 'sending'}
        className="btn-pill"
        style={{ background: 'var(--aubergine)', color: 'var(--parchment)', opacity: status === 'sending' ? 0.6 : 1 }}
      >
        {status === 'sending' ? 'Sending…' : 'Send message'}
      </button>
    </form>
  );
}
