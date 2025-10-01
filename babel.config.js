module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module:react-native-dotenv',
      {
        moduleName: '@env',       // how you import env variables
        path: '.env',             // path to your .env file
        allowUndefined: true,     // don't throw errors if a var is missing
      },
    ],
    'react-native-reanimated/plugin', // <- MUST be last
  ],
};
