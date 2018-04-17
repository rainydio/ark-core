const logger = require('@arkecosystem/core-pluggy').get('logger')
const Manager = require('./manager')
const database = require('./database')

exports.plugin = {
  pkg: require('../package.json'),
  defaults: require('./defaults.json'),
  alias: 'webhooks',
  register: async (hook, config, app) => {
    logger.info('Initialising Webhooks...')

    await database.init(config.database)

    const manager = new Manager(config)

    await manager.init(config)

    return Manager.getInstance()
  },
  bindings: {
    webhookDB: database
  }
}
