const router = require("express").Router();

const Patterns = require("./patterns-model.js");
const restricted = require("../middleware/restricted-middleware.js");
const {
  createPatternSchema,
  updatePatternSchema,
} = require("./pattern-schemas.js");

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
      if (pattern === undefined) {
        res
          .status(404)
          .json({ message: `Pattern ${req.params.id} not found.` });
      } else if (pattern.user_id === permittedUser || permittedUser === 1) {
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
  const parsed = createPatternSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({
        message: "Invalid pattern payload",
        errors: parsed.error.flatten(),
      });
  }

  const pattern = parsed.data;
  const decoded = req.decodedToken.subject;
  pattern.user_id = decoded;

  pattern.tags = JSON.stringify(pattern.tags ?? []);
  pattern.sections = JSON.stringify(pattern.sections ?? []);

  delete pattern.photos; // TO DO - handle photos separately once storage strategy is decided

  Patterns.add(pattern)
    .then((newPattern) => {
      res.status(201).json(newPattern);
    })
    .catch((err) => {
      res.status(500).json(err);
    });
});

router.put("/:id", (req, res) => {
  const id = req.params.id;
  const parsed = updatePatternSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({
        message: "Invalid pattern payload",
        errors: parsed.error.flatten(),
      });
  }

  const changes = parsed.data;

  if ("tags" in changes) changes.tags = JSON.stringify(changes.tags);
  if ("sections" in changes)
    changes.sections = JSON.stringify(changes.sections);

  delete changes.photos; // TODO - make sure photos are handled properly once feature is enabled

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
