import React from 'react'
import { Paper, Table, TableHead, TableRow, TableCell, TableBody } from '@mui/material'

export default function SimpleTable({ columns, rows }:{columns:string[], rows:any[]}) {
  return (
    <Paper>
      <Table>
        <TableHead><TableRow>{columns.map(c => <TableCell key={c}>{c}</TableCell>)}</TableRow></TableHead>
        <TableBody>
          {rows.map((r, i) => (
            <TableRow key={i}>
              {columns.map(c => <TableCell key={c}>{String(r[c] ?? '')}</TableCell>)}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Paper>
  )
}
