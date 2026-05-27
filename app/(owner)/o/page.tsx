import Link from "next/link";

export default function Owner() {
  return (
    <div>
      owner
      <Link href="o/addshop" className="underline">
        Add-shop
      </Link>
    </div>
  );
}
