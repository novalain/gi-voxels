const webpack = require('webpack');
const Uglify = require('uglifyjs-webpack-plugin');
const env = require('yargs').argv.env;

let libraryName = 'gi';
let outputFile;

const pkg = require('./package.json');
const plugins = [];

plugins.push(new webpack.DefinePlugin({
    __LIBRARY__: JSON.stringify(`${libraryName}`),
    __VERSION__: JSON.stringify(pkg.version),
    __ENV__: JSON.stringify(env),
}));

if (env === 'build') {
    plugins.push(new Uglify());
    outputFile = libraryName + '.min.js';
} else {
    outputFile = libraryName + '.js';
}

const config = {
    entry: __dirname + '/src/index.js',
    devtool: 'source-map',
    output: {
        path: __dirname + '/dist',
        filename: outputFile,
        library: libraryName,
        libraryTarget: 'umd',
        umdNamedDefine: true,
        publicPath: '/dist/',
    },
    resolve: {
        // modules: [__dirname + './src'],
        extensions: ['.js'],
    },
    plugins: plugins,
};

module.exports = config;
