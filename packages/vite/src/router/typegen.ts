import path from 'node:path'
import fs from 'node:fs'
import { debounce } from 'throttle-debounce'
import type { RouteCollection } from '@hybridly/vue'
import type { RouterOptions } from '../types'
import { debug } from '../utils'
import { fetchRoutesFromArtisan } from './routes'

export const write = debounce(1000, writeDefinitions, { atBegin: true })

async function writeDefinitions(options: RouterOptions, collection?: RouteCollection) {
	collection ??= await fetchRoutesFromArtisan(options)

	if (options.dts === false) {
		return
	}

	debug.router('Writing types for route collection:', collection)

	const target = path.resolve(options.dts ?? 'resources/types/routes.d.ts')
	const routes = Object.fromEntries(Object.entries(collection!.routes).map(([key, route]) => {
		const bindings = route.bindings
			? Object.fromEntries(Object.entries(route.bindings).map(([key]) => [key, '__key_placeholder__']))
			: undefined

		return [key, {
			...(route.uri ? { uri: route.uri } : {}),
			...(route.domain ? { domain: route.domain } : {}),
			...(route.wheres ? { wheres: route.wheres } : {}),
			...(route.bindings ? { bindings } : {}),
		}]
	}))

	const definitions = generateDefinitions()
		.replace('__URL__', collection?.url ?? '')
		.replace('__ROUTES__', JSON.stringify(routes).replaceAll('"__key_placeholder__"', 'any'))

	fs.mkdirSync(path.dirname(target), { recursive: true })
	fs.writeFileSync(target, definitions, { encoding: 'utf-8' })
}

function generateDefinitions() {
	return `
// This file has been automatically generated by Hybridly
// Modifications will be discarded
// It is recommended to add it in your .gitignore

declare module 'hybridly/vue' {
	export interface GlobalRouteCollection {
		url: '__URL__'
		routes: __ROUTES__
	}
}

export {}`
}
