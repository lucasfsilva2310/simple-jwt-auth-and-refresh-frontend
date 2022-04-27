import { ReactNode } from 'react'
import { useCanOrCant } from '../hooks/useCanOrCant'

interface CanSeeComponentProps {
  children: ReactNode
  permissions?: string[]
  roles?: string[]
}

export function CanSeeComponent({
  children,
  permissions,
  roles,
}: CanSeeComponentProps) {
  const userCanSeeComponent = useCanOrCant({ permissions, roles })

  if (!userCanSeeComponent) {
    return null
  }

  return <>{children}</>
}
