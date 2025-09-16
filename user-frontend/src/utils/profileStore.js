// src/utils/profileStore.js
import { api } from "@/lib/api";

// LocalStorage keys
const LS_PROFILE   = "profile";
const LS_FOLLOWING = "following_team_ids";
const LS_MY_TEAMS  = "my_teams";
const LS_HOSTED    = "hosted_events";

// ----------------- helpers -----------------
const read  = (k, fb) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch { return fb; } };
const write = (k, v)  => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} return v; };

// Be tolerant of either backend route shape
async function getMe() {
  try { return await api.get("/auth/me"); } catch { return await api.get("/me"); }
}
async function patchMe(payload) {
  try { return await api.patch("/me", payload); } catch { return await api.patch("/auth/me", payload); }
}

// ----------------- profile -----------------
export async function getProfile() {
  try {
    const me = await getMe(); // {display_name, email, city, bio, avatar_url, sports}
    const profile = {
      displayName: me.display_name || "",
      email:       me.email || "",
      city:        me.city || "",
      bio:         me.bio || "",
      sports:      Array.isArray(me.sports) ? me.sports : [],
      avatar:      me.avatar_url || "",
    };
    return write(LS_PROFILE, profile);
  } catch {
    // fallback to cached
    return read(LS_PROFILE, {});
  }
}

export async function saveProfile(profile) {
  const payload = {
    display_name: profile.displayName,
    email:        profile.email,
    city:         profile.city,
    bio:          profile.bio,
    avatar_url:   profile.avatar,
    sports:       profile.sports || [],
  };
  try {
    const saved = await patchMe(payload);
    const normalized = {
      displayName: saved.display_name || "",
      email:       saved.email || "",
      city:        saved.city || "",
      bio:         saved.bio || "",
      sports:      Array.isArray(saved.sports) ? saved.sports : [],
      avatar:      saved.avatar_url || "",
    };
    return write(LS_PROFILE, normalized);
  } catch {
    // offline fallback
    return write(LS_PROFILE, profile);
  }
}

// ----------------- following -----------------
export function getFollowingTeamIds(){ return read(LS_FOLLOWING, []); }
export function setFollowingTeamIds(arr){ return write(LS_FOLLOWING, Array.isArray(arr) ? arr : []); }

// ----------------- my teams -----------------
export function getMyTeams(){ return read(LS_MY_TEAMS, []); }
export function setMyTeams(arr){ return write(LS_MY_TEAMS, Array.isArray(arr) ? arr : []); }

// Optionally refresh from API in the background if available
async function refreshMyTeams(){
  try {
    const list = await api.get("/teams/mine"); // JWT required; if not implemented yet this just no-ops
    write(LS_MY_TEAMS, Array.isArray(list) ? list : []);
  } catch {}
}

// -------- hosted events (cached + refresh) --------
export function getHostedEvents() {
  const cached = read(LS_HOSTED, []);
  refreshHostedEvents(); // background refresh
  return cached;
}
export function setHostedEvents(list) {
  return write(LS_HOSTED, Array.isArray(list) ? list : []);
}
async function refreshHostedEvents(){
  try {
    const list = await api.get("/events/hosted");
    write(LS_HOSTED, Array.isArray(list) ? list : []);
  } catch {}
}
