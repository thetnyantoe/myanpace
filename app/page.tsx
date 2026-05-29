import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import HomeClient from "./homeclient";

export const dynamic = "force-dynamic";

export default async function Home() {
  let shops: any[] = [];
  let user: any = null; // 1. Declare 'user' in the outer scope

  try {
    const supabase = createClient(await cookies());

    // 2. Assign the fetched user to the outer scope variable
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    user = authUser;

    const { data, error } = await supabase
      .from("Shop")
      .select(
        `id, name, description, location, distance, is_available, brandId, categoryId, brand:Brand(name), category:Category(category_name)`,
      );

    if (!error && data) {
      shops = data;
    }
  } catch (err) {
    // Fail silently and let HomeClient load fallback Database representation
    console.error("Failed to query live shops table: ", err);
  }

  return (
    <>
      <HomeClient initialShops={shops} userId={user?.id} />
    </>
  );
}
