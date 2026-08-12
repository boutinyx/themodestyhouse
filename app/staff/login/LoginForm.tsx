'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function LoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/staff/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || 'Something went wrong.');
        setSubmitting(false);
        return;
      }
      router.push('/staff/curate');
      router.refresh();
    } catch {
      setError('Network error — try again.');
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <input
        type="password"
        autoFocus
        autoComplete="current-password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{
          background: 'var(--parchment)', border: '1px solid var(--hairline)',
          borderRadius: 6, padding: '10px 14px', fontSize: 15,
        }}
      />
      {error && <p className="text-sm" style={{ color: '#a13a3a' }}>{error}</p>}
      <button
        type="submit"
        disabled={submitting || password.length === 0}
        className="btn-pill"
        style={{
          background: 'var(--aubergine)', color: 'var(--parchment)',
          padding: '10px 14px', borderRadius: 999, opacity: submitting ? 0.6 : 1,
        }}
      >
        {submitting ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
