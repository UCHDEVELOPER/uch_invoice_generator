export function missingIdResponse(req, res) {
  return res.status(400).json({
    success: false,
    statusCode: 400,
    message: "ID parameter is required in the URL",
  });
}

export function invalidRoutes(req, res) {
  return res.status(404).json({
    success: false,
    statusCode: 404,
    message: "Route not found",
  });
}

