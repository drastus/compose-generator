#!/usr/bin/env tsx

// example invocation: npm run generate:names -- --category modifier

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {fileURLToPath} from 'node:url';
import {parse} from 'csv-parse/sync';

// Diacritic patterns for name generation
const LATIN_DIACRITICS = [
	'GRAVE',
	'ACUTE',
	'CIRCUMFLEX',
	'TILDE',
	'DIAERESIS',
	'RING ABOVE',
	'CEDILLA',
	'STROKE',
	'OGONEK',
	'BREVE',
	'DOT ABOVE',
	'MACRON',
	'CARON',
	'DOT BELOW',
	'HOOK ABOVE',
	'HOOK',
	'HORN',
	'INVERTED BREVE',
	'DOUBLE GRAVE',
	'DOUBLE ACUTE',
	'COMMA BELOW',
];
const LATIN_DIACRITICS_PATTERN = LATIN_DIACRITICS.join('|');

const GREEK_DIACRITICS = [
	'TONOS', 'DIALYTIKA', 'PSILI', 'DASIA',
];
const GREEK_DIACRITICS_PATTERN = GREEK_DIACRITICS.join('|');

function fail(msg: string): never {
	console.error(msg);
	process.exit(1);
}

function loadUnicodeData(unicodePath: string): Map<number, {name: string; cat: string}> {
	const content = fs.readFileSync(unicodePath, 'utf8');
	const map = new Map<number, {name: string; cat: string}>();
	// UnicodeData.txt: semicolon-separated; field 0 = code point (hex), field 1 = name, field 2 = general category
	for (const line of content.split(/\r?\n/)) {
		if (!line) continue;
		const parts = line.split(';');
		if (parts.length < 3) continue;
		const cpHex = parts[0];
		const name = parts[1];
		const cat = parts[2];
		const cp = parseInt(cpHex, 16);
		if (Number.isFinite(cp)) {
			map.set(cp, {name, cat});
		}
	}
	return map;
}

function loadSequences(sequencesPath: string): Map<number, string> {
	const content = fs.readFileSync(sequencesPath, 'utf8');
	const records = parse(content, {
		delimiter: '\t',
		columns: false,
		skip_empty_lines: true,
		quote: false,
	});

	const sequences = new Map<number, string>();
	for (const [cpHex, , seq] of records) {
		if (!cpHex) continue;
		const cp = parseInt(cpHex.substring(2), 16);
		if (seq) {
			sequences.set(cp, seq);
		}
	}
	return sequences;
}

function escapeTSString(s: string): string {
	return s.replace(/\\/g, '\\\\').replace(/'/g, '\\\'');
}

type BlockRange = {start: number; end: number; name: string};

function loadBlocks(blocksPath: string): BlockRange[] {
	const content = fs.readFileSync(blocksPath, 'utf8');
	const ranges: BlockRange[] = [];
	for (const line of content.split(/\r?\n/)) {
		if (!line || line.startsWith('#')) continue;
		const m = line.match(/^([0-9A-Fa-f]{4,6})(?:\.\.([0-9A-Fa-f]{4,6}))?;\s*(.+)$/);
		if (!m) continue;
		const start = parseInt(m[1], 16);
		const end = m[2] ? parseInt(m[2], 16) : start;
		const name = m[3].trim();
		ranges.push({start, end, name});
	}
	return ranges;
}

const ALLOWED_BLOCKS = new Set<string>([
	'Basic Latin',
	'Latin-1 Supplement',
	'Latin Extended-A',
	'Latin Extended-B',
	'IPA Extensions',
	'Spacing Modifier Letters',
	'Combining Diacritical Marks',
	'Greek and Coptic',
	'Cyrillic',
	'Cyrillic Supplement',
	'Combining Diacritical Marks Supplement',
	'Latin Extended Additional',
	'Greek Extended',
	'General Punctuation',
	'Superscripts and Subscripts',
	'Currency Symbols',
	'Combining Diacritical Marks for Symbols',
	'Letterlike Symbols',
	'Number Forms',
	'Arrows',
	'Mathematical Operators',
	'Miscellaneous Technical',
	'Geometric Shapes',
	'Miscellaneous Symbols',
	'Dingbats',
	'Miscellaneous Mathematical Symbols-A',
	'Supplemental Arrows-A',
	'Supplemental Arrows-B',
	'Miscellaneous Mathematical Symbols-B',
	'Supplemental Mathematical Operators',
	'Miscellaneous Symbols and Arrows',
	'Miscellaneous Symbols and Pictographs',
	'Emoticons',
	'Transport and Map Symbols',
]);

