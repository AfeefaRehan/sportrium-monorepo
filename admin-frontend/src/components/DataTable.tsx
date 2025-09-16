import { useEffect, useState } from 'react'
import {
  Paper, Table, TableBody, TableCell, TableHead, TableRow,
  TableContainer, TablePagination, TextField, Box, CircularProgress
} from '@mui/material'
import { api } from '@/api/client'

interface Props {
  endpoint: string
  columns: { key: string, label: string, render?: (row:any)=>any }[]
  queryParams?: Record<string, any>
  onRowClick?: (row:any)=>void
}

function pickItemsAndTotal(res: any) {
  // try common shapes
  const items =
    res?.items ??
    res?.data?.items ??
    res?.results ??
    (Array.isArray(res) ? res : []);

  const total =
    res?.total ??
    res?.data?.total ??
    res?.count ??
    (Array.isArray(items) ? items.length : 0);

  return { items: Array.isArray(items) ? items : [], total: Number(total) || 0 };
}

export default function DataTable({ endpoint, columns, queryParams, onRowClick }: Props) {
  const [rows, setRows] = useState<any[]>([])
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(20)
  const [total, setTotal] = useState(0)
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)

  async function load(p = page, ps = pageSize, qq = q) {
    setLoading(true)
    const params: any = { page: p + 1, page_size: ps }
    if (qq) params.q = qq
    Object.assign(params, queryParams || {})

    try {
      const res = await api.get(endpoint, { params })
      const { items, total } = pickItemsAndTotal(res)
      setRows(items)
      setTotal(total)
    } finally {
      setLoading(false)
    }
  }

  // reload on page / pageSize / queryParams change
  useEffect(() => { load() }, [page, pageSize, JSON.stringify(queryParams)])

  return (
    <Paper>
      <Box sx={{ p: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
        <TextField
          size="small"
          label="Search"
          value={q}
          onChange={(e)=>setQ(e.target.value)}
          onKeyDown={(e)=>{ if (e.key === 'Enter') { setPage(0); load(0, pageSize, (e.target as HTMLInputElement).value) } }}
        />
      </Box>

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              {columns.map(c => <TableCell key={c.key}>{c.label}</TableCell>)}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={columns.length}>
                  <Box sx={{ p: 3, display:'flex', justifyContent:'center' }}>
                    <CircularProgress />
                  </Box>
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length}>
                  <Box sx={{ p: 3 }}>No data</Box>
                </TableCell>
              </TableRow>
            ) : rows.map((row:any) => (
              <TableRow
                hover
                key={row.id ?? JSON.stringify(row)}
                onClick={()=>onRowClick?.(row)}
                sx={{ cursor: onRowClick ? 'pointer' : 'default' }}
              >
                {columns.map(c =>
                  <TableCell key={c.key}>
                    {c.render ? c.render(row) : (row[c.key] ?? '')}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={total}
        page={page}
        onPageChange={(_,p)=>setPage(p)}
        rowsPerPage={pageSize}
        onRowsPerPageChange={(e)=>{ setPageSize(parseInt(e.target.value,10)); setPage(0) }}
      />
    </Paper>
  )
}
