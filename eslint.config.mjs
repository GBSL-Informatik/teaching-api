import { defineConfig } from 'eslint/config';
import prettier from 'eslint-plugin-prettier';
import typescriptEslint from '@typescript-eslint/eslint-plugin';
import globals from 'globals';
import tsParser from '@typescript-eslint/parser';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import js from '@eslint/js';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default defineConfig([
    {
        extends: compat.extends('prettier'),

        plugins: {
            prettier,
            '@typescript-eslint': typescriptEslint
        },

        languageOptions: {
            globals: {
                ...globals.node
            },

            parser: tsParser,
            ecmaVersion: 'latest',
            sourceType: 'module'
        },

        rules: {
            'prettier/prettier': [
                'error',
                {
                    arrowParens: 'always',
                    bracketSpacing: true,
                    bracketSameLine: false,
                    printWidth: 110,
                    proseWrap: 'never',
                    singleQuote: true,
                    trailingComma: 'none',
                    tabWidth: 4
                }
            ]
        }
    }
]);
