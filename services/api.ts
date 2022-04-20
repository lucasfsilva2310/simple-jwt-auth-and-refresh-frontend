import axios, { AxiosError } from "axios"
import Router from "next/router"
import { destroyCookie, parseCookies, setCookie } from "nookies"

const cookies = parseCookies()
let isRefreshing = false
let failedRequestsBecauseOfRefreshQueue: {
  onSuccess: (token: string) => void
  onFailure: (error: AxiosError<any, any>) => void
}[] = []

export const api = axios.create({
  baseURL: "http://localhost:3333",

  // setting default headers to always get token via cookies
  headers: {
    Authorization: `Bearer ${cookies["nextAuthToken"]}`,
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
      if (error?.response?.data?.code === "token.expired") {
        // refresh token
        const refreshedCookies = parseCookies()

        const { nextAuthRefreshToken: refreshToken } = refreshedCookies
        // contains default config for requests inside queue
        const originalConfig = error.config

        // by using isRefreshing variable, we are creating an artifical queue that will put all requests
        // inside an array and it will only start the requests after the token is refreshed
        if (!isRefreshing) {
          isRefreshing = true
          api
            .post("/refresh", {
              refreshToken,
            })
            .then((response) => {
              const { token } = response.data

              setCookie(undefined, "nextAuthToken", token, {
                maxAge: 60 * 60 * 24 * 30, // 30 days
                path: "/",
              })
              setCookie(
                undefined,
                "nextAuthRefreshToken",
                response.data.refreshToken,
                {
                  maxAge: 60 * 60 * 24 * 30, // 30 days
                  path: "/",
                }
              )

              // setting headers again after refreshing
              api.defaults.headers.common["Authorization"] = `Bearer ${token}`

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
        return new Promise((resolve, reject) => {
          failedRequestsBecauseOfRefreshQueue.push({
            onSuccess: (token: string) => {
              originalConfig.headers!["Authorization"] = `Bearer ${token}`

              resolve(api(originalConfig))
            },
            onFailure: (error: AxiosError) => {
              reject(error)
            },
          })
        })
      } else {
        // unlog user and erase all cookies
        destroyCookie(undefined, "nextAuthToken")
        destroyCookie(undefined, "nextAuthRefreshToken")

        Router.push("/")
      }
    }

    // its importante to always finish a logic with a promise inside axios for it to continue
    return Promise.reject(error)
  }
)
