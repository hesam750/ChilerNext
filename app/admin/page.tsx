import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import AdminPanel from '../../components/AdminPanel'

export default function AdminPage() {
  try {
    const c = cookies().get('session')?.value || ''
    const raw = c ? Buffer.from(c, 'base64').toString('utf8') : ''
    const payload = raw ? JSON.parse(raw) : null
    const role = (payload && payload.role) || 'guest'
    if (role !== 'admin') redirect('/login')
  } catch { redirect('/login') }
  return <AdminPanel />
}