function classify(blockName: string, generalCat: string): string | undefined {
	// Letters
	if (generalCat === 'Lu' || generalCat === 'Ll' || generalCat === 'Lt' || generalCat === 'Lo') {
		if (blockName === 'Greek and Coptic' || blockName === 'Greek Extended') return 'greek';
		if (blockName === 'Cyrillic' || blockName === 'Cyrillic Supplement') return 'cyrillic';
		return 'latin';
	}
	// Modifier
	if (generalCat === 'Lm' || generalCat === 'Sk') return 'modifier';
	// Combining marks
	if (generalCat === 'Mn' || generalCat === 'Mc' || generalCat === 'Me') return 'combining';
	// Numbers
	if (generalCat === 'Nd' || generalCat === 'Nl' || generalCat === 'No') return 'math_number';
	// Punctuation
	if (generalCat.startsWith('P')) return 'punctuation';
	// Math operators
	if (generalCat === 'Sm') return 'math_operators';
	// Currency
	if (generalCat === 'Sc') return 'currency';
	// Symbols other
	if (generalCat === 'So') return 'misc';
	// Separators (spaces etc.)
	if (generalCat.startsWith('Z')) return 'punctuation_separators';
	// Format
	if (generalCat === 'Cf') return 'format';
	return undefined;
}

const sets = {
	modifier: {
		base: [
			[0x00A8, 0x00B8],
			[0x02B9, 0x02BC],
			[0x02C7, 0x02C7],
			[0x02D8, 0x02DD],
		],
	},
	combining: {
		base: [
			[0x0300, 0x0304],
			[0x0306, 0x030C],
			[0x030F, 0x030F],
			[0x0311, 0x0311],
			[0x0323, 0x0323],
			[0x0326, 0x0328],
		],
	},
	latin: {
		base: [
			[0x00AA, 0x00AA], // feminine ordinal indicator
			[0x00BA, 0x0131], // masculine ordinal indicator, …
			[0x0134, 0x0137],
			[0x0139, 0x013E],
			[0x0141, 0x0148],
			[0x014A, 0x017F],
			[0x0178, 0x0178], // Schwa
			[0x0259, 0x0259], // schwa
			[0x1E9E, 0x1E9E], // sharp S
		],
		ext: [
			[0x0180, 0x0181],
			[0x0187, 0x0188],
			[0x018A, 0x018A],
			[0x0191, 0x0193],
			[0x0197, 0x0199],
			[0x01A0, 0x01A1],
			[0x01A4, 0x01A5],
			[0x01A9, 0x01A9], // Esh
			[0x01AC, 0x01AD],
			[0x01AF, 0x01B0],
			[0x01B2, 0x01B7], // …, Ezh
			[0x01CD, 0x01D4],
			[0x01E4, 0x01EB],
			[0x01F0, 0x01F0],
			[0x01F4, 0x01F5],
			[0x01F8, 0x01F9],
			[0x0200, 0x021B],
			[0x021E, 0x021F],
			[0x0224, 0x0229],
			[0x022E, 0x022F],
			[0x0232, 0x0233],
			[0x0237, 0x0237],
			[0x023A, 0x023C],
			[0x0243, 0x0243],
			[0x0246, 0x0249],
			[0x024C, 0x024F],
			[0x0253, 0x0253],
			[0x0257, 0x0257],
			[0x0260, 0x0260],
			[0x0266, 0x0266],
			[0x0271, 0x0271],
			[0x0282, 0x0283], // …, esh
			[0x028B, 0x028B],
			[0x0292, 0x0292], // ezh
			[0x02A0, 0x02A0],
			[0x1E02, 0x1E05],
			[0x1E0A, 0x1E0D],
			[0x1E10, 0x1E11],
			[0x1E1E, 0x1E29],
			[0x1E30, 0x1E33],
			[0x1E36, 0x1E37],
			[0x1E3E, 0x1E47],
			[0x1E54, 0x1E5B],
			[0x1E60, 0x1E63],
			[0x1E6A, 0x1E6D],
			[0x1E7C, 0x1E93],
			[0x1E97, 0x1E99],
			[0x1EA0, 0x1EA3],
			[0x1EB8, 0x1EBD],
			[0x1EC8, 0x1ECF],
			[0x1EE4, 0x1EE7],
			[0x1EF2, 0x1EF9],
		],
		historic: [
			[0x0138, 0x0138], // kra
			[0x01BF, 0x01BF], // wynn
			[0x01F6, 0x01F7], // Hwair, Wynn
			[0x021C, 0x021D], // Yogh, yogh
		],
	},
	greek: {
		basic: [
			[0x0391, 0x03A9],
			[0x03B1, 0x03C1],
			[0x03C3, 0x03C9],
		],
		base: [
			[0x0386, 0x0390],
			[0x03AA, 0x03B0],
			[0x03C2, 0x03C2], // final sigma
			[0x03CA, 0x03CE],
		],
		historic: [ // polytonic
		],
		// archaic: [],
	},
	cyrillic: {
		base: [
			[0x0400, 0x045F],
		],
	},
	punctuation_separators: {
		base: [
			[0x00A0, 0x00A0],
		],
	},
	punctuation: {
		base: [
			[0x00A1, 0x00BF],
			[0x2010, 0x2014],
			[0x2018, 0x2022],
			[0x2026, 0x2030],
			[0x2032, 0x2033],
			[0x2039, 0x203A],
		],
	},
	math_operators: {
		base: [
			[0x00AC, 0x00F7],
			[0x2044, 0x2044], // fraction slash
			[0x2190, 0x2194],
			[0x21A6, 0x21A6],
			[0x2200, 0x2200], // for all
			[0x2202, 0x2209],
			[0x220E, 0x220F],
			[0x2211, 0x2213],
			[0x2215, 0x2216],
			[0x221A, 0x221B],
			[0x221E, 0x221E], // infinity
			[0x2223, 0x2235],
			[0x2248, 0x2248], // almost equal to
			[0x2260, 0x2262],
			[0x2264, 0x2265],
			[0x2282, 0x2289],
			[0x22A2, 0x22A8],
			[0x22C0, 0x22C3],
		],
	},
	math_number: {
		base: [
			[0x00B2, 0x215E],
		],
	},
	currency: {
		base: [
			[0x00A2, 0x00A5],
			[0x20AC, 0x20AC], // euro sign
			[0x20BF, 0x20BF], // bitcoin sign
		],
	},
	misc: {
		base: [
			[0x00A6, 0x00B0],
			[0x2116, 0x2116], // number sign
			[0x2122, 0x2122], // trade mark sign
		],
	},
	format: {
		base: [
			[0x00AD, 0x200D],
		],
	},
};

