"use client";

import { useActionState } from "react";
import { addOwner, type ActionResult } from "@/backend/actions";

const initial: ActionResult | null = null;

export function AddOwnerForm() {
  const [state, formAction, pending] = useActionState(
    async (_prev: ActionResult | null, formData: FormData) =>
      addOwner(formData),
    initial,
  );

  return (
    <form action={formAction} style={{ display: "grid", gap: "0.75rem" }}>
      <label>
        Name
        <input name="name" required style={fieldStyle} />
      </label>
      <label>
        Email
        <input name="email" type="email" required style={fieldStyle} />
      </label>
      <label>
        Password
        <input name="password" type="password" required style={fieldStyle} />
      </label>
      <label>
        Brand name
        <input name="brandName" required style={fieldStyle} />
      </label>
      <button type="submit" disabled={pending} style={buttonStyle}>
        {pending ? "Saving…" : "Create owner & brand"}
      </button>
      {state && (
        <p
          style={{
            fontSize: "0.9rem",
            color: state.ok ? "green" : "crimson",
          }}
        >
          {state.ok ? state.message : state.error}
        </p>
      )}
    </form>
  );
}

const fieldStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  marginTop: 4,
  padding: "6px 8px",
  border: "1px solid #ccc",
  borderRadius: 4,
};

const buttonStyle: React.CSSProperties = {
  padding: "8px 12px",
  marginTop: 4,
  cursor: "pointer",
};
