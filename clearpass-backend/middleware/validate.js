/**
 * middleware/validate.js
 *
 * Joi validation middleware factory.
 * Usage: router.post('/login', validate(schemas.login), handler)
 */

const Joi = require("joi");

// ── Middleware factory ────────────────────────────────────────────────────────
/**
 * Returns an Express middleware that validates req.body against the given Joi schema.
 * Sends 422 with a clear error message if validation fails.
 */
function validate(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,   // collect all errors, not just first
      stripUnknown: true,  // remove unexpected fields for safety
    });

    if (error) {
      const messages = error.details.map((d) => d.message.replace(/"/g, "'"));
      return res.status(422).json({ message: "Validation failed", errors: messages });
    }

    req.body = value; // replace with sanitized value
    return next();
  };
}

// ── Reusable field definitions ───────────────────────────────────────────────
const fields = {
  email:    Joi.string().email().lowercase().trim().max(255).required(),
  password: Joi.string().min(8).max(128).required(),
  name:     Joi.string().trim().min(2).max(100).required(),
  role:     Joi.string().valid("student", "teacher", "admin").required(),
  year:     Joi.number().integer().min(1).max(4),
  semester: Joi.number().integer().min(1).max(8),
};

// ── Schemas ───────────────────────────────────────────────────────────────────
const schemas = {
  register: Joi.object({
    name:     fields.name,
    email:    fields.email,
    password: fields.password,
    year:     fields.year.optional(),
    semester: fields.semester.optional(),
  }),

  login: Joi.object({
    email:    fields.email,
    password: fields.password,
  }),

  refreshToken: Joi.object({
    refreshToken: Joi.string().hex().length(128).required(),
  }),

  createUser: Joi.object({
    name:       fields.name,
    email:      fields.email,
    password:   fields.password,
    role:       fields.role,
    department: Joi.string().trim().max(100).optional().allow("", null),
    year:       fields.year.optional(),
    semester:   fields.semester.optional(),
  }),

  updateProfile: Joi.object({
    name:       fields.name,
    department: Joi.string().trim().max(100).optional().allow("", null),
  }),

  createClearanceRequest: Joi.object({
    student_id:  Joi.number().integer().positive().required(),
    year:        fields.year,
    semester:    fields.semester,
    remarks:     Joi.string().trim().max(500).optional().allow("", null),
  }),

  changePassword: Joi.object({
    currentPassword: Joi.string().min(1).max(128).required(),
    newPassword:     Joi.string()
      .min(8).max(128)
      .pattern(/[A-Z]/, "uppercase letter")
      .pattern(/[0-9]/, "number")
      .required()
      .messages({
        "string.pattern.name": "'newPassword' must contain at least one {{#name}}",
      }),
  }),

  // Used when a student submits their own clearance request (student_id comes from JWT)
  submitClearanceRequest: Joi.object({
    year:        fields.year.optional(),
    semester:    fields.semester.optional(),
    roll_number: Joi.string().trim().max(50).optional().allow("", null),
    department:  Joi.string().trim().max(100).optional().allow("", null),
    remarks:     Joi.string().trim().max(500).optional().allow("", null),
  }),

  updateNotificationPrefs: Joi.object({
    emailUpdates:      Joi.boolean().optional(),
    requestApproval:   Joi.boolean().optional(),
    requestRejection:  Joi.boolean().optional(),
    weeklyDigest:      Joi.boolean().optional(),
  }),
};

module.exports = { validate, schemas };
