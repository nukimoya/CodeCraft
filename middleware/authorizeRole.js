const auth = require("./auth");

const authorizeRole = (requiredRole) => {
  return (req, res, next) => {
    auth(req, res, () => {
      if (!req.user || !req.user.role) {
        return res.status(403).json({ message: "Forbidden: No role found" });
      }
      if (req.user.role !== requiredRole) {
        return res.status(403).json({ message: "Forbidden: Access Denied" });
      }
      next();
    });
  };
};

module.exports = authorizeRole;
