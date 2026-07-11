import {
	ACUTE,
	BREVE,
	CIRCUMFLEX,
	DASIA,
	DESCENDER,
	DIAERESIS,
	DIALYTIKA,
	GRAVE,
	HORN,
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
} from './strings';
import {DiacriticMark, SpecialChar} from '../types';

export type MathFlags = {
	bold?: boolean;
	italic?: boolean;
	sansSerif?: boolean;
	script?: boolean;
	fraktur?: boolean;
	monospace?: boolean;
	doubleStruck?: boolean;
};

export const MATH_FLAGS: Record<string, MathFlags> = {
	[MB]: {bold: true},
	[MI]: {italic: true},
	[MBI]: {bold: true, italic: true},
	[MS]: {script: true},
	[MBS]: {script: true, bold: true},
	[MF]: {fraktur: true},
	[MBF]: {fraktur: true, bold: true},
	[MDS]: {doubleStruck: true},
	[MSS]: {sansSerif: true},
	[MSSB]: {sansSerif: true, bold: true},
	[MSSI]: {sansSerif: true, italic: true},
	[MSSBI]: {sansSerif: true, bold: true, italic: true},
	[MM]: {monospace: true},
};

type MathPrefixes = {
	bold: string;
	italic: string;
	sansSerif: string;
	script: string;
	fraktur: string;
	monospace: string;
	doubleStruck: string;
};

export function composeMathPrefix(math: MathPrefixes, flags: MathFlags): string {
	let base = '';
	if (flags.sansSerif) base = math.sansSerif;
	else if (flags.script) base = math.script;
	else if (flags.fraktur) base = math.fraktur;
	else if (flags.monospace) base = math.monospace;
	else if (flags.doubleStruck) base = math.doubleStruck;

	if (flags.bold) {
		base = base === '' ? math.bold : base + math.bold[math.bold.length - 1];
	}

	if (flags.italic) {
		base = base === '' ? math.italic : base + math.italic[math.italic.length - 1];
	}

	return base;
}

