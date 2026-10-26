const configService = require('../services/configService');
const { wrapAsync } = require('../utils/errors');

const configController = {
  getConfig: wrapAsync(async (_req, res) => {
    const config = await configService.getConfig();
    res.status(200).json({ config });
  }),

  updateConfig: wrapAsync(async (req, res) => {
    const config = await configService.updateConfig(req.body, req.user);
    res.status(200).json({
      message: 'Configuración actualizada exitosamente',
      config,
    });
  }),
};

module.exports = configController;
