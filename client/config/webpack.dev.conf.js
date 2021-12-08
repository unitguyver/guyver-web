const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const path = require('path');
const webpack = require("webpack");

module.exports = {
  mode: 'development',

  devtool: 'inline-source-map',

  entry: "./src/views/NewTab/index.js",

  output: {
    filename: 'index.js'
  },

  devServer: {
    port: "9090",
    open: true
  },

  resolve: {
    alias: {
      assert: false,
      util: false,
      '@': path.join(__dirname, '..', 'src'),
    }
  },

  module: {
    rules: [
      {
        test: /\.js$/,
        loader: 'babel-loader',
        options: {
          plugins: ['@babel/plugin-transform-runtime']
        }
      },
      {
        test: /\.less$/,
        use: [
          MiniCssExtractPlugin.loader,
          {
            loader: 'css-loader'
          },
          {
            loader: 'less-loader',
            options: {
              lessOptions: {
                javascriptEnabled: true,
              }
            }
          }
        ]
      },
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, "css-loader"]
      },
      {
        test: /\.svg$/,
        use: "url-loader"
      }
    ]
  },

  plugins: [
    new webpack.optimize.MinChunkSizePlugin({
      minChunkSize: 10000,
    }),
    new HtmlWebpackPlugin({
      template: './public/index.html',
      filename: `index.html`
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: './public/manifest.json',
          to: 'manifest.json'
        },
        {
          from: './public/js',
          to: 'js'
        },
        {
          from: './src/assets/locales',
          to: '_locales'
        },
        {
          from: './src/assets/img',
          to: 'img'
        },
      ]
    }),
    new MiniCssExtractPlugin({
      filename: 'index.css'
    })
  ]
}
