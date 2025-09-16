
import DataTable from '@/components/DataTable'

export default function AuditLogs() {
  return (
    <DataTable endpoint="/audit-logs" columns={[
      { key:'id', label:'ID' },
      { key:'actor_id', label:'Actor' },
      { key:'action', label:'Action' },
      { key:'resource_type', label:'Type' },
      { key:'resource_id', label:'Resource' },
      { key:'ts', label:'At' },
    ]} />
  )
}
