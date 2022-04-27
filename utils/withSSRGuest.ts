import { GetServerSideProps, GetServerSidePropsContext } from "next"
import { parseCookies } from "nookies"

export function withSSRGuest(fn: GetServerSideProps) {
  // High order function, a function calling another one to be more exact
  return async (ctx: GetServerSidePropsContext) => {
    const cookies = parseCookies(ctx)

    if (cookies["nextAuthToken"]) {
      return {
        redirect: {
          destination: "/dashboard",
          permanent: false,
        },
      }
    }
    // else
    return await fn(ctx)
  }
}
