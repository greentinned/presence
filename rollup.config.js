import svelte from 'rollup-plugin-svelte';
import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import livereload from 'rollup-plugin-livereload';
import { terser } from 'rollup-plugin-terser';
import css from 'rollup-plugin-css-only';
import url from 'postcss-url';
import postcss from 'rollup-plugin-postcss';
import fs from 'fs';
import path from 'path';

const production = !process.env.ROLLUP_WATCH;

function serve() {
	let server;

	function toExit() {
		if (server) server.kill(0);
	}

	return {
		writeBundle() {
			if (server) return;
			server = require('child_process').spawn('npm', ['run', 'start', '--', '--dev'], {
				stdio: ['ignore', 'inherit', 'inherit'],
				shell: true
			});

			process.on('SIGTERM', toExit);
			process.on('exit', toExit);
		}
	};
}

function inlineSvelte(template, dest) {
    return {
        name: 'Svelte Inliner',
        generateBundle(opts, bundle) {
            const file = path.parse(opts.file).base
            const code = bundle[file].code
            const output = fs.readFileSync(template, 'utf-8')
            bundle[file].code = output.replace('%%script%%', code)
        }
    }
}

export default {
	input: 'src/main.js',
	output: {
		// sourcemap: true,
		format: 'iife',
		// file: 'public/build/bundle.js',
        file: './public/index.html',
        name: 'app',
	},
	plugins: [
		svelte({
            emitCss: false,
			compilerOptions: {
				dev: !production
			}
		}),
		// css({ output: 'bundle.css' }),
        postcss({
            plugins: [
                url({
                    url: "inline", // enable inline assets using base64 encoding
                    maxSize: 10, // maximum file size to inline (in kilobytes)
                    fallback: "copy", // fallback method to use if max size is exceeded
                }),
            ],
        }),
		resolve({
			browser: true,
			dedupe: ['svelte']
		}),
		commonjs(),

		// In dev mode, call `npm run start` once
		// the bundle has been generated
		!production && serve(),

		// Watch the `public` directory and refresh the
		// browser on changes when not in production
		!production && livereload('public'),

		// If we're building for production (npm run build
		// instead of npm run dev), minify
		production && terser(),

        // Inline css and js into html file
        inlineSvelte('./src/template.html'),
	],
	watch: {
		clearScreen: false
	}
};
