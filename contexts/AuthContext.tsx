import Router from "next/router"
import { createContext, ReactNode, useEffect, useState } from "react"
import { setCookie, parseCookies, destroyCookie } from "nookies"
import { api } from "../services/api"

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
  isAuthenticated: boolean
  user: User | undefined
}

type AuthProviderProps = {
  children: ReactNode
}

export const AuthContext = createContext({} as AuthContextData)

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User>()

  const isAuthenticated = !!user

  useEffect(() => {
    // Adding a useEffect for everytime this component is rendered, it will get the token via cookies
    //  and then search for user info on endpoint /me using it
    const { nextAuthToken: token } = parseCookies()

    if (token) {
      api
        .get("/me")
        .then((response) => {
          const { email, permissions, roles } = response.data

          setUser({ email, permissions, roles })
        })
        .catch((_error) => {
          // erasing all cookies if something went wrong with getting all info
          destroyCookie(undefined, "nextAuthToken")
          destroyCookie(undefined, "nextAuthRefreshToken")

          Router.push("/")
        })
    }
  }, [])

  async function signIn({ email, password }: SignInCredentials) {
    try {
      // Sending credentials to backend
      const response = await api.post("sessions", {
        email,
        password,
      })

      const { permissions, roles, token, refreshToken } = response.data

      // saving data inside cookie
      setCookie(undefined, "nextAuthToken", token, {
        // How long do i want to make the cookie stay in the browser
        maxAge: 60 * 60 * 24 * 30, // 30 days
        // which routes will have access to this cookie ('/' means all of them)
        path: "/",
      })

      setCookie(undefined, "nextAuthRefreshToken", refreshToken, {
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: "/",
      })

      // Saving response inside State if everything went ok
      setUser({
        email,
        permissions,
        roles,
      })

      // setting api headers before sending user to dashboard route, preventing header to be sent as undefined
      // (see api.ts file)
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`

      // Redirect User
      Router.push("/dashboard")
    } catch (error) {
      console.log(error)
    }
  }

  return (
    <AuthContext.Provider value={{ signIn, isAuthenticated, user }}>
      {children}
    </AuthContext.Provider>
  )
}
