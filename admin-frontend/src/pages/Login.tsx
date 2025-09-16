import { useState } from "react";
import { Container, Paper, TextField, Button, Typography, Alert, Box } from "@mui/material";
import { useNavigate, useLocation } from "react-router-dom";
import { api } from "@/api/client";
import { setTokens } from "@/api/session";

export default function Login() {
  const nav = useNavigate();
  const loc = useLocation() as any;
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("Admin123!");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: any) {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      const data = await api.post("/auth/login", { email, password }, false); // no token yet
      const token = (data?.data?.access_token) ?? data?.access_token ?? data?.token;
      if (!token) throw new Error("No token in response");
      setTokens(token);
      nav(loc.state?.from?.pathname || "/");
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Container maxWidth="xs" sx={{ display: "flex", alignItems: "center", minHeight: "100vh" }}>
      <Paper sx={{ p: 4, width: "100%" }} component="form" onSubmit={submit}>
        <Typography variant="h5" gutterBottom>Admin Login</Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <TextField label="Email" type="email" fullWidth margin="normal" value={email} onChange={e => setEmail(e.target.value)} />
        <TextField label="Password" type="password" fullWidth margin="normal" value={password} onChange={e => setPassword(e.target.value)} />
        <Box sx={{ mt: 2, display: "flex", gap: 2 }}>
          <Button type="submit" variant="contained" disabled={loading}>Login</Button>
        </Box>
      </Paper>
    </Container>
  );
}