export const scriptsGroups: {label: string; key: string; description: string}[] = [
	{label: 'Modifier letters', key: 'modifier', description: 'Spacing modifier letters used for phonetic/diacritic purposes.'},
	{label: 'Standalone diacritics', key: 'dia', description: 'Free-standing diacritic marks not attached to a base letter, e.g. ¨, ˇ, ˘.'},
	{label: 'Combining diacritical marks', key: 'combining', description: 'Non-spacing combining marks to modify preceding characters.'},
	{label: 'Latin alphabet', key: 'latin', description: 'Basic and extended Latin letters commonly used in European languages.'},
	{label: 'Greek alphabet', key: 'greek', description: 'Greek letters including basic forms.'},
	{label: 'Cyrillic alphabet', key: 'cyrillic', description: 'Cyrillic letters used by Slavic and other languages.'},
];
export const symbolsGroups: {label: string; key: string; description: string}[] = [
	{label: 'Punctuation', key: 'punctuation', description: 'Common punctuation including separators (space-like) and general marks.'},
	{label: 'Numbers', key: 'math_number', description: 'Number-related math symbols including superscripts, subscripts, and number forms.'},
	{label: 'Mathematical operators', key: 'math_operators', description: 'Mathematical operator symbols.'},
	{label: 'Math alphanumeric symbols', key: 'math_alphanumerics', description: 'Mathematical alphanumeric symbols in various styles (bold, italic, script, etc.).'},
	{label: 'Currency', key: 'currency', description: 'Currency signs such as €, £, ¥.'},
	{label: 'Emoji', key: 'emoji', description: 'Emoji and pictographic symbols.'},
	{label: 'Miscellaneous', key: 'misc', description: 'Various symbols that do not fit other categories.'},
	{label: 'Format', key: 'format', description: 'Invisible formatting and control characters.'},
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
	{name: 'hook', mark: '̡', key: '9'},
	{name: 'inverted breve', mark: '̑', key: ')'},
	{name: 'double grave', mark: '̏', key: '2`'},
	{name: 'double acute', mark: '˝', key: '"'},
	{name: 'comma below', mark: '̦', key: ','},
	{name: 'breve below', mark: '̮', key: '_)'},
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
		if (part === HORN) return 'hook';
		if (part === DASIA) return 'ogonek';
		if (part === PSILI) return 'hook'; // prev. mapped to horn
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

export const groupsToUnicodeBlocks = {
	modifier: [
		['Spacing Modifier Letters', [[0x02B0, 0x02FF]]],
		['Modifier Tone Letters', [[0xA700, 0xA71F]]],
		['Phonetic Extensions', [[0x1D00, 0x1D7F]]],
		['Phonetic Extensions Supplement', [[0x1D80, 0x1DBF]]],
	],
	dia: [
		['Basic Latin', [[0x005E, 0x005E], [0x0060, 0x0060], [0x007E, 0x007E]]],
		['Latin-1 Supplement', [[0x00A8, 0x00A8], [0x00AF, 0x00AF], [0x00B4, 0x00B4], [0x00B8, 0x00B8]]],
		['Spacing Modifier Letters', [[0x02B0, 0x02FF]]],
	],
	combining: [
		['Combining Diacritical Marks', [[0x0300, 0x036F]]],
		['Combining Diacritical Marks Extended', [[0x1AB0, 0x1AEB]]],
		['Combining Diacritical Marks Supplement', [[0x1DC0, 0x1DFF]]],
		['Combining Diacritical Marks for Symbols', [[0x20D0, 0x20F0]]],
		['Combining Half Marks', [[0xFE20, 0xFE2F]]],
	],
	latin: [
		['Basic Latin', [[0x0041, 0x005A], [0x0061, 0x007A]]],
		['Latin-1 Supplement', [[0x00C0, 0x00D6], [0x00D8, 0x00F6], [0x00F8, 0x00FF]]],
		['Latin Extended-A', [[0x0100, 0x017F]]],
		['Latin Extended-B', [[0x0180, 0x024F]]],
		['Latin Extended-C', [[0x2C60, 0x2C7F]]],
		['Latin Extended-D', [[0xA720, 0xA7FF]]],
		['Latin Extended-E', [[0xAB30, 0xAB6F]]],
		['Latin Extended-F', [[0x10780, 0x107BF]]],
		['Latin Extended-G', [[0x1DF00, 0x1DFFF]]],
		['Latin Extended Additional', [[0x1E00, 0x1EFF]]],
		['IPA Extensions', [[0x0250, 0x02AF]]],
		['Phonetic Extensions', [[0x1D00, 0x1D7F]]],
		['Phonetic Extensions Supplement', [[0x1D80, 0x1DBF]]],
	],
	greek: [
		['Greek and Coptic', [[0x0370, 0x03E1], [0x03F0, 0x03FF]]],
		['Greek Extended', [[0x1F00, 0x1FFF]]],
		['Ancient Greek Numbers', [[0x10140, 0x1018F]]],
	],
	cyrillic: [
		['Cyrillic', [[0x0400, 0x04FF]]],
		['Cyrillic Supplement', [[0x0500, 0x052F]]],
		['Cyrillic Extended-A', [[0x2DE0, 0x2DFF]]],
		['Cyrillic Extended-B', [[0xA640, 0xA69F]]],
		['Cyrillic Extended-C', [[0x1C80, 0x1C8F]]],
		['Cyrillic Extended-D', [[0x1E030, 0x1E08F]]],
	],
	punctuation: [
		['Basic Latin', [[0x0020, 0x0023], [0x0025, 0x002A], [0x002C, 0x002F], [0x003A, 0x0040], [0x005B, 0x005D], [0x005F, 0x005F], [0x007B, 0x007D]]],
		['Latin-1 Supplement', [[0x0080, 0x00FF]]],
		['General Punctuation', [[0x2000, 0x206F]]],
		['Supplemental Punctuation', [[0x2E00, 0x2E7F]]],
	],
	math_operators: [
		['Arrows', [[0x2190, 0x21FF]]],
		['Mathematical Operators', [[0x2200, 0x22FF]]],
		['Miscellaneous Mathematical Symbols-A', [[0x27C0, 0x27EF]]],
		['Supplemental Arrows-A', [[0x27F0, 0x27FF]]],
		['Supplemental Arrows-B', [[0x2900, 0x297F]]],
		['Miscellaneous Mathematical Symbols-B', [[0x2980, 0x29FF]]],
		['Supplemental Mathematical Operators', [[0x2A00, 0x2AFF]]],
		['Miscellaneous Symbols and Arrows', [[0x2B00, 0x2BFF]]],
	],
	math_number: [
		['Basic Latin', [[0x0000, 0x007F]]],
		['Latin-1 Supplement', [[0x0080, 0x00FF]]],
		['Superscripts and Subscripts', [[0x2070, 0x209F]]],
		['Number Forms', [[0x2150, 0x218F]]],
	],
	math_alphanumerics: [
		['Mathematical Alphanumeric Symbols', [[0x1D400, 0x1D7FF]]],
	],
	currency: [
		['Basic Latin', [[0x0000, 0x007F]]],
		['Latin-1 Supplement', [[0x0080, 0x00FF]]],
		['Currency Symbols', [[0x20A0, 0x20CF]]],
	],
	emoji: [
		['Dingbats', [[0x2700, 0x27BF]]],
		['Emoticons', [[0x1F600, 0x1F64F]]],
		['Miscellaneous Symbols and Pictographs', [[0x1F300, 0x1F5FF]]],
		['Supplemental Symbols and Pictographs', [[0x1F900, 0x1F9FF]]],
		['Transport and Map Symbols', [[0x1F680, 0x1F6FF]]],
		['Symbols and Pictographs Extended-A', [[0x1FA70, 0x1FAFF]]],
	],
	misc: [
		['Letterlike Symbols', [[0x2100, 0x214F]]],
		['Miscellaneous Technical', [[0x2300, 0x23FF]]],
		['Control Pictures', [[0x2400, 0x2429]]],
		['Optical Character Recognition', [[0x2440, 0x244A]]],
		['Enclosed Alphanumerics', [[0x2460, 0x24FF]]],
		['Box Drawing', [[0x2500, 0x257F]]],
		['Block Elements', [[0x2580, 0x259F]]],
		['Geometric Shapes', [[0x25A0, 0x25FF]]],
		['Miscellaneous Symbols', [[0x2600, 0x26FF]]],
		['Braille Patterns', [[0x2800, 0x28FF]]],
		['Miscellaneous Symbols and Arrows', [[0x2B00, 0x2BFF]]],
		['Yijing Hexagram Symbols', [[0x4DC0, 0x4DFF]]],
		['Ancient Symbols', [[0x10190, 0x101A0]]],
		['Tai Xuan Jing Symbols', [[0x1D300, 0x1D35F]]],
		['Mahjong Tiles', [[0x1F000, 0x1F02F]]],
		['Domino Tiles', [[0x1F030, 0x1F09F]]],
		['Playing Cards', [[0x1F0A0, 0x1F0FF]]],
		['Enclosed Alphanumeric Supplement', [[0x1F100, 0x1F1FF]]],
		['Enclosed Ideographic Supplement', [[0x1F200, 0x1F2FF]]],
		['Alchemical Symbols', [[0x1F700, 0x1F77F]]],
		['Geometric Shapes Extended', [[0x1F780, 0x1F7FF]]],
		['Chess Symbols', [[0x1FA00, 0x1FA6F]]],
		['Symbols for Legacy Computing', [[0x1FB00, 0x1FBFF]]],
		['Znamenny Musical Notation', [[0x1CF00, 0x1CFC3]]],
		['Byzantine Musical Symbols', [[0x1D000, 0x1D0F5]]],
		['Musical Symbols', [[0x1D100, 0x1D1EA]]],
		['Ancient Greek Musical Notation', [[0x1D200, 0x1D245]]],
	],
	format: [
		['Basic Latin', [[0x0000, 0x007F]]],
		['Latin-1 Supplement', [[0x0080, 0x00FF]]],
		['General Punctuation', [[0x2000, 0x206F]]],
		['Specials', [[0xFFF0, 0xFFFF]]],
		['Tags', [[0xE0000, 0xE007F]]],
		['Variation Selectors', [[0xFE00, 0xFE0F]]],
		['Variation Selectors Supplement', [[0xE0100, 0xE01EF]]],
	],
};

export const defaultPrefixes = {
	greek: {char: 'g', cased: true},
	cyrillic: {char: 'c', cased: true},
	dia: {char: 'd'},
	comb: {char: '&'},
	currency: {char: '='},
	modifierLetter: {char: 'l'},
	math: {
		bold: 'm*',
		italic: 'm/',
		sansSerif: 'm0',
		script: 'ms',
		fraktur: 'mf',
		monospace: 'm1',
		doubleStruck: 'm2',
	},
};

export const keySymNames: Record<string, string> = {
	' ': 'space',
	'!': 'exclam',
	'"': 'quotedbl',
	'#': 'numbersign',
	$: 'dollar',
	'%': 'percent',
	'&': 'ampersand',
	'\'': 'apostrophe',
	'(': 'parenleft',
	')': 'parenright',
	'*': 'asterisk',
	'+': 'plus',
	',': 'comma',
	'-': 'minus',
	'.': 'period',
	'/': 'slash',
	':': 'colon',
	';': 'semicolon',
	'<': 'less',
	'=': 'equal',
	'>': 'greater',
	'?': 'question',
	'@': 'at',
	'[': 'bracketleft',
	'\\': 'backslash',
	']': 'bracketright',
	'^': 'asciicircum',
	_: 'underscore',
	'`': 'grave',
	'{': 'braceleft',
	'|': 'bar',
	'}': 'braceright',
	'~': 'asciitilde',
};
