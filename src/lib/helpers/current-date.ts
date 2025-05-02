import { format } from "date-fns";

export const nthNumber = (number: number): string => {
  if (number > 3 && number < 21) return "th";
  switch (number % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
};

export const isDateToday = (date: Date) =>
  format(date, "MMMM dd yyyy") === format(new Date(), "MMMM dd yyyy");

export const formatNthDate = (date: Date) => {
  return `${format(date, "MMMM d")}${nthNumber(Number(format(date, "d")))}`;
};
