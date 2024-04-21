const { merge } = require("webpack-merge");
const common = require("./webpack.common.js");
const { DefinePlugin } = require("webpack");

module.exports = merge(common, {
    // mode: "production",
    // plugins: [new DefinePlugin({ APP_URL: JSON.stringify(`http://${HOST_DEV}:${PORT_DEV}`) })],
    plugins: [new DefinePlugin({ APP_URL: JSON.stringify(process.env.APP_URL) })],
    devtool: 'source-map'
});
