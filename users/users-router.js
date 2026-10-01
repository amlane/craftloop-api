const router = require("express").Router();

const Users = require("./users-model.js");
const restricted = require("../middleware/restricted-middleware.js");
const loadCurrentUser = require("../middleware/current-user-middleware.js");
const requireAdmin = require("../middleware/require-admin-middleware.js");
const { updateRoleSchema } = require("./user-schemas.js");

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
    return res
      .status(400)
      .json({
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
