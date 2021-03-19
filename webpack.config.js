const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = (env, argv) => ({
  entry: {
    index: './example/index.js'
  },
  output: {
    path: `${__dirname}/docs`,
    publicPath: "/assets/",
    publicPath: argv.mode === 'production' ? './' : '/'
  },
  devServer: {
    //host: '192.168.5.129',
    host: 'localhost',
    contentBase: './example'
  },
  module: {
    rules: [
      {
        test: /\.(js|fs|vs)$/,
        exclude: /node_modules/,
        use: ['babel-loader']
      },
            {
         test: /\.(png|svg|jpg|gif)$/,
         use: [
           'file-loader',
         ],
       },
    ]
  },
  resolve: {
    extensions: ['*', '.js', '.fs', '.vs']
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: 'example/index.html',
      filename: 'index.html',
      chunks: ['index']
    }),
  ]
});
