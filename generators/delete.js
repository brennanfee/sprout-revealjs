'use strict'
const inquirer = require('inquirer')
const str = require('underscore.string')
const shell = require('shelljs')

module.exports = utils => {
    const prompts = [
        {
            name: 'presentationName',
            message: 'Presentation to remove (folder name for the presentation):',
            filter: str.slugify,
            validate(str) {
                return str.length > 0
            },
        },
    ]

    return inquirer.prompt(prompts).then(answers => {
        shell.rm('-rf', `${utils.target.path}/presentations/${answers.presentationName}`)
    })
}
