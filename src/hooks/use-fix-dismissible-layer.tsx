import { useEffect } from "react";

export const useFixDismissibleLayer = () => {
  useEffect(() => {
    setTimeout(() => {
      document.body.style.pointerEvents = "";
    }, 500);
  }, []);
};
