// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require("path");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const webpack = require("webpack");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const TerserPlugin = require("terser-webpack-plugin");

module.exports = {
	entry: "./src/main.ts",
	target: "web",
	stats: {
		children: true,
	},
	output: {
		filename: "main.js",
		path: __dirname,
		libraryTarget: "commonjs",
	},
	plugins: [],
	module: {
		rules: [
			{
				test: /\.worker\.ts$/,
				loader: "worker-loader",
				options: {
					inline: "no-fallback",
				},
			},
			{
				test: /\.tsx?$/,
				use: "ts-loader",
				exclude: /node_modules/,
			},
		],
	},
	resolve: {
		extensions: [".tsx", ".ts", ".js"],
		mainFields: ["browser", "module", "main"],
		fallback: {
			// assert: require.resolve("assert"),
			buffer: require.resolve("buffer/"),
			// console: require.resolve("console-browserify"),
			// constants: require.resolve("constants-browserify"),
			crypto: require.resolve("crypto-browserify"),
			// crypto: false,
			// domain: require.resolve("domain-browser"),
			// events: require.resolve("events"),
			// fs: false,
			// http: require.resolve("stream-http"),
			// https: require.resolve("https-browserify"),
			// net: false,
			// os: require.resolve("os-browserify/browser"),
			// path: false,
			// path: require.resolve("path-browserify"),
			// punycode: require.resolve("punycode"),
			// process: require.resolve("process/browser"),
			// querystring: require.resolve("querystring-es3"),
			// stream: false,
			stream: require.resolve("stream-browserify"),
			// string_decoder: require.resolve("string_decoder"),
			// sys: require.resolve("util"),
			// timers: require.resolve("timers-browserify"),
			// tls: false,
			// tty: require.resolve("tty-browserify"),
			// url: require.resolve("url/"),
			// util: require.resolve("util"),
			// vm: require.resolve("vm-browserify"),
			// zlib: require.resolve("browserify-zlib"),
		},
	},
	externals: {
		obsidian: "commonjs2 obsidian",
	},
	optimization: {
		minimize: true,
		minimizer: [new TerserPlugin({ extractComments: false })],
	},
};
