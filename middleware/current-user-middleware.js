const Users = require("../users/users-model.js");

// Looks the requester's role up fresh from the DB on every request, rather
// than trusting a role baked into the JWT - tokens are valid for 7 days, so
// a role embedded at login time could let a revoked admin keep acting as
// one until their token expires.
module.exports = async (req, res, next) => {
  try {
    const user = await Users.findById(req.decodedToken.subject);
    if (!user) {
      return res.status(401).json({ message: "Invalid Credentials" });
    }

    req.currentUser = user;
    next();
  } catch (err) {
    res.status(500).json({ message: "Failed to load current user" });
  }
};
