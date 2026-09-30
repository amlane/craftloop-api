const router = require("express").Router();
const multer = require("multer");

const Patterns = require("./patterns-model.js");
const PatternPhotos = require("./pattern-photos-model.js");
const cloudinary = require("../config/cloudinary.js");
const restricted = require("../middleware/restricted-middleware.js");
const {
  createPatternSchema,
  updatePatternSchema,
  photoCaptionSchema,
} = require("./pattern-schemas.js");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB
  fileFilter: (req, file, cb) => {
    const allowed = ["image/png", "image/jpeg", "image/webp", "image/gif"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Unsupported file type. Use PNG, JPEG, WEBP, or GIF."));
    }
  },
});

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
    return res.status(400).json({
      message: "Invalid pattern payload",
      errors: parsed.error.flatten(),
    });
  }

  const pattern = parsed.data;
  const decoded = req.decodedToken.subject;
  pattern.user_id = decoded;

  pattern.tags = JSON.stringify(pattern.tags ?? []);
  pattern.sections = JSON.stringify(pattern.sections ?? []);

  delete pattern.photos; // photos have their own lifecycle - see the /:id/photos routes below

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
    return res.status(400).json({
      message: "Invalid pattern payload",
      errors: parsed.error.flatten(),
    });
  }

  const changes = parsed.data;

  if ("tags" in changes) changes.tags = JSON.stringify(changes.tags);
  if ("sections" in changes)
    changes.sections = JSON.stringify(changes.sections);

  delete changes.photos; // photos have their own lifecycle - see the /:id/photos routes below

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

// ---------------------- Photos ---------------------- //
// Photos upload to Cloudinary and persist immediately (not part of the
// draft/PUT save flow), so they get their own routes.

router.post("/:id/photos", verifyPatternOwner, (req, res) => {
  upload.single("photo")(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ message: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ message: "No photo file provided." });
    }

    try {
      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: `craftloop/patterns/${req.params.id}` },
          (uploadErr, uploadResult) => {
            if (uploadErr) reject(uploadErr);
            else resolve(uploadResult);
          },
        );
        stream.end(req.file.buffer);
      });

      const photo = await PatternPhotos.add({
        patternId: req.params.id,
        url: result.secure_url,
        publicId: result.public_id,
      });

      res.status(201).json(photo);
    } catch (uploadErr) {
      console.error("Photo upload failed:", uploadErr);
      res.status(500).json({ message: "Failed to upload photo." });
    }
  });
});

router.patch("/:id/photos/:photoId", verifyPatternOwner, async (req, res) => {
  const parsed = photoCaptionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid caption payload",
      errors: parsed.error.flatten(),
    });
  }

  try {
    const photo = await PatternPhotos.findById(req.params.photoId);
    if (!photo || String(photo.pattern_id) !== req.params.id) {
      return res.status(404).json({ message: "Photo not found." });
    }

    const updated = await PatternPhotos.updateCaption(
      req.params.photoId,
      parsed.data.caption ?? "",
    );
    res.status(200).json(updated);
  } catch (err) {
    console.error("Photo caption update failed:", err);
    res.status(500).json({ message: "Failed to update photo." });
  }
});

router.delete("/:id/photos/:photoId", verifyPatternOwner, async (req, res) => {
  try {
    const photo = await PatternPhotos.findById(req.params.photoId);
    if (!photo || String(photo.pattern_id) !== req.params.id) {
      return res.status(404).json({ message: "Photo not found." });
    }

    await cloudinary.uploader.destroy(photo.public_id);
    await PatternPhotos.remove(req.params.photoId);
    res.status(204).end();
  } catch (err) {
    console.error("Photo delete failed:", err);
    res.status(500).json({ message: "Failed to delete photo." });
  }
});

// ---------------------- Custom Middleware ---------------------- //

async function verifyPatternOwner(req, res, next) {
  try {
    const pattern = await Patterns.findById(req.params.id);
    if (!pattern) {
      return res
        .status(404)
        .json({ message: `Pattern ${req.params.id} not found.` });
    }

    const permittedUser = req.decodedToken.subject;
    if (pattern.user_id !== permittedUser && permittedUser !== 1) {
      return res
        .status(401)
        .json({ message: "Not authorized to modify this pattern." });
    }

    next();
  } catch (err) {
    console.error("Pattern ownership check failed:", err);
    res.status(500).json({ message: "Failed to verify pattern ownership." });
  }
}

module.exports = router;
