
import DataTable from '@/components/DataTable'
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Stack } from '@mui/material'
import { useState } from 'react'
import { api } from '@/api/client'

export default function Teams() {
  const [open, setOpen] = useState(false)
  const [row, setRow] = useState<any>(null)
  function onRowClick(r:any){ setRow(r); setOpen(true) }
  async function save(){ await api.patch(`/teams/${row.id}`, { name: row.name, city: row.city, sport: row.sport }); setOpen(false) }
  async function verify(){ await api.post(`/teams/${row.id}/verify`); setOpen(false) }
  return (<>
    <DataTable endpoint="/teams" onRowClick={onRowClick} columns={[
      { key:'id', label:'ID' },
      { key:'name', label:'Name' },
      { key:'sport', label:'Sport' },
      { key:'city', label:'City' },
      { key:'owner_id', label:'Owner' },
      { key:'verified_at', label:'Verified' },
    ]} />
    <Dialog open={open} onClose={()=>setOpen(false)} maxWidth="sm" fullWidth>
      <DialogTitle>Edit Team</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt:1 }}>
          <TextField label="Name" value={row?.name || ''} onChange={(e)=>setRow({...row, name:e.target.value})} />
          <TextField label="Sport" value={row?.sport || ''} onChange={(e)=>setRow({...row, sport:e.target.value})} />
          <TextField label="City" value={row?.city || ''} onChange={(e)=>setRow({...row, city:e.target.value})} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={()=>setOpen(false)}>Close</Button>
        <Button onClick={verify}>Verify</Button>
        <Button variant="contained" onClick={save}>Save</Button>
      </DialogActions>
    </Dialog>
  </>)
}
