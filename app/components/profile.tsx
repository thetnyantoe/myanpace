import Link from "next/link";
import { logout } from "../../backend/actions";
import { getProfile } from "@/backend/session";

export async function ProfileBar() {
  const profile = await getProfile();

  if (!profile) {
    return (
      <header
        style={{
          padding: "0.75rem 1.5rem",
          borderBottom: "1px solid #ddd",
          fontSize: "0.9rem",
        }}
      >
        Not logged in · <Link href="/login">Login</Link>
      </header>
    );
  }

  return (
    <header
      style={{
        padding: "0.75rem 1.5rem",
        borderBottom: "1px solid #ddd",
        fontSize: "0.9rem",
        display: "flex",
        flexWrap: "wrap",
        gap: "0.5rem 1rem",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem 1rem" }}>
        <span>
          <strong>{profile.name}</strong>
        </span>
        {profile.email && <span>{profile.email}</span>}
        <span>{profile.role}</span>
        {profile.brand && <span>Brand: {profile.brand}</span>}
      </div>
      <form action={logout}>
        <button type="submit" style={{ cursor: "pointer", fontSize: "0.9rem" }}>
          Logout
        </button>
      </form>
    </header>
  );
}
