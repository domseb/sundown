const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');

module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      const minimizers = webpackConfig.optimization.minimizer;
      const cssIndex = minimizers.findIndex(
        (m) => m.constructor.name === 'CssMinimizerPlugin'
      );
      if (cssIndex !== -1) {
        minimizers[cssIndex] = new CssMinimizerPlugin({
          minimizerOptions: {
            preset: ['default', { calc: false }],
          },
        });
      }
      return webpackConfig;
    },
  },
};
