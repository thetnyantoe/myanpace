import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import HomeClient from "./homeclient";

export const dynamic = "force-dynamic";

export default async function Home() {
  let shops: any[] = [];
  let user: any = null;

  try {
    const supabase = createClient(await cookies());

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
    console.error("Failed to query live shops table: ", err);
  }

  const uniqueCategories = Array.from(
    new Set(
      shops
        .map((shop) => shop.category?.category_name)
        .filter((catName): catName is string => !!catName),
    ),
  );
  return (
    <>
      <HomeClient
        initialShops={shops}
        userId={user?.id}
        categories={uniqueCategories}
      />
    </>
  );
}
