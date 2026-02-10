import { redirect } from 'next/navigation'

export default function ProtectedPage() {
  // Redirect to setup page to complete configuration
  redirect('/setup')
}
