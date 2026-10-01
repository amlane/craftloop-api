const { z } = require("zod");

const updateRoleSchema = z.object({
  role: z.enum(["user", "admin"]),
});

const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
});

const deleteAccountSchema = z.object({
  password: z.string().min(1, "Password is required"),
});

module.exports = {
  updateRoleSchema,
  updatePasswordSchema,
  deleteAccountSchema,
};
