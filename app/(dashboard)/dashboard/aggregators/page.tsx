import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import AggregatorsClient from "./aggregators-client";

export default async function AggregatorsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return <AggregatorsClient />;
}
