import type { Client } from "~/types/job";

type Props = {
  id: string | null;
  customers: Client[];
};
export const findCustomerById = ({ id, customers }: Props) => {
  if (!id) return null;
  return customers?.find((customer) => customer?.id === id) ?? null;
};
