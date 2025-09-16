import DataTable from "@/components/DataTable";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, MenuItem, Stack
} from "@mui/material";
import { useState } from "react";
import { api } from "@/api/client";

const statuses = ["draft","pending","approved","rejected","archived"] as const;

type Row = {
  id: number | string;
  title?: string;
  sport?: string;
  city?: string;
  status?: string;
  starts_at?: string;
};

export default function Events() {
  const [open, setOpen] = useState(false);
  const [row, setRow] = useState<Row | null>(null);
  const [busy, setBusy] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  function onRowClick(r: any) { setRow(r as Row); setOpen(true); }
  function close() { if (busy) return; setOpen(false); setTimeout(()=>setRow(null), 150); }
  function refresh() { setRefreshKey(k => k + 1); }

  async function save() {
    if (!row?.id) return;
    setBusy(true);
    try {
      await api.patch(`/events/${row.id}`, {
        title: row.title, city: row.city, sport: row.sport, status: row.status
      });
      close(); refresh();
    } catch (e: any) { alert(e?.message || "Failed to save"); }
    finally { setBusy(false); }
  }

  async function approve() {
    if (!row?.id) return;
    setBusy(true);
    try { await api.post(`/events/${row.id}/approve`, {}); close(); refresh(); }
    catch (e: any) { alert(e?.message || "Failed to approve"); }
    finally { setBusy(false); }
  }

  async function reject() {
    if (!row?.id) return;
    setBusy(true);
    try { await api.post(`/events/${row.id}/reject`, {}); close(); refresh(); }
    catch (e: any) { alert(e?.message || "Failed to reject"); }
    finally { setBusy(false); }
  }

  return (
    <>
      <DataTable
        key={refreshKey}
        endpoint="/events"
        onRowClick={onRowClick}
        columns={[
          { key: "id", label: "ID" },
          { key: "title", label: "Title" },
          { key: "sport", label: "Sport" },
          { key: "city", label: "City" },
          { key: "starts_at", label: "Starts" },
          { key: "status", label: "Status" },
        ]}
      />

      <Dialog open={open} onClose={close} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Event</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Title"
              value={row?.title ?? ""}
              onChange={(e) => setRow(r => ({ ...(r as Row), title: e.target.value }))}
            />
            <TextField
              label="Sport"
              value={row?.sport ?? ""}
              onChange={(e) => setRow(r => ({ ...(r as Row), sport: e.target.value }))}
            />
            <TextField
              label="City"
              value={row?.city ?? ""}
              onChange={(e) => setRow(r => ({ ...(r as Row), city: e.target.value }))}
            />
            <TextField
              select
              label="Status"
              value={row?.status ?? "draft"}
              onChange={(e) => setRow(r => ({ ...(r as Row), status: e.target.value }))}
            >
              {statuses.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={close} disabled={busy}>Close</Button>
          <Button onClick={reject} color="error" disabled={busy || !row?.id}>Reject</Button>
          <Button onClick={approve} color="success" disabled={busy || !row?.id}>Approve</Button>
          <Button variant="contained" onClick={save} disabled={busy || !row?.id}>Save</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
