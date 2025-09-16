
import DataTable from '@/components/DataTable'

export default function LoginEvents() {
  return (
    <DataTable endpoint="/login-events" columns={[
      { key:'id', label:'ID' },
      { key:'email', label:'Email' },
      { key:'ip', label:'IP' },
      { key:'user_agent', label:'User-Agent' },
      { key:'success', label:'Success' },
      { key:'ts', label:'At' },
    ]} />
  )
}
