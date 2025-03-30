import { Settings } from "lucide-react";

import { Button } from "~/components/ui/button";
import { PathwaysSettingsMenu } from "~/components/settings/pathways-settings-menu";

export const PathwaySettingsButton = () => {
  return (
    <PathwaysSettingsMenu>
      <Button className="mx-0 flex gap-2 px-0" variant={"link"}>
        <Settings />
        Settings
      </Button>
    </PathwaysSettingsMenu>
  );
};
