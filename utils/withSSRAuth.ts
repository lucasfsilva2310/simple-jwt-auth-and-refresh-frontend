import decode from 'jwt-decode'
import { GetServerSideProps, GetServerSidePropsContext } from 'next'
import { destroyCookie, parseCookies } from 'nookies'
import { AuthTokenError } from '../services/errors/AuthTokenError'
import { validateUserPermissions } from './validateUserPermissions'

type WithSSRAuthOptions = {
  permissions?: string[]
  roles?: string[]
}

export function withSSRAuth(
  fn: GetServerSideProps,
  options?: WithSSRAuthOptions
) {
  // High order function, a function calling another one to be more exact
  return async (ctx: GetServerSidePropsContext) => {
    const cookies = parseCookies(ctx)

    const token = cookies['nextAuthToken']

    if (!token) {
      return {
        redirect: {
          destination: '/dashboard',
          permanent: false,
        },
      }
    }

    if (options) {
      const userDecoded = decode<{
        permissions: string[]
        roles: string[]
      }>(token)
      const { permissions, roles } = options

      const userHasValidPermissions = validateUserPermissions({
        user: userDecoded,
        permissions,
        roles,
      })

      if (!userHasValidPermissions) {
        return {
          redirect: {
            destination: '/dashboard',
            permanent: false,
          },
        }
      }
    }

    // else
    // by adding a try/catch here instead of inside of getServerSideProps, we create a generic
    // try/catch that will work on any getServerSideProps that is inside withSSRAuth
    try {
      return await fn(ctx)
    } catch (error) {
      if (error instanceof AuthTokenError) {
        destroyCookie(ctx, 'nextAuthToken')
        destroyCookie(ctx, 'nextAuthRefreshToken')

        return {
          redirect: {
            destination: '/',
            permanent: false,
          },
        }
      }
    }
  }
}
