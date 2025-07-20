import { ModernLayout } from '@/components/layout/ModernLayout'

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <ModernLayout>{children}</ModernLayout>
}