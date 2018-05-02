'use strict'
const path = require('path')
const fs = require('fs')
const cheerio = require('cheerio')
const shell = require('shelljs')

module.exports = utils => {
    const pres_path = `${utils.target.path}/presentations`
    const presentations = shell.find(`${utils.target.path}/presentations`).filter(file => {
        return file.match(/index.html$/)
    })

    const indexFilename = `${utils.target.path}/index.html`

    return utils.src.read(indexFilename).then(content => {
        let $ = cheerio.load(content)

        let ul$ = $('#presentation-list')
        ul$.empty()

        presentations.forEach(file => {
            let fileDir = path.basename(path.dirname(file))
            let child$ = cheerio.load(fs.readFileSync(file))

            let title = child$('title').text()
            let description = child$("meta[name='description']").attr('content')

            ul$.append(
                `<li><a href="/presentations/${fileDir}/#/">${title}</a><p>${description}</p></li>`
            )
        })

        return utils.target.write('index.html', $.html())
    })
}
