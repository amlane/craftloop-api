// Must run after current-user-middleware.js so req.currentUser is set.
module.exports = (req, res, next) => {
  if (req.currentUser.role !== "admin") {
    return res.status(403).json({ message: "Admin access required." });
  }

  next();
};
