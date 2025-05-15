#!/usr/bin/env node

import fs from 'fs'
import minimist from 'minimist'
import StoryblokClient from 'storyblok-js-client'
import { performance } from 'perf_hooks'
import dotenvx from '@dotenvx/dotenvx'
import { richTextResolver } from '@storyblok/richtext'
import { convert as htmlToText } from 'html-to-text'
import TurndownService from 'turndown'
import prettify from 'pretty'

const { render: renderRichText } = richTextResolver()

const startTime = performance.now()

dotenvx.config({ quiet: true })

const args = minimist(process.argv.slice(2))

if ('help' in args) {
	console.log(`USAGE
  $ npx storyblok-text-export
  
OPTIONS
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

MINIMAL EXAMPLE
  $ npx storyblok-text-export --token 1234567890abcdef --space 12345

MAXIMAL EXAMPLE
  $ npx storyblok-text-export \\
      --token 1234567890abcdef \\
      --space 12345 \\
      --region us \\
      --rich-text-output markdown \\
      --only-translatable \\
      --include-field-paths \\
      --content-types "page,news-article" \\
      --skip-stories "home,services" \\
      --output-dir ./my-dir \\
      --force \\
      --verbose
`)
	process.exit(0)
}

if (!('token' in args) && !process.env.STORYBLOK_OAUTH_TOKEN) {
	console.log(
		'Error: State your oauth token via the --token argument or the environment variable STORYBLOK_OAUTH_TOKEN. Use --help to find out more.'
	)
	process.exit(1)
}
const oauthToken = args.token || process.env.STORYBLOK_OAUTH_TOKEN

if (!('space' in args) && !process.env.STORYBLOK_SPACE_ID) {
	console.log(
		'Error: State your space id via the --space argument or the environment variable STORYBLOK_SPACE_ID. Use --help to find out more.'
	)
	process.exit(1)
}
const spaceId = args.space || process.env.STORYBLOK_SPACE_ID

let region = 'eu'
if ('region' in args || process.env.STORYBLOK_REGION) {
	region = args.region || process.env.STORYBLOK_REGION

	if (!['eu', 'us', 'ap', 'ca', 'cn'].includes(region)) {
		console.log('Error: Invalid region parameter stated. Use --help to find out more.')
		process.exit(1)
	}
}

const verbose = 'verbose' in args

const outputDir = args['output-dir'] || './.output'

if (fs.existsSync(outputDir) && !('force' in args)) {
	console.log(
		`Error: Output directory "${outputDir}" already exists. Use --force to delete and recreate it (POSSIBLY DANGEROUS!).`
	)
	process.exit(1)
}

let language = args['language']

const richTextOutput = args['rich-text-output'] ? args['rich-text-output'] : 'text'

const contentTypes = args['content-types'] ? args['content-types'].split(',') : []

const skipStories = args['skip-stories'] ? args['skip-stories'].split(',') : []

const onlyStories = args['only-stories'] ? args['only-stories'].split(',') : []

const onlyTranslatableFields = args['only-translatable'] || false

const includeFieldPaths = args['include-field-paths'] || false

// General information
console.log('')
console.log(`Performing text-export of space ${spaceId}:`)
console.log(`- output dir: ${outputDir}`)
console.log(`- language: ${language ? language : 'default'}`)
console.log(`- rich-text output: ${richTextOutput}`)
console.log(`- only translatable fields: ${onlyTranslatableFields ? 'yes' : 'no'}`)
console.log(`- include field paths: ${includeFieldPaths ? 'yes' : 'no'}`)
console.log(`- content types: ${contentTypes.length > 0 ? contentTypes.join(', ') : 'all'}`)
if (skipStories.length > 0) {
	console.log(`- skipped stories: ${skipStories.join(', ')}`)
}
if (onlyStories.length > 0) {
	console.log(`- only stories: ${onlyStories.join(', ')}`)
}

// Init turndown service
const turndownService = new TurndownService({
	headingStyle: 'atx',
})

// Init Management API
const StoryblokMAPI = new StoryblokClient({
	oauthToken: oauthToken,
	region: region,
})

// Write console.log, if verbose mode is enabled
function verboseLog(text) {
	if (verbose) {
		console.log(text)
	}
}

// Create output dir (and remove existing)
if (fs.existsSync(outputDir)) {
	fs.rmSync(outputDir, { recursive: true, force: true })
}
fs.mkdirSync(outputDir, { recursive: true })

// Fetch all stories
console.log('')
console.log(`Fetching stories...`)
const stories = []
const storyList = await StoryblokMAPI.getAll(`spaces/${spaceId}/stories`)

for (const story of storyList) {
	if (contentTypes.length > 0 && !contentTypes.includes(story.content_type)) {
		continue
	}
	if (skipStories.length > 0 && skipStories.includes(story.full_slug)) {
		continue
	}
	if (onlyStories.length > 0 && !onlyStories.includes(story.full_slug)) {
		continue
	}

	const storyData = await StoryblokMAPI.get(`spaces/${spaceId}/stories/${story.id}`)
	stories.push(storyData.data.story)
}

