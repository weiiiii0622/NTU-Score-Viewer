const { webpack, DefinePlugin } = require("webpack");
const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");
const srcDir = path.join(__dirname, "..", "src");

const dotenv = require("dotenv");
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const env = process.env;
let { APP_TITLE } = env;
APP_TITLE = JSON.stringify(APP_TITLE ?? "APP_TITLE_PLACEHOLDER");

module.exports = {
   entry: {
      popup: path.join(srcDir, "popup.tsx"),
      // options: path.join(srcDir, "options.tsx"),
      background: path.join(srcDir, "background.tsx"),
      content_script: path.join(srcDir, "content_script.tsx"),
      dialog: path.join(srcDir, "dialog/frame/dialog.tsx"),
      NTUCool: path.join(srcDir, "NTUCool/index.tsx"),
      gradePage: path.join(srcDir, "gradePage.tsx"),
      // content_script_popup: path.join(srcDir, "content_script_popup.tsx"),
   },
   output: {
      path: path.join(__dirname, "../dist/js"),
      filename: "[name].js",
   },
   optimization: {
      splitChunks: {
         name: "vendor",
         chunks(chunk) {
            return chunk.name !== "background";
         },
      },
   },
   module: {
      rules: [
         {
            test: /\.tsx?$/,
            // use: "ts-loader",
            use: "ts-loader",
            exclude: /node_modules/,

         },
         {
            test: /\.css$/i,
            // include: path.resolve(__dirname, "src"),
            use: ["style-loader", "css-loader", "postcss-loader"],
            exclude: /node_modules/,
         },
         {
            test: /\.(?:js|mjs|cjs)$/,
            exclude: /node_modules/,
            use: {
               loader: 'babel-loader',
               options: {
                  presets: [
                     ['@babel/preset-env', { targets: "defaults" }]
                  ]
               }
            }
         },
         { test: /\.png$/, use: 'url-loader?mimetype=image/png' },
         { test: /\.jpg$/, use: 'url-loader?mimetype=image/jpg' },

      ],
   },
   resolve: {
      extensions: [".ts", ".tsx", ".js"],
   },
   plugins: [
      new CopyPlugin({
         patterns: [
            {
               from: ".",
               to: "../",
               context: "public",
            },
         ],
      }),
      new CopyPlugin({
         patterns: [
            {
               from: ".",
               to: "../rules",
               context: "rules",
            },
         ],
      }),
      new DefinePlugin({
         APP_TITLE,
      }),
   ],
   watchOptions: {
      //ignored: /node_modules/,
      poll: true,
   },
};
