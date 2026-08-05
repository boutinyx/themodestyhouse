'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

// Frosted-glass search that floats over the homepage video hero (hero option 3A).
// Submits to the directory, which reads ?q= and filters (see DirectoryBrowser).
// The placeholder auto-cycles through example searches (typewriter), and pauses
// as soon as the field is focused or the visitor starts typing.
const EXAMPLES = [
  'linen maxi dress',
  'an open abaya',
  'a chiffon hijab',
  'wedding-guest looks',
  'modest swimwear',
  'wide-leg trousers',
];
const STATIC_PLACEHOLDER = 'Search dresses, abayas, hijabs, brands…';

export default function HeroSearch() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [focused, setFocused] = useState(false);
  const [placeholder, setPlaceholder] = useState('Search…');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Auto-changing placeholder. Runs only while the field is idle & empty.
  useEffect(() => {
    if (focused || q) {
      setPlaceholder(STATIC_PLACEHOLDER);
      return;
    }
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    let phrase = 0;
    let chars = 0;
    let deleting = false;

    const tick = () => {
      const example = EXAMPLES[phrase];
      if (reduce) {
        setPlaceholder(`Search ${example}…`);
        phrase = (phrase + 1) % EXAMPLES.length;
        timer.current = setTimeout(tick, 2800);
        return;
      }
      if (!deleting) {
        chars += 1;
        setPlaceholder(`Search ${example.slice(0, chars)}…`);
        if (chars === example.length) {
          deleting = true;
          timer.current = setTimeout(tick, 1600); // hold the full phrase
          return;
        }
        timer.current = setTimeout(tick, 58);
      } else {
        chars -= 1;
        setPlaceholder(`Search ${example.slice(0, chars)}…`);
        if (chars === 0) {
          deleting = false;
          phrase = (phrase + 1) % EXAMPLES.length;
          timer.current = setTimeout(tick, 320);
          return;
        }
        timer.current = setTimeout(tick, 28);
      }
    };
    tick();
    return () => clearTimeout(timer.current);
  }, [focused, q]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const query = q.trim();
    router.push(query ? `/directory?q=${encodeURIComponent(query)}` : '/directory');
  }

  return (
    <form
      onSubmit={submit}
      className="glass-search"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        width: '100%',
        maxWidth: 600,
        margin: '0 auto',
        padding: '8px 8px 8px 22px',
        borderRadius: 999,
        background: 'rgba(251,250,246,0.16)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        border: '1px solid rgba(251,250,246,0.42)',
        boxShadow: '0 14px 34px -16px rgba(0,0,0,0.7)',
      }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(251,250,246,0.85)" strokeWidth="2" aria-hidden="true" style={{ flex: 'none' }}>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3-3" />
      </svg>
      <input
        aria-label="Search modest pieces, brands and categories"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        style={{
          flex: 1,
          minWidth: 0,
          border: 'none',
          background: 'transparent',
          outline: 'none',
          color: 'var(--parchment)',
          fontFamily: 'var(--font-ui)',
          fontSize: 16,
          padding: '14px 12px',
        }}
      />
      <button
        type="submit"
        className="btn-pill"
        style={{ background: 'var(--parchment)', color: 'var(--aubergine)', flex: 'none', padding: '13px 24px' }}
      >
        Search
      </button>
    </form>
  );
}