// Fetch all components
console.log('')
console.log(`Fetching components...`)
const components = await StoryblokMAPI.getAll(`spaces/${spaceId}/components`)

function isObject(item) {
	return typeof item === 'object' && !Array.isArray(item) && item !== null
}
function capitalizeFirstLetter(val) {
	return String(val).charAt(0).toUpperCase() + String(val).slice(1)
}

// Function to parse a rich text field
function parseRichTextField(node) {
	if (richTextOutput === 'json') {
		return JSON.stringify(node, null, 2)
	}
	const html = renderRichText(node)
	if (richTextOutput === 'html') {
		return prettify(html)
	}
	if (richTextOutput === 'markdown') {
		return turndownService.turndown(html)
	}
	return htmlToText(html, { wordwrap: false })
}

// Function to parse a table field
function parseTableField(node) {
	const outputLines = []
	outputLines.push(node.thead.map((thead) => thead.value).join(' | '))
	for (const row of node.tbody) {
		outputLines.push(row.body.map((col) => col.value).join(' | '))
	}
	return outputLines.join('\n')
}

// General function to parse a content node
function parseContentNode(node, fieldPath = []) {
	if (isObject(node)) {
		const nodeFieldPath = fieldPath.slice()
		let component = null
		if ('component' in node) {
			component = components.find((component) => component.name === node.component)

			if (!component) {
				console.log(`Error: Component "${node.component}" not found.`)
				process.exit(1)
			}

			if (nodeFieldPath.length > 0) {
				nodeFieldPath.push(component.real_name)
			}
		}

		for (const [key, subNode] of Object.entries(node)) {
			let processDeeper = true
			let subnodeFieldPath = nodeFieldPath.slice()
			if (component && key in component.schema) {
				const fieldType = component.schema[key].type
				const isTranslatable = component.schema[key].translatable
				subnodeFieldPath.push(
					component.schema[key].display_name || capitalizeFirstLetter(key)
				)

				if (['text', 'textarea', 'richtext', 'table'].includes(fieldType)) {
					if (onlyTranslatableFields && !isTranslatable) {
						verboseLog(
							`Skipping non-translatable field "${subnodeFieldPath.join(' > ')}"`
						)
						continue
					}
				}

				let content = ''

				switch (fieldType) {
					case 'text':
					case 'textarea':
						if (subNode.length > 0) {
							content = subNode
						}
						break
					case 'richtext':
						if (isObject(subNode)) {
							content = parseRichTextField(subNode)
						}
						break
					case 'table':
						processDeeper = false
						content = parseTableField(subNode)
						break
				}

				if (content.trim().length > 0) {
					if (includeFieldPaths) {
						storyContent.push(`\nField: "${subnodeFieldPath.join(' > ')}"`)
						storyContent.push(`------------------------------`)
						storyContent.push(content)
					} else {
						storyContent.push(`\n${content}`)
					}
				}
			}
			if (processDeeper) {
				if (Array.isArray(subNode)) {
					for (const [index, subNodeItem] of subNode.entries()) {
						const arraySubnodeFieldPath = subnodeFieldPath.slice()
						arraySubnodeFieldPath.push(index)
						parseContentNode(subNodeItem, arraySubnodeFieldPath)
					}
				}
				// If subnode is object, parse it.
				else if (isObject(subNode)) {
					parseContentNode(subNode, subnodeFieldPath)
				}
			}
		}
	}
}

// Process stories
console.log('')
console.log(`Processing stories...`)
const storyContent = []

for (const story of stories) {
	storyContent.length = 0
	verboseLog('')
	verboseLog(`Slug "${story.full_slug}"`)
	verboseLog(`Name "${story.name}"`)
	verboseLog(`==============================`)

	storyContent.push(`Metadata:`)
	storyContent.push(`=========`)
	storyContent.push(`Slug: "${story.slug}"`)
	storyContent.push(`Name: "${story.name}"`)

	if (!story.is_folder) {
		storyContent.push(`\nContent:`)
		storyContent.push(`==========`)
		parseContentNode(story.content)
	}

	const storyContentString = storyContent.join('\n')

	const outputFileName = story.full_slug.replace(/\//g, '_')

	const outputFile = `${outputDir}/${outputFileName}.txt`

	if (fs.existsSync(outputFile)) {
		console.log(`Error: Output file "${outputFile}" already exists.`)
		process.exit(1)
	}

	fs.writeFileSync(outputFile, storyContentString, (error) => {
		if (error) {
			throw error
		}
	})

	verboseLog(`Story text successfully written to ${outputFile}.`)
}

const endTime = performance.now()

console.log('')
console.log('Result')
console.log('======')
console.log(`Process successfully finished in ${Math.round((endTime - startTime) / 1000)} seconds.`)
process.exit(0)
