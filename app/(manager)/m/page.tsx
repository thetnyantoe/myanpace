import { getShopSession } from "@/backend/session";
import ManagerClient from "./ManagerClient";

export default async function Page() {
  const shopSession = await getShopSession();
  return <ManagerClient shopId={shopSession?.id ?? undefined} />;
}
