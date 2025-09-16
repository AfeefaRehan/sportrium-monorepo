import { NavLink, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import { useNotifications } from "../../context/NotificationsContext.jsx";

 export default function HeaderActions({ base = "/" }) {
   const { user, logout } = useAuth();

   return (
     <div className="header-actions">
        {user ? (
          <>
            <NotificationsButton base={base} />
            <ProfileMenu base={base} onLogout={logout} user={user} />
          </>
        ) : (
          <>
            <NavLink to="/signup" className="btn red">Sign up</NavLink>
            <NavLink to="/login" className="btn blue">Log in</NavLink>
          </>
        )}
      </div>
    );
  }

function NotificationsButton({ base }) {
  const { unread, items, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onClick = (e) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return (
    <div className="menu-wrap" ref={ref}>
      <button
        className="icon-btn"
        aria-label="Notifications"
        onClick={() => setOpen((v) => !v)}
      >
        <img src={`${base}icons/bell.svg`} alt="" width="20" height="20" />
        {unread > 0 && <span className="badge">{unread}</span>}
      </button>

      {open && (
       <div className="menu menu--notifications" role="menu" aria-label="Notifications">
           <div className="menu-header">Notifications</div>
           <div className="menu-list">
             {items.map((n) => (
               <div className="menu-item" key={n.id}>
                 {n.text}
               </div>
             ))}
           </div>
           <button className="menu-action" onClick={markAllRead}>
             Mark all read
           </button>
         </div>
       )}
    </div>
  );
}

function ProfileMenu({ base, onLogout, user }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();
  const initials = (user?.name || user?.email || "?")
    .split(" ")
    .map((s) => s[0]?.toUpperCase())
    .slice(0, 2)
    .join("");

  useEffect(() => {
    const onClick = (e) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  const go = (to) => {
    setOpen(false);
    navigate(to);
  };

  return (
    <div className="menu-wrap" ref={ref}>
      <button
        className="avatar"
        aria-label="Open profile menu"
        onClick={() => setOpen((v) => !v)}
        title={user?.email}
      >
        {initials || (
          <img src={`${base}icons/user.svg`} alt="" width="20" height="20" />
        )}
      </button>

 {open && (
     <div className="menu menu--profile" role="menu" aria-label="Profile menu">
           <button className="menu-item" onClick={() => go("/profile")}>
             Profile
           </button>
           <button
             className="menu-item"
             onClick={() => go("/onboarding/preferences")}
           >
             Preferences
           </button>
           <hr className="menu-sep" />
           <button
             className="menu-item danger"
             onClick={() => {
               onLogout();
               setOpen(false);
               navigate("/");
             }}
           >
             Log out
           </button>
         </div>
       )}
    </div>
  );
}
