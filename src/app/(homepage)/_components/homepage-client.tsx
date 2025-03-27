import { useEffect } from "react";

import { useDepotModal } from "~/hooks/depot/use-depot-modal.wip";

import RouteLayout from "~/components/layout/route-layout";
import { DepotModal } from "~/components/settings/depot-modal";

export const HomepageClient = () => {
  const onOpen = useDepotModal((state) => state.onOpen);
  const isOpen = useDepotModal((state) => state.isOpen);

  useEffect(() => {
    if (!isOpen) {
      onOpen();
    }
  }, [isOpen, onOpen]);

  return (
    <>
      <RouteLayout>
        <DepotModal initialData={null} />
      </RouteLayout>
    </>
  );
};
