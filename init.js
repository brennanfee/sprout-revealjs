'use strict'
const path = require('path')
const str = require('underscore.string')
const ghGot = require('gh-got')
const shell = require('shelljs')

const licenses = [
  { name: 'Apache License 2.0', value: 'Apache-2.0' },
  { name: 'MIT License', value: 'MIT' },
  { name: 'Universal Permissive License v1.0', value: 'UPL-1.0' },
  { name: 'Mozilla Public License 2.0', value: 'MPL-2.0' },
  { name: 'BSD 2-Clause "Simplified" License', value: 'BSD-2-Clause' },
  { name: 'BSD 3-Clause "New" or "Revised" License', value: 'BSD-3-Clause' },
  { name: 'Internet Systems Consortium (ISC) License', value: 'ISC' },
  { name: 'GNU Affero General Public License v3.0 or later', value: 'AGPL-3.0-or-later' },
  { name: 'GNU General Public License v3.0 or later', value: 'GPL-3.0-or-later' },
  { name: 'GNU Lesser General Public License v3.0 or later', value: 'LGPL-3.0-or-later' },
  { name: 'The Unlicense', value: 'Unlicense' },
  { name: 'SIL Open Font License 1.1', value: 'OFL-1.1' },
  { name: 'No License (Copyrighted)', value: 'UNLICENSED' },
]

const globalConfig = {}

exports.before = function(utils) {
  console.log('sprout-revealjs: Starting...')
  globalConfig.targetPath = utils.target.path

  return ghGot('user')
    .then(result => {
      globalConfig.githubName = result.body.name
      globalConfig.githubEmail = result.body.email
      globalConfig.githubUrl = result.body.html_url
      globalConfig.githubUserName = result.body.login
    })
    .catch(() => {
      return utils.target
        .exec('git config user.name')
        .then(gitUserName => {
          globalConfig.gitName = gitUserName[0].trim()
        })
        .then(() => {
          return utils.target.exec('git config user.email')
        })
        .then(gitUserEmail => {
          globalConfig.gitEmail = gitUserEmail[0].trim()
        })
        .catch(() => '')
    })
}

function _stripPeriodIfNeeded(str) {
  if (str && str.endsWith('.')) {
    return str.substr(0, str.length - 1)
  } else {
    return str
  }
}

