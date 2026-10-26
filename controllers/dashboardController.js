const dashboardService = require('../services/dashboardService');
const { wrapAsync } = require('../utils/errors');

const dashboardController = {
  getMetrics: wrapAsync(async (req, res) => {
    const days = Number(req.query.days) || 30;
    const metrics = await dashboardService.getMetrics({ days });
    res.status(200).json(metrics);
  }),
};

module.exports = dashboardController;
