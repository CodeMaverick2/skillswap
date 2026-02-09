const { errorResponse } = require('../utils/apiResponse');

/**
 * Returns an Express middleware that validates req.body against the given Joi schema.
 * On failure, responds with 400 and a list of validation error messages.
 */
const validate = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const messages = error.details.map((e) => e.message);
    return res.status(400).json(errorResponse('Validation failed', messages));
  }

  // Replace body with the validated (and stripped) value
  req.body = value;
  next();
};

module.exports = { validate };
