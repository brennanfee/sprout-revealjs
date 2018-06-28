'use strict'
const inquirer = require('inquirer')
const str = require('underscore.string')
const shell = require('shelljs')
const _doUpdate = require('./update-module.js')

function _stripPeriodIfNeeded(str) {
  if (str && str.endsWith('.')) {
    return str.substr(0, str.length - 1)
  } else {
    return str
  }
}

module.exports = utils => {
  let config = {}

  return utils.target
    .read('.revealAnswers')
    .then(answers => {
      config = Object.assign(config, JSON.parse(answers))
      const prompts = [
        {
          name: 'presentationName',
          message: 'Your presentation name (folder name for the presentation):',
          filter: str.slugify,
          validate(str) {
            return str.length > 0
          },
        },
        {
          name: 'presentationTitle',
          message: 'Your presentation title:',
          validate(str) {
            return str.length > 0
          },
        },
        {
          name: 'presentationDescription',
          message: 'Presentation description:',
          filter: _stripPeriodIfNeeded,
        },
      ]
      return inquirer.prompt(prompts)
    })
    .then(responses => {
      config = Object.assign(config, responses)

      shell.mkdir('-p', `${utils.target.path}/presentations/${config.presentationName}`)
      return utils.target.read('template/index.html')
    })
    .then(content => {
      return utils.target.write(
        `presentations/${config.presentationName}/index.html`,
        content,
        config
      )
    })
    .then(() => {
      return utils.target.read('template/readme.md')
    })
    .then(content => {
      return utils.target.write(
        `presentations/${config.presentationName}/readme.md`,
        content,
        config
      )
    })
    .then(() => {
      return utils.target.read('template/custom-js.js')
    })
    .then(content => {
      return utils.target.write(
        `presentations/${config.presentationName}/custom-js.js`,
        content,
        config
      )
    })
    .then(() => {
      return utils.target.read('template/styles.css')
    })
    .then(content => {
      return utils.target.write(`presentations/${config.presentationName}/styles.css`, content)
    })
    .then(() => {
      return _doUpdate(utils)
    })
}
