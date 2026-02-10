import { redirect } from 'next/navigation'

export default function DashboardPage() {
  // Redirect to Apex (projects) as the default view
  redirect('/apex')
}
