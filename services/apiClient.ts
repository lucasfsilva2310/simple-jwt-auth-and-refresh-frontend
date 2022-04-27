import { setupAPIClient } from "./api"

// by using thins setupAPIClient function and adding an optional argument
//  we can use the same function client side ( without arguments ) and server side ( with arguments )
export const api = setupAPIClient()
