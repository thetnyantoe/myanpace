import Link from "next/link";

export default function Admin() {
  return (
    <div>
      admin dashboard{" "}
      <Link href="a/add-owner" className="underline">
        add-owner
      </Link>
    </div>
  );
}
