"use client";

import { ClipLoader } from "react-spinners";

export const PageLoader = () => {
  return (
    <div className="my-auto flex h-full w-full items-center justify-center">
      <ClipLoader color="#3498db" size={50} />
    </div>
  );
};
