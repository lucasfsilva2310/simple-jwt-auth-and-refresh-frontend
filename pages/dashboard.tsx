import { useContext, useEffect } from 'react'
import { CanSeeComponent } from '../components/CanSeeComponent'
import { AuthContext } from '../contexts/AuthContext'
import { useCanOrCant } from '../hooks/useCanOrCant'
import { setupAPIClient } from '../services/api'
import { api } from '../services/apiClient'
import { withSSRAuth } from '../utils/withSSRAuth'

export default function Dashboard() {
  const { user } = useContext(AuthContext)

  const userCanSeeMetrics = useCanOrCant({
    permissions: ['metrics.list'],
  })

  useEffect(() => {
    api
      .get('/me')
      .then((response) => console.log(response))
      .catch((error) => console.log(error))
  }, [])

  return (
    <>
      <h1>Dashboard: User {user?.email}</h1>
      <CanSeeComponent permissions={['metrics.list']}>
        <div>Métricas</div>
      </CanSeeComponent>
    </>
  )
}

//we´re checking if the cookie DOES NOT exist before redirecting
export const getServerSideProps = withSSRAuth(async (ctx: any) => {
  const apiClient = setupAPIClient(ctx)
  const response = await apiClient.get('/me')

  return {
    props: {},
  }
})
