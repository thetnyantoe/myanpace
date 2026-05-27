import Link from "next/link";

export default function Admin() {
  return (
    <div>
      admin dashboard{" "}
      <Link href="a/addowner" className="underline jost text-xl">
        add-owner
      </Link>
      <Link href="a/addowner" className="underline text-xl">
        add-owner
      </Link>
    </div>
  );
}
