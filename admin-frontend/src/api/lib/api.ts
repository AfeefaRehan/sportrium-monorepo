import React, { useEffect, useState } from 'react'
import { api } from '../lib/api'
import SimpleTable from '../ui/Table'

export default function Events() {
  const [rows, setRows] = useState<any[]>([])
  async function load() {
    const { data } = await api.get('/events')
    setRows(data.items || [])
  }
  useEffect(() => { load() }, [])
  return <SimpleTable columns={['id', 'title', 'sport', 'status', 'city', 'starts_at']} rows={rows} />
}
