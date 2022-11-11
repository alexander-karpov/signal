const path = require('path');

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

const textroomConfig = {
    ...commonConfig,
    entry: './src/textroom.ts',
    target: 'web',
    output: {
        filename: 'textroom.js',
        path: path.resolve(__dirname, 'dist'),
    },
};

module.exports = [textroomConfig];