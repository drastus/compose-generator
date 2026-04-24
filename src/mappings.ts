import {
	ACUTE,
	BREVE,
	CIRCUMFLEX,
	COMB,
	DASIA,
	DESCENDER,
	DIA,
	DIAERESIS,
	DIALYTIKA,
	GRAVE,
	MB,
	MBF,
	MBI,
	MBS,
	MDS,
	MF,
	MI,
	MM,
	MS,
	MSS,
	MSSB,
	MSSBI,
	MSSI,
	OXIA,
	PERISPOMENI,
	PROSGEGRAMMENI,
	PSILI,
	TONOS,
	VARIA,
	VRACHY,
	YPOGEGRAMMENI,
} from './constants';
import {DiacriticMark, SpecialChar} from './types';

export const scriptsGroups: {label: string; keys: string[]; description: string}[] = [
	{label: 'Modifier letters', keys: ['modifier'], description: 'Spacing modifier letters used for phonetic/diacritic purposes.'},
	{label: 'Combining diacritical marks', keys: ['combining'], description: 'Non-spacing combining marks to modify preceding characters.'},
	{label: 'Latin alphabet', keys: ['latin'], description: 'Basic and extended Latin letters commonly used in European languages.'},
	{label: 'Greek alphabet', keys: ['greek'], description: 'Greek letters including basic forms.'},
	{label: 'Cyrillic alphabet', keys: ['cyrillic'], description: 'Cyrillic letters used by Slavic and other languages.'},
];
export const symbolsGroups: {label: string; keys: string[]; description: string}[] = [
	{label: 'Punctuation', keys: ['punctuation_separators', 'punctuation'], description: 'Common punctuation including separators (space-like) and general marks.'},
	{label: 'Mathematical symbols', keys: ['math_operators', 'math_number', 'math_alphanumeric_symbols'], description: 'Operators and number-related math symbols.'},
	{label: 'Currency', keys: ['currency'], description: 'Currency signs such as €, £, ¥.'},
	{label: 'Miscellaneous', keys: ['misc'], description: 'Various symbols that do not fit other categories.'},
	{label: 'Format', keys: ['format'], description: 'Invisible formatting and control characters.'},
];

export const defaultDiacriticMarks: DiacriticMark[] = [
	{name: 'grave', mark: '`', key: '`'},
	{name: 'acute', mark: '´', key: '\''},
	{name: 'circumflex', mark: '^', key: '>'},
	{name: 'tilde', mark: '~', key: '~'},
	{name: 'diaeresis', mark: '¨', key: ':'},
	{name: 'ring above', mark: '˚', key: '0'},
	{name: 'cedilla', mark: '¸', key: ';'},
	{name: 'stroke', mark: '̷', key: '/'},
	{name: 'ogonek', mark: '˛', key: '6'},
	{name: 'breve', mark: '˘', key: '('},
	{name: 'dot above', mark: '˙', key: '.'},
	{name: 'macron', mark: '¯', key: '-'},
	{name: 'caron', mark: 'ˇ', key: '<'},
	{name: 'dot below', mark: '̣', key: '!'},
	{name: 'hook above', mark: '̉', key: '?'},
	{name: 'hook', mark: '̡', key: '3'},
	{name: 'horn', mark: '̛', key: '9'},
	{name: 'inverted breve', mark: '̑', key: ')'},
	{name: 'double grave', mark: '̏', key: '``'},
	{name: 'double acute', mark: '˝', key: '"'},
	{name: 'comma below', mark: '̦', key: ','},
	{name: 'ypogegrammeni', mark: 'ͅ', key: '_i'},
];
export const defaultDiacriticMarkKeys = defaultDiacriticMarks.map((mark) => mark.key);

export const specialChars: SpecialChar[] = [
	{label: '⎄', name: 'Compose key', keysym: 'Multi_key'},
	{label: '↹', name: 'Tab', keysym: 'tab'},
	{label: '←', name: 'Left arrow', keysym: 'left'},
	{label: '↑', name: 'Up arrow', keysym: 'up'},
	{label: '↓', name: 'Down arrow', keysym: 'down'},
	{label: '→', name: 'Right arrow', keysym: 'right'},
];

export const mapDiacriticParts = (parts: string[]) => (
	parts.map((part) => {
		if (part === DASIA) return 'ogonek';
		if (part === PSILI) return 'horn';
		if (part === DIALYTIKA || part === DIAERESIS) return 'diaeresis';
		if (part === VARIA || part === GRAVE) return 'grave';
		if (part === OXIA || part === TONOS || part === ACUTE) return 'acute';
		if (part === PERISPOMENI || part === CIRCUMFLEX) return 'circumflex';
		if (part === VRACHY || part === BREVE) return 'breve';
		if (part === YPOGEGRAMMENI || part === PROSGEGRAMMENI) return 'ypogegrammeni';
		if (part === DESCENDER) return 'hook';
		return part.toLowerCase().replace('_', ' ');
	})
);

export const scriptPrefixes = {
	[DIA]: 'd',
	[COMB]: '&',
	[MBS]: 's*',
	[MS]: 's',
	[MBF]: 'f*',
	[MF]: 'f',
	[MDS]: 'm2',
	[MSSBI]: 'm0*/',
	[MSSB]: 'm0*',
	[MSSI]: 'm0/',
	[MSS]: 'm0',
	[MBI]: 'm*/',
	[MB]: 'm*',
	[MI]: 'm/',
	[MM]: 'm',
};
