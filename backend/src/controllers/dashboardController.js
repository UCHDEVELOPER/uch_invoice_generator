import { dashboardDataService } from "../services/dashboardService.js";

export async function dashboard(req, res) {
  try {
    const result = await dashboardDataService();
    return res.status(result.statusCode).json(result);

  } catch (error) {
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: error.message,
    });
  }
}
