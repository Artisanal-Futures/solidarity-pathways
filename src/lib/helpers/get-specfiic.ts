import { ClientJobBundle } from "~/lib/validators/client-job";

type CheckIfJobExistsInRouteProps = {
  id: string | null;
  routeJobs: ClientJobBundle[];
};

export const checkIfJobExistsInRoute = ({
  id,
  routeJobs,
}: CheckIfJobExistsInRouteProps): ClientJobBundle | null => {
  if (!id) return null;
  return routeJobs?.find((bundle) => bundle.job.id === id) ?? null;
};

type ClientProps = {
  id: string | null;
  clientBundles: ClientJobBundle[];
};

export const checkIfClientExistsInRoute = ({
  id,
  clientBundles,
}: ClientProps): ClientJobBundle | null => {
  if (!id) return null;
  return clientBundles?.find((bundle) => bundle.client?.id === id) ?? null;
};