function getSetForCodePoint(cp: number, category: string): string | undefined {
	const categorySets = sets[category as keyof typeof sets];
	if (categorySets && typeof categorySets === 'object') {
		for (const [setName, ranges] of Object.entries(categorySets)) {
			if (Array.isArray(ranges) && ranges.some(([start, end]) => cp >= start && cp <= end)) {
				return setName;
			}
		}
	}
}

function main() {
	const __dirname = path.dirname(fileURLToPath(import.meta.url));
	const projectRoot = path.resolve(__dirname, '..');
	const unicodePath = path.join(projectRoot, 'data', 'UnicodeData.txt');
	const blocksPath = path.join(projectRoot, 'data', 'Blocks.txt');
	const sequencesPath = path.join(__dirname, 'sequences.csv');

	if (!fs.existsSync(unicodePath)) {
		fail(`UnicodeData.txt not found at ${unicodePath}`);
	}
	if (!fs.existsSync(blocksPath)) {
		fail(`Blocks.txt not found at ${blocksPath}`);
	}
	if (!fs.existsSync(sequencesPath)) {
		fail(`sequences.csv not found at ${sequencesPath}`);
	}

	const nameMap = loadUnicodeData(unicodePath);
	const blockRanges = loadBlocks(blocksPath).filter((b) => ALLOWED_BLOCKS.has(b.name));
	const sequences = loadSequences(sequencesPath);

	// We'll accumulate entries by the new categories.
	const built: Record<string, {cp: number; name: string}[]> = {};

	for (const {start, end, name: blockName} of blockRanges) {
		for (let cp = start; cp <= end; cp++) {
			const info = nameMap.get(cp);
			if (!info) continue;
			const category = classify(blockName, info.cat);
			if (!category) continue;
			(built[category] ||= []).push({cp, name: info.name});
		}
	}

	// function buildEntries(ranges: [number, number][]): {cp: number; name: string}[] {
	// 	const entries: {cp: number; name: string}[] = [];
	// 	for (const [start, end] of ranges) {
	// 		if (!Number.isFinite(start) || !Number.isFinite(end)) continue;
	// 		const s = Math.min(start, end);
	// 		const e = Math.max(start, end);
	// 		for (let cp = s; cp <= e; cp++) {
	// 			const info = nameMap.get(cp);
	// 			if (info) entries.push({cp, name: info.name});
	// 		}
	// 	}
	// 	const dedup: {cp: number; name: string}[] = [];
	// 	let lastCp = -1;
	// 	for (const ent of entries) {
	// 		if (ent.cp !== lastCp) {
	// 			dedup.push(ent);
	// 			lastCp = ent.cp;
	// 		}
	// 	}
	// 	return dedup;
	// }

	// Parse optional --category argument
	const args = process.argv.slice(2);
	let categoryArg: string | undefined;
	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (arg === '--category' && i + 1 < args.length) {
			categoryArg = args[i + 1];
			i++;
			continue;
		}
		const m = arg.match(/^--category=(.+)$/);
		if (m) {
			categoryArg = m[1];
		}
	}
	const validCategories = Object.keys(built).sort();
	if (categoryArg && !validCategories.includes(categoryArg)) {
		fail(`Unknown category: ${categoryArg}. Valid: ${validCategories.join(', ')}`);
	}
	const keysToOutput = categoryArg ? [categoryArg] : validCategories;

	// Generate TypeScript content with separate arrays per category and subcategory
	const lines: string[] = [];

	// Add header and type definition
	lines.push('// This file is auto-generated by scripts/generate-names.ts');
	lines.push('// Do not edit this file directly.\n');
	lines.push('export type NameEntry = {cp: number; name?: string, end?: string, template?: string[], set?: string, seq?: string};\n');

	// Add constants
	lines.push('// Constants');
	const constants = [...LATIN_DIACRITICS, ...GREEK_DIACRITICS];

	for (const c of constants) {
		lines.push(`const ${c.replace(/ /g, '_')} = '${c}';`);
	}

	lines.push('');
	lines.push('const ML = \'MODIFIER LETTER\';');
	lines.push('const LCL = \'LATIN CAPITAL LETTER\';');
	lines.push('const LSL = \'LATIN SMALL LETTER\';');
	lines.push('const GCL = \'GREEK CAPITAL LETTER\';');
	lines.push('const GSL = \'GREEK SMALL LETTER\';');
	lines.push('const CCL = \'CYRILLIC CAPITAL LETTER\';');
	lines.push('const CSL = \'CYRILLIC SMALL LETTER\';\n');

	// Helper function to add entries for a single array of code points
	const addEntries = (key: string, entries: {cp: number; name: string}[]) => {
		if (entries.length === 0) return;

		lines.push(`const ${key}: NameEntry[] = [`);
		for (const {cp, name} of entries) {
			const cpHex = '0x' + cp.toString(16).toUpperCase().padStart(4, '0');
			const set = getSetForCodePoint(cp, key);
			const seq = sequences.get(cp);
			const seqPart = seq ? `, seq: '${escapeTSString(seq)}'` : '';

			// Check for Latin letters with diacritics
			const latinCapitalMatch = name.match(new RegExp(`^LATIN CAPITAL LETTER ([A-Z]+) WITH (${LATIN_DIACRITICS_PATTERN})$`));
			const latinSmallMatch = name.match(new RegExp(`^LATIN SMALL LETTER ([A-Z]+) WITH (${LATIN_DIACRITICS_PATTERN})$`));
			// Check for Greek letters with diacritics
			const greekCapitalMatch = name.match(new RegExp(`^GREEK CAPITAL LETTER ([A-Z]+) WITH (${GREEK_DIACRITICS_PATTERN})$`));
			const greekSmallMatch = name.match(new RegExp(`^GREEK SMALL LETTER ([A-Z]+) WITH (${GREEK_DIACRITICS_PATTERN})$`));

			if (latinCapitalMatch) {
				const [, letter, diacritic] = latinCapitalMatch;
				lines.push(`\t{cp: ${cpHex}, template: [LCL, '${letter}', ${diacritic.replace(/ /g, '_')}]${set ? `, set: '${set}'` : ''}${seqPart}},`);
			} else if (latinSmallMatch) {
				const [, letter, diacritic] = latinSmallMatch;
				lines.push(`\t{cp: ${cpHex}, template: [LSL, '${letter}', ${diacritic.replace(/ /g, '_')}]${set ? `, set: '${set}'` : ''}${seqPart}},`);
			} else if (name.startsWith('LATIN CAPITAL LETTER ')) {
				const end = name.substring('LATIN CAPITAL LETTER '.length);
				const endingEsc = escapeTSString(end);
				lines.push(`\t{cp: ${cpHex}, end: '${endingEsc}', template: [LCL]${set ? `, set: '${set}'` : ''}${seqPart}},`);
			} else if (name.startsWith('LATIN SMALL LETTER ')) {
				const end = name.substring('LATIN SMALL LETTER '.length);
				const endingEsc = escapeTSString(end);
				lines.push(`\t{cp: ${cpHex}, end: '${endingEsc}', template: [LSL]${set ? `, set: '${set}'` : ''}${seqPart}},`);
			} else if (greekCapitalMatch) {
				const [, letter, diacritic] = greekCapitalMatch;
				lines.push(`\t{cp: ${cpHex}, template: [GCL, '${letter}', ${diacritic.replace(/ /g, '_')}]${set ? `, set: '${set}'` : ''}${seqPart}},`);
			} else if (greekSmallMatch) {
				const [, letter, diacritic] = greekSmallMatch;
				lines.push(`\t{cp: ${cpHex}, template: [GSL, '${letter}', ${diacritic.replace(/ /g, '_')}]${set ? `, set: '${set}'` : ''}${seqPart}},`);
			} else if (name.startsWith('GREEK CAPITAL LETTER ')) {
				const end = name.substring('GREEK CAPITAL LETTER '.length);
				const endingEsc = escapeTSString(end);
				lines.push(`\t{cp: ${cpHex}, end: '${endingEsc}', template: [GCL]${set ? `, set: '${set}'` : ''}${seqPart}},`);
			} else if (name.startsWith('GREEK SMALL LETTER ')) {
				const end = name.substring('GREEK SMALL LETTER '.length);
				const endingEsc = escapeTSString(end);
				lines.push(`\t{cp: ${cpHex}, end: '${endingEsc}', template: [GSL]${set ? `, set: '${set}'` : ''}${seqPart}},`);
			} else if (name.startsWith('CYRILLIC CAPITAL LETTER ')) {
				const end = name.substring('CYRILLIC CAPITAL LETTER '.length);
				const endingEsc = escapeTSString(end);
				lines.push(`\t{cp: ${cpHex}, end: '${endingEsc}', template: [CCL]${set ? `, set: '${set}'` : ''}${seqPart}},`);
			} else if (name.startsWith('CYRILLIC SMALL LETTER ')) {
				const end = name.substring('CYRILLIC SMALL LETTER '.length);
				const endingEsc = escapeTSString(end);
				lines.push(`\t{cp: ${cpHex}, end: '${endingEsc}', template: [CSL]${set ? `, set: '${set}'` : ''}${seqPart}},`);
			} else if (name.startsWith('MODIFIER LETTER ')) {
				const end = name.substring('MODIFIER LETTER '.length);
				const endingEsc = escapeTSString(end);
				lines.push(`\t{cp: ${cpHex}, end: '${endingEsc}', template: [ML]${set ? `, set: '${set}'` : ''}${seqPart}},`);
			} else {
				const nameEsc = escapeTSString(name);
				lines.push(`\t{cp: ${cpHex}, name: '${nameEsc}'${set ? `, set: '${set}'` : ''}${seqPart}},`);
			}
		}
		lines.push('];\n');
	};

	// Process each requested category
	for (const category of keysToOutput) {
		const categoryData = built[category];

		if (Array.isArray(categoryData)) {
			addEntries(category, categoryData);
		}
	}

	lines.push(`export const characters: Record<string, NameEntry[]> = {${Object.keys(built).join(', ')}};\n`);

	// Output the generated content
	console.log(lines.join('\n'));
}

main();
