import { redirect } from 'next/navigation';
import { hasStaffSession } from '@/lib/staffSession';
import { ReviewTray } from './ReviewTray';

export const dynamic = 'force-dynamic';

export default async function StaffCuratePage() {
  if (!(await hasStaffSession())) redirect('/staff/login');
  return <ReviewTray />;
}
