import Router from 'next/router'
import { createContext, ReactNode, useEffect, useState } from 'react'
import { setCookie, parseCookies, destroyCookie } from 'nookies'
import { api } from '../services/apiClient'

type User = {
  email: string
  permissions: string[]
  roles: string[]
}

type SignInCredentials = {
  email: string
  password: string
}

type AuthContextData = {
  signIn(credentials: SignInCredentials): Promise<void>
  signOut(): void
  isAuthenticated: boolean
  user: User | undefined
}

type AuthProviderProps = {
  children: ReactNode
}

export const AuthContext = createContext({} as AuthContextData)

// API BroadCastChannel, can provide communcation in between browser tabs, as long as those tabs
//  belongs to the same domain
//  by declaring here and only creating a new instance inside useEffect, we´re prioritizing
//  its instance before anything else
let authChannel: BroadcastChannel

export function signOut() {
  destroyCookie(undefined, 'nextAuthToken')
  destroyCookie(undefined, 'nextAuthRefreshToken')

  // right now we´re signaling all other tabs the message signOut
  authChannel.postMessage('signOut')

  Router.push('/')
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User>()

  const isAuthenticated = !!user

  useEffect(() => {
    authChannel = new BroadcastChannel('auth')

    authChannel.onmessage = (message) => {
      if (message.data === 'signOut') {
        signOut()
      }
    }
  }, [])

  useEffect(() => {
    // Adding a useEffect for everytime this component is rendered, it will get the token via cookies
    //  and then search for user info on endpoint /me using it
    const { nextAuthToken: token } = parseCookies()

    if (token) {
      api
        .get('/me')
        .then((response) => {
          const { email, permissions, roles } = response.data

          setUser({ email, permissions, roles })
        })
        .catch((_error) => {
          // erasing all cookies if something went wrong with getting all info
          destroyCookie(undefined, 'nextAuthToken')
          destroyCookie(undefined, 'nextAuthRefreshToken')

          Router.push('/')
        })
    }
  }, [])

  async function signIn({ email, password }: SignInCredentials) {
    try {
      // Sending credentials to backend
      const response = await api.post('sessions', {
        email,
        password,
      })

      const { permissions, roles, token, refreshToken } = response.data

      // saving data inside cookie
      setCookie(undefined, 'nextAuthToken', token, {
        // How long do i want to make the cookie stay in the browser
        maxAge: 60 * 60 * 24 * 30, // 30 days
        // which routes will have access to this cookie ('/' means all of them)
        path: '/',
      })

      setCookie(undefined, 'nextAuthRefreshToken', refreshToken, {
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: '/',
      })

      setUser({
        email,
        permissions,
        roles,
      })

      // setting api headers before sending user to dashboard route, preventing header to be sent as undefined
      // (see api.ts file)
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`

      Router.push('/dashboard')
    } catch (error) {
      console.log(error)
    }
  }

  return (
    <AuthContext.Provider value={{ signIn, signOut, isAuthenticated, user }}>
      {children}
    </AuthContext.Provider>
  )
}
