const router = require("express").Router();

const Patterns = require("./patterns-model.js");
const restricted = require("../middleware/restricted-middleware.js");

// All user data requires a valid token.
router.use(restricted);

// TO DO - Add pagination strategy
// TO DO - restrict endpoint to users with admin role (also TO DO - add role column to users table)
router.get("/", (req, res) => {
  Patterns.find()
    .then((patterns) => {
      res.status(200).json(patterns);
    })
    .catch((err) => {
      res.status(500).json({ message: "Failed to retrieve patterns" });
    });
});

// get all patterns by user id

// ---------------------- Custom Middleware ---------------------- //

module.exports = router;
