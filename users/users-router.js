const router = require("express").Router();
const bcrypt = require("bcryptjs");

const Users = require("./users-model.js");
const PatternPhotos = require("../patterns/pattern-photos-model.js");
const cloudinary = require("../config/cloudinary.js");
const restricted = require("../middleware/restricted-middleware.js");
const loadCurrentUser = require("../middleware/current-user-middleware.js");
const requireAdmin = require("../middleware/require-admin-middleware.js");
const {
  updateRoleSchema,
  updatePasswordSchema,
  deleteAccountSchema,
} = require("./user-schemas.js");

const BCRYPT_ROUNDS = 12;

// All user data requires a valid token. loadCurrentUser additionally fetches
// the requester's own row (role included) fresh on every request, so
// requireAdmin / self-or-admin checks below are never based on stale data.
router.use(restricted, loadCurrentUser);

// ---------------------- GET all users (admin only) ---------------------- //

router.get("/", requireAdmin, (req, res) => {
  Users.find()
    .then((users) => {
      res.status(200).json(users);
    })
    .catch((err) => {
      res.status(500).json({ message: "Failed to retrieve users" });
    });
});

// ---------------------- GET Self using JWT ---------------------- //

router.get("/me", (req, res) => {
  res.status(200).json(req.currentUser);
});

// ---------------------- PATCH own password ---------------------- //

router.patch("/me/password", async (req, res) => {
  const parsed = updatePasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid password payload",
      errors: parsed.error.flatten(),
    });
  }

  try {
    const user = await Users.findBy({ id: req.currentUser.id }).first();
    const validCurrent = await bcrypt.compare(
      parsed.data.currentPassword,
      user.password,
    );
    if (!validCurrent) {
      return res
        .status(401)
        .json({ message: "Current password is incorrect." });
    }

    const hash = await bcrypt.hash(parsed.data.newPassword, BCRYPT_ROUNDS);
    await Users.updatePassword(req.currentUser.id, hash);
    res.status(200).json({ message: "Password updated." });
  } catch (err) {
    console.error("Password update failed:", err);
    res.status(500).json({ message: "Failed to update password." });
  }
});

// ---------------------- DELETE own account ---------------------- //

router.delete("/me", async (req, res) => {
  const parsed = deleteAccountSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid payload",
      errors: parsed.error.flatten(),
    });
  }

  try {
    const user = await Users.findBy({ id: req.currentUser.id }).first();
    const validPassword = await bcrypt.compare(
      parsed.data.password,
      user.password,
    );
    if (!validPassword) {
      return res.status(401).json({ message: "Incorrect password." });
    }

    // The patterns FK cascade only cleans up DB rows - the Cloudinary
    // assets themselves need to be deleted separately before the cascade.
    const photos = await PatternPhotos.findByUserId(req.currentUser.id);
    await Promise.all(
      photos.map((photo) => cloudinary.uploader.destroy(photo.public_id)),
    );

    await Users.remove(req.currentUser.id);
    res.status(204).end();
  } catch (err) {
    console.error("Account deletion failed:", err);
    res.status(500).json({ message: "Failed to delete account." });
  }
});

// ---------------------- GET basic details about User by User Id ---------------------- //

router.get("/:id", verifyUserId, requireSelfOrAdmin, (req, res) => {
  res.status(200).json(req.user);
});

// ---------------------- GET Patterns By User Id ---------------------- //

router.get(
  "/:id/patterns",
  verifyUserId,
  requireSelfOrAdmin,
  async (req, res) => {
    try {
      const user = req.user;
      user.patterns = await Users.getPatternsByUserId(user.id);
      res.status(200).json({ user });
    } catch (error) {
      res.status(500).json({ message: "Failed to retrieve patterns" });
    }
  },
);

// ---------------------- PATCH role (admin only) ---------------------- //

router.patch("/:id/role", requireAdmin, verifyUserId, async (req, res) => {
  const parsed = updateRoleSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid role payload",
      errors: parsed.error.flatten(),
    });
  }

  if (req.user.id === req.currentUser.id) {
    return res
      .status(400)
      .json({ message: "Admins cannot change their own role." });
  }

  try {
    const updated = await Users.updateRole(req.user.id, parsed.data.role);
    res.status(200).json(updated);
  } catch (err) {
    res.status(500).json({ message: "Failed to update role" });
  }
});

// ---------------------- Custom Middleware ---------------------- //

function verifyUserId(req, res, next) {
  Users.findById(req.params.id)
    .then((user) => {
      if (user) {
        req.user = user;
        next();
      } else {
        res.status(404).json({ message: "User Not Found." });
      }
    })
    .catch((err) => {
      res.status(500).json({ message: "Failed to retrieve user" });
    });
}

// Must run after verifyUserId (needs req.user) and loadCurrentUser (needs
// req.currentUser).
function requireSelfOrAdmin(req, res, next) {
  if (req.user.id === req.currentUser.id || req.currentUser.role === "admin") {
    return next();
  }
  res.status(401).json({ message: "Not authorized to view this user's info." });
}

module.exports = router;
