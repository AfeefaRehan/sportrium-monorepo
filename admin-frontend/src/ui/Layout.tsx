import React from 'react'
import { AppBar, Toolbar, Typography, Button, Container, Stack } from '@mui/material'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'

export default function Layout() {
  const loc = useLocation()
  const nav = useNavigate()
  function logout() {
    localStorage.removeItem('access_token')
    nav('/login', { replace: true })
  }
  const tabs = [
    { to: '/users', label: 'Users' },
    { to: '/events', label: 'Events' },
    { to: '/teams', label: 'Teams' },
    { to: '/tournaments', label: 'Tournaments' },
  ]
  return (
    <>
      <AppBar position="static" elevation={0}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>Sportrium Admin</Typography>
          <Stack direction="row" spacing={2}>
            {tabs.map(t => (
              <Button key={t.to} component={Link} to={t.to}
                color={loc.pathname.startsWith(t.to) ? 'secondary' : 'inherit'}>
                {t.label}
              </Button>
            ))}
            <Button onClick={logout} color="inherit">Logout</Button>
          </Stack>
        </Toolbar>
      </AppBar>
      <Container sx={{ py: 3 }}>
        <Outlet />
      </Container>
    </>
  )
}
