# Text export CLI for the Storyblok CMS

[![npm version](https://img.shields.io/npm/v/storyblok-text-export.svg)](https://www.npmjs.com/package/storyblok-text-export)
[![license](https://img.shields.io/github/license/webflorist/storyblok-text-export)](https://github.com/webflorist/storyblok-text-export/blob/main/LICENSE)

An npx CLI tool to export all text-fields (types `text`, `textarea`, `richtext`, `table`) of stories of a [Storyblok CMS](https://www.storyblok.com) space.

## Use case

This script can be used to e.g. export all text-content of a storyblok space to be forwarded to a translation service provider.

## Installation

```shell

# simply auto-download and run via npx
$ npx storyblok-text-export

# or install globally
$ npm install -g storyblok-text-export

# or install for project using npm
$ npm install storyblok-text-export

# or install for project using yarn
$ yarn add storyblok-text-export

# or install for project using pnpm
$ pnpm add storyblok-text-export
```

## Usage

Call `npx storyblok-text-export` with the following options:

### Options

```text
--token <token>                (required) Personal OAuth access token created
                               in the account settings of a Stoyblok user.
                               (NOT the Access Token of a Space!)
                               Alternatively, you can set the STORYBLOK_OAUTH_TOKEN environment variable.
--space <space_id>             (required) ID of the space to backup
                               Alternatively, you can set the STORYBLOK_SPACE_ID environment variable.
--region <region>              Region of the space. Possible values are:
                               - 'eu' (default): EU
                               - 'us': US
                               - 'ap': Australia
                               - 'ca': Canada
                               - 'cn': China
                               Alternatively, you can set the STORYBLOK_REGION environment variable.
--rich-text-output <output>    Format of the rich text output. Possible values are:
                               - 'text' (default): Plain text
                               - 'json': Original JSON
                               - 'html': HTML
                               - 'markdown': Markdown
--only-translatable            Only export fields marked as translatable. Defaults to false.
--include-field-paths          Include paths of component-/field-names for each field. Defaults to false.
--content-types <types>        Comma seperated list of content/component types to process. Defaults to all.
--skip-stories <stories>       Comma seperated list of the full-slugs of stories to skip.
                               (e.g. --skip-stories "home,about-us")
--only-stories <stories>       Comma seperated list of the full-slugs of stories you want to limit processing to.
                               (e.g. --only-stories "about-us")
--output-dir <dir>             Directory to write the backup to (default=./.output)
                               (ATTENTION: Will fail if the directory already exists!)
--force                        Force deletion and recreation of existing output directory.
--verbose                      Show detailed output for every processed story.
--help                         Show this help
```

Storyblok OAuth token, space-id and region can be set via environment variables. You can also use a `.env` file in your project root for this (see `.env.example`).

### Minimal example

```shell
npx storyblok-text-export --token 1234567890abcdef --space 12345
```

### Maximal example

```shell
npx storyblok-text-export \
    --token 1234567890abcdef \
    --space 12345 \
    --region us \
    --rich-text-output markdown \
    --only-translatable \
    --include-field-paths \
    --content-types "page,news-article" \
    --skip-stories "home,services" \
    --output-dir ./my-dir \
    --force \
    --verbose
```

## License

This package is open-sourced software licensed under the [MIT license](https://github.com/webflorist/storyblok-text-export/blob/main/LICENSE).
