
import DataTable from '@/components/DataTable'
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Stack } from '@mui/material'
import { useState } from 'react'
import { api } from '@/api/client'

export default function Notifications() {
  const [open, setOpen] = useState(false)
  const [row, setRow] = useState<any>(null)
  function onRowClick(r:any){ setRow(r); setOpen(true) }
  async function save(){ await api.patch(`/notifications/${row.id}`, row); setOpen(false) }
  async function resend(){ await api.post(`/notifications/${row.id}/resend`); setOpen(false) }
  return (<>
    <DataTable endpoint="/notifications" onRowClick={onRowClick} columns={[
      { key:'id', label:'ID' },
      { key:'user_id', label:'User' },
      { key:'title', label:'Title' },
      { key:'body', label:'Body' },
      { key:'sent_at', label:'Sent' },
      { key:'status', label:'Status' },
    ]} />
    <Dialog open={open} onClose={()=>setOpen(false)} maxWidth="sm" fullWidth>
      <DialogTitle>Edit Notification</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt:1 }}>
          <TextField label="Title" value={row?.title || ''} onChange={(e)=>setRow({...row, title:e.target.value})} />
          <TextField label="Body" value={row?.body || ''} multiline minRows={3} onChange={(e)=>setRow({...row, body:e.target.value})} />
          <TextField label="Status" value={row?.status || ''} onChange={(e)=>setRow({...row, status:e.target.value})} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={()=>setOpen(false)}>Close</Button>
        <Button onClick={resend}>Resend</Button>
        <Button variant="contained" onClick={save}>Save</Button>
      </DialogActions>
    </Dialog>
  </>)
}
