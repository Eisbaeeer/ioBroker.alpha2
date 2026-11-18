// ioBroker eslint configuration for js files
import config from '@iobroker/eslint-config';

export default [
    ...config,
    {
        ignores: ['.dev-server/', '.vscode/', 'tmp/', 'admin/build', '*.config.mjs', 'node_modules/'],
    },
    {
        files: ['test/**/*.js'],
        languageOptions: {
            globals: {
                describe: 'readonly',
                it: 'readonly',
                before: 'readonly',
                after: 'readonly',
                beforeEach: 'readonly',
                afterEach: 'readonly',
            },
        },
    },
];
