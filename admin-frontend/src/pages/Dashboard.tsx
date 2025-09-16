import { Grid, Paper, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { api } from "@/api/client";

function totalOf(res: any) {
  if (!res) return 0;
  if (typeof res.total === "number") return res.total;
  if (res.data && typeof res.data.total === "number") return res.data.total;
  if (typeof res.count === "number") return res.count;
  if (Array.isArray(res?.items)) return res.items.length;
  if (Array.isArray(res)) return res.length;
  return 0;
}

export default function Dashboard() {
  const [health, setHealth] = useState<any>(null);
  const [counts, setCounts] = useState<any>({});

  useEffect(() => {
    (async () => {
      try {
        const h = await api.get("/health");
        setHealth(h?.data || h || null);
      } catch {}
      try {
        const [users, events, teams, tournaments] = await Promise.all([
          api.get("/users", { params: { page_size: 1 } }),
          api.get("/events", { params: { page_size: 1 } }),
          api.get("/teams", { params: { page_size: 1 } }),
          api.get("/tournaments", { params: { page_size: 1 } }),
        ]);
        setCounts({
          users: totalOf(users),
          events: totalOf(events),
          teams: totalOf(teams),
          tournaments: totalOf(tournaments),
        });
      } catch {}
    })();
  }, []);

  const cards = [
    { label: "Users", value: counts.users ?? "—" },
    { label: "Events", value: counts.events ?? "—" },
    { label: "Teams", value: counts.teams ?? "—" },
    { label: "Tournaments", value: counts.tournaments ?? "—" },
  ];

  return (
    <Grid container spacing={2}>
      {cards.map((c) => (
        <Grid item xs={12} sm={6} md={3} key={c.label}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="overline">{c.label}</Typography>
            <Typography variant="h4">{c.value}</Typography>
          </Paper>
        </Grid>
      ))}
    </Grid>
  );
}
