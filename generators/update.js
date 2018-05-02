'use strict'
const _doUpdate = require('./update-module.js')

module.exports = utils => {
    console.log('Updating...')
    return _doUpdate(utils).then(() => {
        console.log('Finished.')
    })
}
