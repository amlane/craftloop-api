const router = require("express").Router();

const Patterns = require("./patterns-model.js");
const restricted = require("../middleware/restricted-middleware.js");

// All user data requires a valid token.
router.use(restricted);

// TODO - Add pagination strategy
// TODO - add role column to users table
router.get("/", (req, res) => {
  Patterns.find()
    .then((patterns) => {
      res.status(200).json(patterns);
    })
    .catch((err) => {
      res.status(500).json({ message: "Failed to retrieve patterns" });
    });
});

router.get("/:id", (req, res) => {
  const permittedUser = req.decodedToken.subject;
  Patterns.findById(req.params.id)
    .then((pattern) => {
      if (pattern.user_id === permittedUser || permittedUser === 1) {
        res.status(200).json(pattern);
      } else {
        res
          .status(401)
          .json({ message: "Not authorized to view this pattern." });
      }
    })
    .catch((err) => {
      res.status(500).json({
        message: `Failed to retrieve pattern by ID: ${req.params.id}`,
      });
    });
});

router.post("/", (req, res) => {
  let pattern = req.body;
  const decoded = req.decodedToken.subject;
  pattern.user_id = decoded;

  pattern.tags = JSON.stringify(pattern.tags);
  pattern.sections = JSON.stringify(pattern.sections);

  const photos = pattern.photos; // TO DO - handle photos update separately once storage strategy is decided
  delete pattern.photos; // remove from request to avoid table constraint for invalid table column

  Patterns.add(pattern)
    .then((newPattern) => {
      res.status(201).json(newPattern);
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json(err);
    });
});

router.put("/:id", (req, res) => {
  const id = req.params.id;
  const changes = req.body;

  if ("tags" in changes) changes.tags = JSON.stringify(changes.tags);
  if ("sections" in changes)
    changes.sections = JSON.stringify(changes.sections);

  // TODO - make sure photos are handled properly once feature is enabled

  Patterns.update(id, changes)
    .then((updatedPattern) => {
      res.status(201).json(updatedPattern);
    })
    .catch((err) => {
      res.status(500).json(err);
    });
});

router.delete("/:id", async (req, res) => {
  const id = req.params.id;
  const decoded = req.decodedToken.subject;
  const pattern = await Patterns.findById(id);
  if (pattern.user_id === decoded || decoded === 1) {
    Patterns.remove(id)
      .then((pattern) => {
        res.status(204).json(pattern);
      })
      .catch((err) => {
        res.status(500).json(err);
      });
  } else {
    res.status(401).json({ message: "Unauthorized Action." });
  }
});

// ---------------------- Custom Middleware ---------------------- //

module.exports = router;
