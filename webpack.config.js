/* eslint-disable @typescript-eslint/naming-convention */
//@ts-check

'use strict';

const path = require('path');

/**@type {import('webpack').Configuration}*/
const extensionConfig = {
  target: 'node', // VSCode extensions run in a Node.js context
  entry: './src/extension.ts', // Entry point of the extension
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'extension.js',
    libraryTarget: 'commonjs2',
    devtoolModuleFilenameTemplate: '../[resource-path]'
  },
  devtool: 'source-map',
  externals: {
    vscode: 'commonjs vscode', // The vscode-module is created on-the-fly and must be excluded
    bufferutil: 'commonjs bufferutil', // Optional ws dependency
    'utf-8-validate': 'commonjs utf-8-validate' // Optional ws dependency
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: [/node_modules/, /src\/webview\/argocd-application/, /src\/webview\/event-viewer/, /src\/webview\/pod-logs/, /src\/webview\/pod-describe/, /src\/webview\/operator-health-report/],
        use: [
          {
            loader: 'ts-loader'
          }
        ]
      }
    ]
  }
};

/**@type {import('webpack').Configuration}*/
const webviewConfig = {
  target: 'web', // Webview runs in a browser context
  entry: './media/cluster-manager/index.tsx',
  output: {
    path: path.resolve(__dirname, 'dist', 'media', 'cluster-manager'),
    filename: 'index.js',
    devtoolModuleFilenameTemplate: '../[resource-path]'
  },
  devtool: 'source-map',
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx']
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'babel-loader',
            options: {
              presets: [
                ['@babel/preset-env', { targets: 'defaults' }],
                ['@babel/preset-react', { runtime: 'automatic' }],
                '@babel/preset-typescript'
              ]
            }
          }
        ]
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  }
};

/**@type {import('webpack').Configuration}*/
const podDescribeConfig = {
  target: 'web', // Webview runs in a browser context
  entry: './src/webview/pod-describe/index.tsx',
  output: {
    path: path.resolve(__dirname, 'dist', 'media', 'pod-describe'),
    filename: 'index.js',
    devtoolModuleFilenameTemplate: '../[resource-path]'
  },
  devtool: 'source-map',
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx']
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'babel-loader',
            options: {
              presets: [
                ['@babel/preset-env', { targets: 'defaults' }],
                ['@babel/preset-react', { runtime: 'automatic' }],
                '@babel/preset-typescript'
              ]
            }
          }
        ]
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  }
};

module.exports = [extensionConfig, webviewConfig, podDescribeConfig];



