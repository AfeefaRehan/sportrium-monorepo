
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { AppBar, Box, Toolbar, Typography, IconButton, Drawer, List, ListItemButton, ListItemIcon, ListItemText, CssBaseline, Button } from '@mui/material'
import DashboardIcon from '@mui/icons-material/Dashboard'
import PeopleIcon from '@mui/icons-material/People'
import EventIcon from '@mui/icons-material/Event'
import GroupsIcon from '@mui/icons-material/Groups'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import AlarmIcon from '@mui/icons-material/Alarm'
import NotificationsIcon from '@mui/icons-material/Notifications'
import ArticleIcon from '@mui/icons-material/Article'
import LoginIcon from '@mui/icons-material/Login'
import { logout } from '@/api/session'

const drawerWidth = 220

const links = [
  { to: '/', text: 'Dashboard', icon: <DashboardIcon /> },
  { to: '/users', text: 'Users', icon: <PeopleIcon /> },
  { to: '/events', text: 'Events', icon: <EventIcon /> },
  { to: '/teams', text: 'Teams', icon: <GroupsIcon /> },
  { to: '/tournaments', text: 'Tournaments', icon: <EmojiEventsIcon /> },
  { to: '/reminders', text: 'Reminders', icon: <AlarmIcon /> },
  { to: '/notifications', text: 'Notifications', icon: <NotificationsIcon /> },
  { to: '/audit-logs', text: 'Audit Logs', icon: <ArticleIcon /> },
  { to: '/login-events', text: 'Login Events', icon: <LoginIcon /> },
]

export default function Layout() {
  const loc = useLocation()
  const nav = useNavigate()
  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>Sportrium Admin</Typography>
          <Button color="inherit" onClick={() => { logout(); nav('/login') }}>Logout</Button>
        </Toolbar>
      </AppBar>
      <Drawer variant="permanent" sx={{ width: drawerWidth, [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box' } }}>
        <Toolbar />
        <List>
          {links.map((l) => (
            <ListItemButton key={l.to} component={Link} to={l.to} selected={loc.pathname === l.to || (l.to !== '/' && loc.pathname.startsWith(l.to))}>
              <ListItemIcon>{l.icon}</ListItemIcon>
              <ListItemText primary={l.text} />
            </ListItemButton>
          ))}
        </List>
      </Drawer>
      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  )
}
