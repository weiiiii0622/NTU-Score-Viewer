const tailwindcss = require("tailwindcss");
module.exports = {
   // plugins: ["postcss-preset-env", require("postcss-nested"), tailwindcss],
   plugins: {
      'postcss-import': {},
      'tailwindcss/nesting': {},
      'tailwindcss': {},
      'postcss-prefix-selector': {
         prefix: '#ntu-grade-viewer--root',
         transform: function (prefix, selector, prefixedSelector, filePath, rule) {
            if (!filePath.includes('NTUCool')) {
               return selector;
            }
            if (selector.startsWith('.ntu-grade-viewer--preflight'))
               return selector;
            // console.log(selector, prefixedSelector);

            return `${prefixedSelector},${selector}`;
         }
      },
      'postcss-preset-env': {
         features: { 'nesting-rules': false },
      },
   }
};
