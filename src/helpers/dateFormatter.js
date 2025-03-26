import { format, parseISO } from "date-fns";

export const getFormattedDate = (isoDate) => {
  return format(parseISO(isoDate), "d MMM yyyy");
};
