import { z } from "zod";
const pollSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  question: z.string().min(10, "Question must be at least 10 characters"),
  options: z
    .array(z.string().min(1, "Option cannot be empty"))
    .min(2, "At least 2 options required"),
  expiredAt: z.preprocess(
    (arg) => new Date(arg),
    z.date().min(new Date(), "Expiration date must be in the future")
  ),
});

export default pollSchema;