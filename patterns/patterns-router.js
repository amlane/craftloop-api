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

router.post("/", (req, res) => {
  let pattern = req.body;
  const decoded = req.decodedToken.subject;
  pattern.user_id = decoded;

  pattern.sections = JSON.stringify(pattern.sections);
  pattern.tags = JSON.stringify(pattern.tags);
  const photos = pattern.photos; // TO DO - handle photos update separately once storage strategy is decided
  delete pattern.photos; // remove from request to avoid table constraint for invalid table column

  Patterns.add(pattern)
    .then((newPattern) => {
      res.status(201).json({ newPattern });
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json(err);
    });
});

router.put("/:id", (req, res) => {
  const id = req.params.id;
  const changes = req.body;

  Patterns.update(id, changes)
    .then((updatedPattern) => {
      res.status(201).json(updatedPattern);
    })
    .catch((err) => {
      res.status(500).json(err);
    });
});

router.delete("/:id", (req, res) => {
  const id = req.params.id;

  Patterns.remove(id)
    .then((pattern) => {
      res.status(204).json(pattern);
    })
    .catch((err) => {
      res.status(500).json(err);
    });
});

// ---------------------- Custom Middleware ---------------------- //

module.exports = router;
