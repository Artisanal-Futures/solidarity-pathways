// import { api } from "~/trpc/react";
// import { toastService } from "@dreamwalker-studios/toasts";

// export const useCreateRoadPoint = () => {
//   const createRoadPointByLatLng = api.roadPoints.createByLatLng.useMutation({
//     onSuccess: () => {
//       toastService.success({
//         message: "Road point successfully added.",
//       });
//     },
//     onError: (error) => {
//       toastService.error({
//         message: "There was an issue adding the road point. Please try again.",
//         error,
//       });
//     },
//   });

//   return {
//     addRoadPointByLatLng: ({ lat, lng }) => {
//       createRoadPointByLatLng.mutate({ lat, lng });
//     },
//   };
// };
