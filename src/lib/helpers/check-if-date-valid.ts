export const checkIfDateIsValid = (date: Date, secondDate: Date) => {
  return (
    date > new Date() ||
    date < new Date(`${new Date().getFullYear()}-01-01`) ||
    date.getDate() === secondDate.getDate()
  );
};
