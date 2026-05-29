import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import ShopBrowser from "../../components/ShopBrowser";

export default async function Shops() {
  const supabase = createClient(await cookies());

  // 1. Fetch the logged-in user's information
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("Shop")
    .select(
      `id, name, description, location, distance, is_available, brandId, categoryId, brand:Brand(name), category:Category(category_name)`,
    );

  if (error) {
    return (
      <div>
        <h1>Shops</h1>
        <p style={{ color: "crimson" }}>Error loading shops: {error.message}</p>
      </div>
    );
  }

  const shops = (data ?? []) as Array<any>;

  return <ShopBrowser initialShops={shops} userId={user?.id} />;
}
