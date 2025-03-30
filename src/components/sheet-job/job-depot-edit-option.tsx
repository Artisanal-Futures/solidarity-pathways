import type { ClientJobBundle } from "~/types.wip";
import { useClientJobBundles } from "~/hooks/jobs/use-client-job-bundles";

type Props = { row: ClientJobBundle };
export const JobDepotEditOption = ({ row }: Props) => {
  const jobs = useClientJobBundles();

  const editPost = (id: string) => jobs.edit(id);

  return <p onClick={() => editPost(row.job.id)}>Edit</p>;
};
