import { redirect } from 'next/navigation';
import { hasStaffSession } from '@/lib/staffSession';
import { LoginForm } from './LoginForm';

export const dynamic = 'force-dynamic';

export default async function StaffLoginPage() {
  if (await hasStaffSession()) redirect('/staff/curate');

  return (
    <main
      className="min-h-screen flex items-center justify-center px-6"
      style={{ background: 'var(--parchment)' }}
    >
      <div
        className="w-full max-w-sm p-8"
        style={{ background: 'var(--bone)', border: '1px solid var(--hairline)', borderRadius: 8 }}
      >
        <h1 className="serif text-xl mb-1" style={{ color: 'var(--ink)' }}>Staff sign in</h1>
        <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>
          The Modesty House — internal tools.
        </p>
        <LoginForm />
      </div>
    </main>
  );
}
