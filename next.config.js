// next.config.js
const CopyWebpackPlugin = require("copy-webpack-plugin");
const path = require("path");

module.exports = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.plugins.push(
        new CopyWebpackPlugin({
          patterns: [
            {
              from: path.resolve(__dirname, "data"), // source
              to: path.resolve(__dirname, ".next/static/data"), // destination
            },
          ],
        })
      );
    }
    return config;
  },
};

