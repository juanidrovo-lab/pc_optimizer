import { NavLink, useLocation } from "react-router-dom";
import styles from "./Sidebar.module.css";

const NAV_ITEMS = [
  { path: "/", label: "PANEL", icon: "◈" },
  { path: "/cleaner", label: "LIMPIEZA", icon: "⊘" },
  { path: "/health", label: "SALUD", icon: "◉" },
  { path: "/startup", label: "ARRANQUE", icon: "⊳" },
  { path: "/services", label: "SERVICIOS", icon: "⚙" },
  { path: "/network", label: "RED", icon: "⊞" },
  { path: "/history", label: "HISTORIAL", icon: "↺" },
];

export default function Sidebar() {
  const location = useLocation();

  return (
    <nav className={styles.sidebar}>
      <div className={styles.logo}>
        <span className={styles.logoIcon}>⬡</span>
        <span className={styles.logoText}>PCOptimizer</span>
      </div>
      <div className={styles.version}>v0.1.0</div>

      <div className={styles.nav}>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={() => {
              const isActive =
                item.path === "/"
                  ? location.pathname === "/"
                  : location.pathname.startsWith(item.path);
              return `${styles.navItem} ${isActive ? styles.active : ""}`;
            }}
          >
            <span className={styles.navIcon}>{item.icon}</span>
            <span className={styles.navLabel}>{item.label}</span>
          </NavLink>
        ))}
      </div>

      <div className={styles.footer}>
        <div className={styles.statusDot} />
        <span className={styles.statusText}>SISTEMA ACTIVO</span>
      </div>
    </nav>
  );
}
