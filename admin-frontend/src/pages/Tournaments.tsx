
import DataTable from '@/components/DataTable'
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, MenuItem, Stack } from '@mui/material'
import { useState } from 'react'
import { api } from '@/api/client'

const statuses = ['planning','published','completed']

export default function Tournaments() {
  const [open, setOpen] = useState(false)
  const [row, setRow] = useState<any>(null)
  const [createOpen, setCreateOpen] = useState(false)
  function onRowClick(r:any){ setRow(r); setOpen(true) }

  async function save(){
    await api.patch(`/tournaments/${row.id}`, { name: row.name, city: row.city, sport: row.sport, status: row.status, start_date: row.start_date, end_date: row.end_date })
    setOpen(false)
  }

  async function create(e:any){
    e.preventDefault()
    const body = Object.fromEntries(new FormData(e.currentTarget).entries())
    await api.post(`/tournaments`, body)
    setCreateOpen(false)
  }

  return (<>
    <Button variant="contained" sx={{ mb:2 }} onClick={()=>setCreateOpen(true)}>New Tournament</Button>
    <DataTable endpoint="/tournaments" onRowClick={onRowClick} columns={[
      { key:'id', label:'ID' },
      { key:'name', label:'Name' },
      { key:'sport', label:'Sport' },
      { key:'city', label:'City' },
      { key:'start_date', label:'Start' },
      { key:'end_date', label:'End' },
      { key:'status', label:'Status' },
    ]} />
    <Dialog open={open} onClose={()=>setOpen(false)} maxWidth="sm" fullWidth>
      <DialogTitle>Edit Tournament</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt:1 }}>
          <TextField label="Name" value={row?.name || ''} onChange={(e)=>setRow({...row, name:e.target.value})} />
          <TextField label="Sport" value={row?.sport || ''} onChange={(e)=>setRow({...row, sport:e.target.value})} />
          <TextField label="City" value={row?.city || ''} onChange={(e)=>setRow({...row, city:e.target.value})} />
          <TextField label="Start Date" value={row?.start_date || ''} onChange={(e)=>setRow({...row, start_date:e.target.value})} placeholder="YYYY-MM-DD" />
          <TextField label="End Date" value={row?.end_date || ''} onChange={(e)=>setRow({...row, end_date:e.target.value})} placeholder="YYYY-MM-DD" />
          <TextField select label="Status" value={row?.status || 'planning'} onChange={(e)=>setRow({...row, status:e.target.value})}>
            {statuses.map(s=><MenuItem key={s} value={s}>{s}</MenuItem>)}
          </TextField>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={()=>setOpen(false)}>Close</Button>
        <Button variant="contained" onClick={save}>Save</Button>
      </DialogActions>
    </Dialog>

    <Dialog open={createOpen} onClose={()=>setCreateOpen(false)} maxWidth="sm" fullWidth component="form" onSubmit={create}>
      <DialogTitle>New Tournament</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt:1 }}>
          <TextField name="name" label="Name" required />
          <TextField name="sport" label="Sport" />
          <TextField name="city" label="City" />
          <TextField name="start_date" label="Start Date" placeholder="YYYY-MM-DD" />
          <TextField name="end_date" label="End Date" placeholder="YYYY-MM-DD" />
          <TextField name="status" select label="Status" defaultValue="planning">
            {statuses.map(s=><MenuItem key={s} value={s}>{s}</MenuItem>)}
          </TextField>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={()=>setCreateOpen(false)}>Cancel</Button>
        <Button variant="contained" type="submit">Create</Button>
      </DialogActions>
    </Dialog>
  </>)
}
