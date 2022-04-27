import axios, { AxiosError } from 'axios'
import { parseCookies, setCookie } from 'nookies'
import { signOut } from '../contexts/AuthContext'
import { AuthTokenError } from './errors/AuthTokenError'

let isRefreshing = false
let failedRequestsBecauseOfRefreshQueue: {
  onSuccess: (token: string) => void
  onFailure: (error: AxiosError<any, any>) => void
}[] = []

export function setupAPIClient(ctx = undefined) {
  const cookies = parseCookies(ctx)

  const api = axios.create({
    baseURL: 'http://localhost:3333',

    // setting default headers to always get token via cookies
    headers: {
      Authorization: `Bearer ${cookies['nextAuthToken']}`,
    },
  })

  // intercepting response
  api.interceptors.response.use(
    (response) => {
      // if it was a success, just return
      return response
    },
    // if it returns an error, see it token needs a refresh or if we will unlog the user
    (error: AxiosError) => {
      if (error?.response?.status === 401) {
        if (error?.response?.data?.code === 'token.expired') {
          // refresh token
          const refreshedCookies = parseCookies(ctx)

          const { nextAuthRefreshToken: refreshToken } = refreshedCookies
          // contains default config for requests inside queue
          const originalConfig = error.config

          // by using isRefreshing variable, we are creating an artifical queue that will put all requests
          // inside an array and it will only start the requests after the token is refreshed
          if (!isRefreshing) {
            isRefreshing = true
            api
              .post('/refresh', {
                refreshToken,
              })
              .then((response) => {
                const { token } = response.data

                setCookie(ctx, 'nextAuthToken', token, {
                  maxAge: 60 * 60 * 24 * 30, // 30 days
                  path: '/',
                })
                setCookie(
                  ctx,
                  'nextAuthRefreshToken',
                  response.data.refreshToken,
                  {
                    maxAge: 60 * 60 * 24 * 30, // 30 days
                    path: '/',
                  }
                )

                // setting headers again after refreshing
                api.defaults.headers.common['Authorization'] = `Bearer ${token}`

                // after refresh is done we execute all requests that were waiting (If it was a success)
                failedRequestsBecauseOfRefreshQueue.forEach((request) =>
                  request.onSuccess(token)
                )
                failedRequestsBecauseOfRefreshQueue = []
              })
              .catch((error) => {
                // after an error ocurred during refreshing, execute onFailure option
                failedRequestsBecauseOfRefreshQueue.forEach((request) =>
                  request.onFailure(error)
                )
              })
              .finally(() => {
                // set is refreshing to false again after all logic is done
                isRefreshing = false
              })
          }

          // Axios does not accept async function so we need to use Promises with interceptors
          // everytime that a request does not pass inside isRefreshing condition, it will be pushed to failedRequestsBecauseOfRefreshQueue array
          return new Promise((resolve, reject) => {
            failedRequestsBecauseOfRefreshQueue.push({
              onSuccess: (token: string) => {
                originalConfig.headers!['Authorization'] = `Bearer ${token}`

                resolve(api(originalConfig))
              },
              onFailure: (error: AxiosError) => {
                reject(error)
              },
            })
          })
        } else {
          // unlog user and erase all cookies
          const isInsideBrowser = process.browser
          if (isInsideBrowser) {
            signOut()
          } else {
            return Promise.reject(new AuthTokenError())
          }
        }
      }

      // its important to always finish a logic with a promise inside axios for it to continue
      return Promise.reject(error)
    }
  )

  return api
}
