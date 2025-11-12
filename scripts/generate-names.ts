#!/usr/bin/env tsx

// example invocation: npm run generate:names -- --category modifier

import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

type NameEntry = {cp: number; name?: string, end?: string, template?: string[], set?: string, seq?: string};

// Constants from names.ts
const ML = 'MODIFIER LETTER';
const LCL = 'LATIN CAPITAL LETTER';
const LSL = 'LATIN SMALL LETTER';
const GCL = 'GREEK CAPITAL LETTER';
const GSL = 'GREEK SMALL LETTER';
const CCL = 'CYRILLIC CAPITAL LETTER';
const CSL = 'CYRILLIC SMALL LETTER';

// Diacritic patterns for name generation
const LATIN_DIACRITICS = [
	'GRAVE', 'ACUTE', 'CIRCUMFLEX', 'TILDE', 'DIAERESIS', 'RING ABOVE',
	'CEDILLA', 'STROKE', 'OGONEK', 'BREVE', 'DOT ABOVE', 'MACRON',
	'CARON', 'DOT BELOW', 'HOOK ABOVE', 'HOOK', 'HORN', 'INVERTED BREVE',
	'DOUBLE GRAVE', 'DOUBLE ACUTE', 'COMMA BELOW',
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

function loadUnicodeData(unicodePath: string): Map<number, string> {
	const content = fs.readFileSync(unicodePath, 'utf8');
	const map = new Map<number, string>();
	// UnicodeData.txt: semicolon-separated; field 0 = code point (hex), field 1 = name
	for (const line of content.split(/\r?\n/)) {
		if (!line) continue;
		const parts = line.split(';');
		if (parts.length < 2) continue;
		const cpHex = parts[0];
		const name = parts[1];
		const cp = parseInt(cpHex, 16);
		if (Number.isFinite(cp)) {
			map.set(cp, name);
		}
	}
	return map;
}

function escapeTSString(s: string): string {
	return s.replace(/\\/g, "\\\\").replace(/"/g, "\\\"");
}

function main() {
	const __dirname = path.dirname(fileURLToPath(import.meta.url));
	const projectRoot = path.resolve(__dirname, '..');
	const unicodePath = path.join(projectRoot, 'data', 'UnicodeData.txt');

	if (!fs.existsSync(unicodePath)) {
		fail(`UnicodeData.txt not found at ${unicodePath}`);
	}

	const nameMap = loadUnicodeData(unicodePath);

	const categories: Record<string, [number, number][]> = {
		modifier: [
			[0x02B0, 0x02FF]
		],
		combining: [
			[0x0300, 0x036F],
		],
		latin: [
			[0x00C0, 0x00D6],
			[0x00D8, 0x00F6],
			[0x00F8, 0x02AF],
			[0x1E00, 0x1EFF],
		],
		greek: [
			[0x0370, 0x03E1],
			[0x03F0, 0x03FF],
			[0x1F00, 0x1FFF]
		],
		cyrillic: [
			[0x0400, 0x0482],
			[0x048A, 0x052F],
		],
		punctuation: [
			// spaces
			[0x0020, 0x0020],
			[0x00A0, 0x00A0],
			[0x2000, 0x200B],
			[0x202F, 0x202F],
			// dashes
			[0x002D, 0x002D],
			[0x00AD, 0x00AD],
			[0x2010, 0x2015],
			// quotes
			[0x0022, 0x0022],
			[0x0027, 0x0027],
			[0x00AB, 0x00AB],
			[0x00BB, 0x00BB],
			[0x2018, 0x201F],
			[0x2039, 0x203A],
			// other
			[0x0021, 0x0021],
			[0x0023, 0x0026],
			[0x0028, 0x002A],
			[0x002C, 0x002C],
			[0x002E, 0x002F],
			[0x003A, 0x003B],
			[0x003F, 0x0040],
			[0x005B, 0x005F],
			[0x007B, 0x007E],
			[0x00A1, 0x00A1],
			[0x00A6, 0x00A7],
			[0x00A9, 0x00AA],
			[0x00B0, 0x00B0],
			[0x00AE, 0x00AE],
			[0x00B6, 0x00B7],
			[0x00BA, 0x00BA],
			[0x00BF, 0x00BF],
			[0x200C, 0x200F],
			[0x2016, 0x2017],
			[0x2020, 0x202E],
			[0x2030, 0x2038],
			[0x203B, 0x206F],
		],
		math_operators: [
				[0x002B, 0x002B],
				[0x003C, 0x003E],
				[0x00AC, 0x00AC],
				[0x00B1, 0x00B1],
				[0x00D7, 0x00D7],
				[0x00F7, 0x00F7],
				[0x2200, 0x22FF],
				[0x2A00, 0x2AFF],
				[0x2308, 0x230B],
				[0x27C0, 0x27EF],
				[0x2980, 0x29FF],
			],
		math_arrows: [
			[0x2190, 0x21FF],
		],
		math_sub_sup: [
			[0x00B2, 0x00B3],
			[0x00B9, 0x00B9],
			[0x2070, 0x208E],
		],
		math_fractions: [
			[0x00BC, 0x00BE],
			[0x2150, 0x215E],
		],
		currency: [
			[0x0024, 0x0024],
			[0x00A2, 0x00A5],
			[0x20A0, 0x20CF],
		],
		misc: [],
		emoji: [
			[0x2639, 0x263A],
			[0x1F600, 0x1F64F],
		],
	};

	const sets = {
		modifier: {},
		combining: {},
		latin: {
			base: [
				[0x00C0, 0x0131],
				[0x0134, 0x0137],
				[0x0138, 0x013E],
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
			base: [
				[0x0386, 0x0386],
				[0x0388, 0x03CE],
			],
			// ext: [ // polytonic
			// ],
		},
		cyrillic: {},
		punctuation: {},
		math: {},
		currency: {},
		emoji: {},
	}

	function buildEntries(ranges: [number, number][]): {cp: number; name: string}[] {
		const entries: {cp: number; name: string}[] = [];
		for (const [start, end] of ranges) {
			if (!Number.isFinite(start) || !Number.isFinite(end)) continue;
			const s = Math.min(start, end);
			const e = Math.max(start, end);
			for (let cp = s; cp <= e; cp++) {
				const name = nameMap.get(cp);
				if (name) entries.push({ cp, name });
			}
		}
		const dedup: {cp: number; name: string}[] = [];
		let lastCp = -1;
		for (const ent of entries) {
			if (ent.cp !== lastCp) {
				dedup.push(ent);
				lastCp = ent.cp;
			}
		}
		return dedup;
	}

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

	const built: Record<string, {cp: number; name: string}[] | Record<string, {cp: number; name: string}[]>> = {};

	// Process each category
	for (const [category, value] of Object.entries(categories)) {
		if (Array.isArray(value)) {
			// Simple category with direct ranges
			built[category] = buildEntries(value);
		} else if (typeof value === 'object' && value !== null) {
			// Category with subcategories
			const subcategories: Record<string, {cp: number; name: string}[]> = {};
			for (const [subcategory, ranges] of Object.entries(value)) {
				if (Array.isArray(ranges)) {
					subcategories[subcategory] = buildEntries(ranges);
				}
			}
			built[category] = subcategories;
		}
	}

	// Parse optional --category argument
	const args = process.argv.slice(2);
	let categoryArg: string | undefined;
	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (arg === "--category" && i + 1 < args.length) {
			categoryArg = args[i + 1];
			i++;
			continue;
		}
		const m = arg.match(/^--category=(.+)$/);
		if (m) {
			categoryArg = m[1];
		}
	}
	if (categoryArg && !(categoryArg in categories)) {
		fail(`Unknown category: ${categoryArg}. Valid: ${Object.keys(categories).join(", ")}`);
	}
	const keysToOutput = categoryArg ? [categoryArg] : Object.keys(categories);

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

		lines.push(`export const ${key}: NameEntry[] = [`);
		for (const {cp, name} of entries) {
			const cpHex = "0x" + cp.toString(16).toUpperCase().padStart(4, "0");
			const set = getSetForCodePoint(cp, key);

			// Check for Latin letters with diacritics
			const latinCapitalMatch = name.match(new RegExp(`^LATIN CAPITAL LETTER ([A-Z]+) WITH (${LATIN_DIACRITICS_PATTERN})$`));
			const latinSmallMatch = name.match(new RegExp(`^LATIN SMALL LETTER ([A-Z]+) WITH (${LATIN_DIACRITICS_PATTERN})$`));
			// Check for Greek letters with diacritics
			const greekCapitalMatch = name.match(new RegExp(`^GREEK CAPITAL LETTER ([A-Z]+) WITH (${GREEK_DIACRITICS_PATTERN})$`));
			const greekSmallMatch = name.match(new RegExp(`^GREEK SMALL LETTER ([A-Z]+) WITH (${GREEK_DIACRITICS_PATTERN})$`));

			if (latinCapitalMatch) {
				const [, letter, diacritic] = latinCapitalMatch;
				lines.push(`\t{cp: ${cpHex}, template: [LCL, '${letter}', ${diacritic.replace(/ /g, '_')}]${set ? `, set: '${set}'` : ''}},`);
			} else if (latinSmallMatch) {
				const [, letter, diacritic] = latinSmallMatch;
				lines.push(`\t{cp: ${cpHex}, template: [LSL, '${letter}', ${diacritic.replace(/ /g, '_')}]${set ? `, set: '${set}'` : ''}},`);
			} else if (name.startsWith('LATIN CAPITAL LETTER ')) {
				const end = name.substring('LATIN CAPITAL LETTER '.length);
				const endingEsc = escapeTSString(end);
				lines.push(`\t{cp: ${cpHex}, end: "${endingEsc}", template: [LCL]${set ? `, set: '${set}'` : ''}},`);
			} else if (name.startsWith('LATIN SMALL LETTER ')) {
				const end = name.substring('LATIN SMALL LETTER '.length);
				const endingEsc = escapeTSString(end);
				lines.push(`\t{cp: ${cpHex}, end: "${endingEsc}", template: [LSL]${set ? `, set: '${set}'` : ''}},`);
			} else if (greekCapitalMatch) {
				const [, letter, diacritic] = greekCapitalMatch;
				lines.push(`\t{cp: ${cpHex}, template: [GCL, '${letter}', ${diacritic.replace(/ /g, '_')}]${set ? `, set: '${set}'` : ''}},`);
			} else if (greekSmallMatch) {
				const [, letter, diacritic] = greekSmallMatch;
				lines.push(`\t{cp: ${cpHex}, template: [GSL, '${letter}', ${diacritic.replace(/ /g, '_')}]${set ? `, set: '${set}'` : ''}},`);
			} else if (name.startsWith('GREEK CAPITAL LETTER ')) {
				const end = name.substring('GREEK CAPITAL LETTER '.length);
				const endingEsc = escapeTSString(end);
				lines.push(`\t{cp: ${cpHex}, end: "${endingEsc}", template: [GCL]${set ? `, set: '${set}'` : ''}},`);
			} else if (name.startsWith('GREEK SMALL LETTER ')) {
				const end = name.substring('GREEK SMALL LETTER '.length);
				const endingEsc = escapeTSString(end);
				lines.push(`\t{cp: ${cpHex}, end: "${endingEsc}", template: [GSL]${set ? `, set: '${set}'` : ''}},`);
			} else if (name.startsWith('CYRILLIC CAPITAL LETTER ')) {
				const end = name.substring('CYRILLIC CAPITAL LETTER '.length);
				const endingEsc = escapeTSString(end);
				lines.push(`\t{cp: ${cpHex}, end: "${endingEsc}", template: [CCL]${set ? `, set: '${set}'` : ''}},`);
			} else if (name.startsWith('CYRILLIC SMALL LETTER ')) {
				const end = name.substring('CYRILLIC SMALL LETTER '.length);
				const endingEsc = escapeTSString(end);
				lines.push(`\t{cp: ${cpHex}, end: "${endingEsc}", template: [CSL]${set ? `, set: '${set}'` : ''}},`);
			} else if (name.startsWith('MODIFIER LETTER ')) {
				const end = name.substring('MODIFIER LETTER '.length);
				const endingEsc = escapeTSString(end);
				lines.push(`\t{cp: ${cpHex}, end: "${endingEsc}", template: [ML]${set ? `, set: '${set}'` : ''}},`);
			} else {
				const nameEsc = escapeTSString(name);
				lines.push(`\t{cp: ${cpHex}, name: "${nameEsc}"${set ? `, set: '${set}'` : ''}},`);
			}
		}
		lines.push("]\n");
	};

	// Process each requested category
	for (const category of keysToOutput) {
		const categoryData = built[category];
		
		if (Array.isArray(categoryData)) {
			// Simple category with direct entries
			addEntries(category, categoryData);
		} else if (typeof categoryData === 'object' && categoryData !== null) {
			// Category with subcategories
			const subcategoryNames: string[] = [];
			
			// First, export each subcategory as a separate array
			for (const [subcategory, entries] of Object.entries(categoryData)) {
				if (Array.isArray(entries)) {
					const subcategoryName = `${category}_${subcategory}`;
					subcategoryNames.push(subcategoryName);
					addEntries(subcategoryName, entries);
				}
			}
			
			// Create an array that contains all subcategory arrays
			if (subcategoryNames.length > 0) {
				lines.push(`export const ${category}: NameEntry[] = [\n  ${subcategoryNames.flatMap(name => `...${name}`).join(',\n  ')}\n];\n`);
			}
		}
	}

	// Output the generated content
	console.log(lines.join("\n"));
}

main();
