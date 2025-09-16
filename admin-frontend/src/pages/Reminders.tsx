
import DataTable from '@/components/DataTable'
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Stack } from '@mui/material'
import { useState } from 'react'
import { api } from '@/api/client'

export default function Reminders() {
  const [open, setOpen] = useState(false)
  const [row, setRow] = useState<any>(null)
  function onRowClick(r:any){ setRow(r); setOpen(true) }
  async function save(){ await api.patch(`/reminders/${row.id}`, { text: row.text, status: row.status }); setOpen(false) }
  async function requeue(){ await api.post(`/reminders/${row.id}/requeue`); setOpen(false) }
  return (<>
    <DataTable endpoint="/reminders" onRowClick={onRowClick} columns={[
      { key:'id', label:'ID' },
      { key:'user_id', label:'User' },
      { key:'text', label:'Text' },
      { key:'due_at', label:'Due' },
      { key:'sent_at', label:'Sent' },
      { key:'status', label:'Status' },
    ]} />
    <Dialog open={open} onClose={()=>setOpen(false)} maxWidth="sm" fullWidth>
      <DialogTitle>Edit Reminder</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt:1 }}>
          <TextField label="Text" value={row?.text || ''} onChange={(e)=>setRow({...row, text:e.target.value})} />
          <TextField label="Status" value={row?.status || ''} onChange={(e)=>setRow({...row, status:e.target.value})} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={()=>setOpen(false)}>Close</Button>
        <Button onClick={requeue}>Requeue</Button>
        <Button variant="contained" onClick={save}>Save</Button>
      </DialogActions>
    </Dialog>
  </>)
}
