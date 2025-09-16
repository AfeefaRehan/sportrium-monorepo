
import DataTable from '@/components/DataTable'
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Switch, FormControlLabel, Stack } from '@mui/material'
import { useState } from 'react'
import { api } from '@/api/client'

export default function Users() {
  const [open, setOpen] = useState(false)
  const [row, setRow] = useState<any>(null)
  function onRowClick(r:any){ setRow(r); setOpen(true) }
  async function save(){
    await api.patch(`/users/${row.id}`, { name: row.name, is_admin: row.is_admin, is_active: row.is_active })
    setOpen(false)
  }
  return (<>
    <DataTable endpoint="/users" onRowClick={onRowClick} columns={[
      { key:'id', label:'ID' },
      { key:'email', label:'Email' },
      { key:'name', label:'Name' },
      { key:'is_admin', label:'Admin' },
      { key:'is_active', label:'Active' },
      { key:'created_at', label:'Created' },
    ]} />
    <Dialog open={open} onClose={()=>setOpen(false)} maxWidth="sm" fullWidth>
      <DialogTitle>Edit User</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt:1 }}>
          <TextField label="Name" value={row?.name || ''} onChange={(e)=>setRow({...row, name:e.target.value})} />
          <FormControlLabel control={<Switch checked={!!row?.is_admin} onChange={(e)=>setRow({...row, is_admin:e.target.checked})} />} label="Admin" />
          <FormControlLabel control={<Switch checked={!!row?.is_active} onChange={(e)=>setRow({...row, is_active:e.target.checked})} />} label="Active" />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={()=>setOpen(false)}>Cancel</Button>
        <Button variant="contained" onClick={save}>Save</Button>
      </DialogActions>
    </Dialog>
  </>)
}
