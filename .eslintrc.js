module.exports = {
    // ...
    extends: ['plugin:vue/essential', 'eslint:recommended', 'prettier'],
    plugins: ['vue', 'prettier'],
    rules: {
      // Vue.js 相关规则
      'vue/no-unused-vars': 'error',
      // 更多规则...
      
      // 启用 Prettier
      'prettier/prettier': 'error',
    },
  };
  