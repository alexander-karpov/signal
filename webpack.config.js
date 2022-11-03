const path = require('path');

module.exports = {
    entry: './src/server.ts',
    mode: 'production', //production development
    output: {
        filename: 'signal.js',
        path: path.resolve(__dirname, 'dist'),
    },
    target: 'node',
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