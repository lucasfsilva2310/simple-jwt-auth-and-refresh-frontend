import type { GetServerSideProps, NextPage } from 'next'
import { parseCookies } from 'nookies'
import { FormEvent, useContext, useState } from 'react'
import { AuthContext } from '../contexts/AuthContext'
import styles from '../styles/Home.module.css'
import { withSSRGuest } from '../utils/withSSRGuest'

const Home: NextPage = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const { signIn, isAuthenticated } = useContext(AuthContext)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()

    const data = {
      email,
      password,
    }

    await signIn(data)
  }

  return (
    <form onSubmit={handleSubmit} className={styles.container}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <button type="submit">Enviar</button>
    </form>
  )
}

export default Home

// Normally we would use just getServerSideProps to check cookies before redirecting the user
// Now we are using withSSRGuest function to let serversideprops be independent and not be duplicated code
// for this one we´re checking if the cookie exists before redirecting
export const getServerSideProps: GetServerSideProps = withSSRGuest(
  async (ctx) => {
    return {
      props: {},
    }
  }
)