exports.configure = [
  {
    name: 'projectName',
    message: 'Your project name (repo name or folder name):',
    default: () => {
      if (globalConfig.targetPath) {
        return str.slugify(path.basename(globalConfig.targetPath))
      } else {
        return ''
      }
    },
    filter: str.slugify,
    validate(str) {
      return str.length > 0
    },
  },
  {
    name: 'projectTitle',
    message: 'Project title:',
    filter: _stripPeriodIfNeeded,
  },
  {
    name: 'projectDescription',
    message: 'Project description:',
    filter: _stripPeriodIfNeeded,
  },
  {
    name: 'presentationName',
    message: 'Your presentation name (folder name for first presentation):',
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
  {
    name: 'revealTheme',
    message: 'Reveal theme:',
    default: 'blood',
  },
  {
    name: 'authorName',
    message: "Author's name:",
    default: () => {
      return globalConfig.githubName || globalConfig.gitName || ''
    },
  },
  {
    name: 'authorEmail',
    message: "Author's email:",
    default: () => {
      return globalConfig.githubEmail || globalConfig.gitEmail || ''
    },
  },
  {
    name: 'githubAccount',
    message: 'GitHub username or organization:',
    default: () => {
      return globalConfig.githubUserName || ''
    },
    validate(str) {
      return str.length > 0
    },
  },
  {
    type: 'list',
    name: 'license',
    message: 'Which license do you want to use?',
    default: 'Apache-2.0',
    choices: licenses,
  },
]

exports.beforeRender = function(utils, config) {
  // Some globals...
  config.revealVersion = '3.6.0'

  if (!config.projectDescription) {
    config.projectDescription = config.projectName
  }
  if (!config.presentationDescription) {
    config.presentationDescription = config.presentationName
  }

  config.authorUrl = ''
  if (config.githubUrl) {
    config.authorUrl = config.githubUrl
  } else {
    config.authorUrl = `https://github.com/${config.githubAccount}`
  }

  config.repository = ''
  config.repositoryUrl = ''
  config.repositoryHomepageUrl = ''
  config.repositoryBugsUrl = ''
  config.repositoryGitUrl = ''

  if (config.githubAccount) {
    config.repository = `github:${config.githubAccount}/${config.projectName}`
    config.repositoryUrl = `${config.authorUrl}/${config.projectName}`
    config.repositoryHomepageUrl = `${config.repositoryUrl}#readme`
    config.repositoryBugsUrl = `${config.repositoryUrl}/issues`
    config.repositoryGitUrl = `git@github.com:${config.githubAccount}/${config.projectName}.git`
  }

  config.author = ''
  config.authorMarkdownLink = ''
  if (config.authorName) {
    config.author = config.authorName
    config.authorMarkdownLink = config.authorName

    if (config.authorEmail) {
      config.author += ` <${config.authorEmail}>`
    }
    if (config.authorUrl) {
      config.author += ` (${config.authorUrl})`
      config.authorMarkdownLink = `[${config.authorName}](${config.authorUrl})`
    }
  }

  config.copyrightYear = new Date().getFullYear()
  config.year = config.copyrightYear
}

exports.after = function(utils, config) {
  return utils.target
    .rename('package.json.ejs', 'package.json')
    .then(() => {
      return _writePresentationFiles(utils, config)
    })
    .then(() => {
      return _writeTemplateFiles(utils, config)
    })
    .then(() => {
      return _writeLicenseFile(utils, config)
    })
    .then(() => {
      return _writeAnswersFile(utils, config)
    })
    .then(() => {
      return _executeCommands(utils, config)
    })
}

function _writePresentationFiles(utils, config) {
  shell.mkdir('-p', `${utils.target.path}/presentations/${config.presentationName}`)

  return utils.src
    .read('presentation-template/index.html')
    .then(content => {
      return utils.target.write(
        `presentations/${config.presentationName}/index.html`,
        content,
        config
      )
    })
    .then(() => {
      return utils.src.read('presentation-template/readme.md')
    })
    .then(content => {
      return utils.target.write(
        `presentations/${config.presentationName}/readme.md`,
        content,
        config
      )
    })
    .then(() => {
      return utils.src.read('presentation-template/custom-js.js')
    })
    .then(content => {
      return utils.target.write(
        `presentations/${config.presentationName}/custom-js.js`,
        content,
        config
      )
    })
    .then(() => {
      return utils.copy(
        'presentation-template/styles.css',
        `presentations/${config.presentationName}/styles.css`
      )
    })
}

function _writeTemplateFiles(utils, config) {
  shell.mkdir('-p', `${utils.target.path}/template/`)

  return utils
    .copy('presentation-template/index.html', `template/index.html`)
    .then(() => {
      return utils.copy('presentation-template/readme.md', `template/readme.md`)
    })
    .then(() => {
      return utils.copy('presentation-template/custom-js.js', `template/custom-js.js`)
    })
    .then(() => {
      return utils.copy('presentation-template/styles.css', `template/styles.css`)
    })
}

function _writeLicenseFile(utils, config) {
  return utils.src.read(`licenses/${config.license}.txt`).then(content => {
    return utils.target.write('license', content, config)
  })
}

function _writeAnswersFile(utils, config) {
  const answers = Object.assign({}, config)

  delete answers.presentationName
  delete answers.presentationTitle
  delete answers.presentationDescription

  return utils.target.write('.revealAnswers', JSON.stringify(answers), null)
}

function _executeCommands(utils, config) {
  console.log('Running npm install')
  // First run npm install
  return utils.target
    .exec('npm install')
    .then(() => {
      // Now setup git
      return utils.target.exec('git init --quiet')
    })
    .then(() => {
      // Attach the remote repo if we can
      if (config.repositoryGitUrl) {
        return utils.target.exec(`git remote add origin ${config.repositoryGitUrl}`)
      }
    })
    .then(() => {
      // Stage the initial files
      return utils.target.exec('git add .')
    })
    .then(() => {
      // Perform the initial commit
      if (!process.env.SPROUT_SKIP_COMMIT) {
        return utils.target.exec('git commit -m "Initial commit"')
      }
    }, () => '')
    .then(() => {
      console.log('Finished')
    })
}
