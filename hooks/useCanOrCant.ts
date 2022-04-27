import { useContext } from 'react'
import { AuthContext } from '../contexts/AuthContext'
import { validateUserPermissions } from '../utils/validateUserPermissions'

type UseCanOrCantParams = {
  permissions?: string[]
  roles?: string[]
}

// hook that will check roles for User
export function useCanOrCant({
  permissions = [],
  roles = [],
}: UseCanOrCantParams) {
  const { user, isAuthenticated } = useContext(AuthContext)

  if (!isAuthenticated) {
    return false
  }

  const userHasValidPermissions = validateUserPermissions({
    user,
    permissions,
    roles,
  })

  return userHasValidPermissions
}
