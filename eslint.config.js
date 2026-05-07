import xoBrowser from 'eslint-config-xo/browser';
import xoReact from 'eslint-config-xo-react';
import eslintPluginReact from 'eslint-plugin-react';
import tsParser from '@typescript-eslint/parser';

export default [
	{
		ignores: [
			'**/.debris/**',
			'dist/**',
			'build/**',
		],
	},

	...xoBrowser,
	...xoReact,

	// Overrides on top of XO
	{
		plugins: {
			react: eslintPluginReact,
		},
		rules: {
			'arrow-parens': ['off'], // use @stylistic/arrow-parens
			camelcase: 'off',
			'capitalized-comments': 'off',
			complexity: ['warn', {max: 25}],
			curly: ['error', 'multi-line'],
			'max-lines': 'off',
			'max-nested-callbacks': 'off',
			'max-params': 'off',
			'object-shorthand': ['error', 'properties'],
			'padding-line-between-statements': 'off',
			'@stylistic/padding-line-between-statements': 'off',
			'@stylistic/function-paren-newline': ['error', 'consistent'],
			'@stylistic/object-curly-newline': ['error', {consistent: true}],
			'@stylistic/arrow-parens': ['error', 'always'],
			'react/jsx-no-leaked-render': 'off',
			'react/jsx-uses-react': 'error',
			'react/jsx-uses-vars': 'error',
			'react/jsx-fragments': ['error', 'element'],
			'react/react-in-jsx-scope': 'off',
		},
	},

	// TypeScript-specific settings
	{
		files: ['**/*.ts', '**/*.tsx'],
		languageOptions: {
			parser: tsParser,
			parserOptions: {},
		},
		rules: {},
	},

	// Test overrides
	{
		files: ['test/*.ts'],
		rules: {
			'no-unused-expressions': 'off',
		},
	},
];
