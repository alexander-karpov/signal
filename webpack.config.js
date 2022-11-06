const path = require('path');
const webpack = require('webpack');

const commonConfig = {
    mode: 'production', //production development
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
        ],
    },
    resolve: {
        extensions: ['.ts', '.js'],
    },
};

const serverConfig = {
    ...commonConfig,
    entry: './src/signal.ts',
    target: 'node',
    output: {
        filename: 'signal.js',
        path: path.resolve(__dirname, 'dist'),
    },
};

const clientConfig = {
    ...commonConfig,
    entry: './src/realtime.ts',
    target: 'web',
    output: {
        filename: 'realtime.js',
        path: path.resolve(__dirname, 'dist'),
    },
    plugins: [
        new webpack.ProvidePlugin({
            process: 'process/browser',
        }),
    ],
};


module.exports = [serverConfig, clientConfig];