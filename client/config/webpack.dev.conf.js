const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const path = require('path');

const views = [
  'Popup',            // 插件主页
  'Options',          // 插件配置
  'NewTab',           // 新标签页
  'MyPanel',          // 
  'DevTools',         // 控制台工具
]

const scripts = views.concat([
  'Content',          // 页面注入
  'BackGround',       // 后台脚本
  'Inject'            // 页面注入
])

module.exports = {
  mode: 'production',
  entry: scripts.reduce((tempObj, item) => {
    tempObj[item.toLowerCase()] = `./src/views/${item}/index.js`;
    return tempObj;
  }, {}),
  output: {
    filename: 'js/[name].js'
  },
  resolve: {
    alias: {
      '@': path.join(__dirname, '..', 'src'),
    }
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        loader: 'babel-loader',
      },
      {
        test: /\.less$/,
        use: [
          {
            loader: 'style-loader',
            options: {
              esModule: false
            }
          },
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
      }
    ]
  },
  plugins: views.map(item => {
    const name = item.toLowerCase();
    return new HtmlWebpackPlugin({
      template: './public/index.html',
      filename: `${name}.html`,
      chunks: [name]
    })
  }).concat([
    new CopyWebpackPlugin({
      patterns: [
        {
          from: './public/manifest.json',
          to: 'manifest.json'
        },
        {
          from: './public/hot-reload.js',
          to: 'js/hot-reload.js'
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
      filename: 'css/[name].css'
    })
  ])
}
