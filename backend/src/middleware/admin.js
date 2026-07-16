export function adminOnly(req, res, next) {
  if (req.user.user_type !== "admin") {
    return res.status(403).json({
      success: false,
      statusCode: 403,
      message: "Admin access only",
    });
  }
  next();
}
