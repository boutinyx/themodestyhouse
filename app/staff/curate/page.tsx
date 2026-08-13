import { redirect } from 'next/navigation';
import { hasStaffSession } from '@/lib/staffSession';
import { CurateConsole } from './CurateConsole';

export const dynamic = 'force-dynamic';

export default async function StaffCuratePage() {
  if (!(await hasStaffSession())) redirect('/staff/login');
  return (
    <main className="p-6 max-w-5xl mx-auto">
      <CurateConsole />
    </main>
  );
}
