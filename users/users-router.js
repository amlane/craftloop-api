const router = require("express").Router();

const Users = require("./users-model.js");
const restricted = require("../middleware/restricted-middleware.js");

// All user data requires a valid token.
router.use(restricted);

// ---------------------- GET Self using JWT ---------------------- //
// TO DO - Restrict to users with admin role

router.get("/", (req, res) => {
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
  Users.findById(req.decodedToken.subject)
    .then((user) => {
      if (user) {
        req.user = user;
        res.status(200).json(user);
      } else {
        res.status(404).json({ message: "User Not Found." });
      }
    })
    .catch((err) => {
      res.status(500).json({ message: "Failed to retrieve user" });
    });
});

// ---------------------- GET basic details about User by User Id ---------------------- //

router.get("/:id", verifyUserId, (req, res) => {
  res.status(200).json(req.user);
});

// ---------------------- GET Patterns By User Id ---------------------- //

router.get("/:id/patterns", verifyUserId, async (req, res) => {
  try {
    const id = req.params.id;
    const user = await Users.findById(id);
    user.patterns = await Users.getPatternsByUserId(id);
    res.status(200).json({ user });
  } catch (error) {
    res.status(500).json({ error });
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

module.exports = router;
