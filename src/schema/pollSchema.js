import Joi from "joi";

const pollSchema = Joi.object({
  title: Joi.string()
    .min(5)
    .message("Title must be at least 5 characters")
    .required(),
  question: Joi.string()
    .min(10)
    .message("Question must be at least 10 characters")
    .required(),
  options: Joi.array()
    .items(Joi.string().min(1).message("Option cannot be empty"))
    .min(2)
    .message("At least 2 options required")
    .required(),
  expiredAt: Joi.date()
    .greater("now") // Ensures the date is in the future
    .message("Expiration date must be in the future")
    .required(),
});

export default pollSchema;
