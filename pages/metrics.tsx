import { useContext, useEffect } from 'react'
import { CanSeeComponent } from '../components/CanSeeComponent'
import { AuthContext } from '../contexts/AuthContext'
import { useCanOrCant } from '../hooks/useCanOrCant'
import { setupAPIClient } from '../services/api'
import { api } from '../services/apiClient'
import { withSSRAuth } from '../utils/withSSRAuth'
import decode from 'jwt-decode'

export default function Metrics() {
  return (
    <>
      <div>Métricas</div>
    </>
  )
}

//we´re checking if the cookie DOES NOT exist before redirecting
export const getServerSideProps = withSSRAuth(
  async (ctx: any) => {
    const apiClient = setupAPIClient(ctx)
    const response = await apiClient.get('/me')

    //   const user = decode()

    return {
      props: {},
    }
  },
  {
    permissions: ['metrics.list'],
    roles: ['administrator'],
  }
)
