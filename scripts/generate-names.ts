#!/usr/bin/env tsx

// invocation: npm run generate:names

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {fileURLToPath} from 'node:url';
import {parse} from 'csv-parse/sync';
import {DIGIT_NAMES} from '../src/constants/strings';
import {ALLOWED_BLOCKS, CORE_BLOCKS, CORE_CATEGORIES} from '../src/constants/lists';
import {blockToGroup} from '../src/utils/blockToGroup';
import classify, {scatteredMathematicalAlphanumericSymbols} from '../src/utils/classify';

const DIGIT_NAMES_VALUES = Object.fromEntries(Object.entries(DIGIT_NAMES).map(([k, v]) => [v, k]));

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
	'BREVE BELOW',
];
const LATIN_DIACRITICS_PATTERN = LATIN_DIACRITICS.join('|');

const GREEK_DIACRITICS = [
	'TONOS',
	'DIALYTIKA',
	'PSILI',
	'DASIA',
	'VARIA',
	'OXIA',
	'PERISPOMENI',
	'YPOGEGRAMMENI',
	'PROSGEGRAMMENI',
	'VRACHY',
	'MACRON',
];
const GREEK_DIACRITICS_PATTERN = GREEK_DIACRITICS.join('|');

const CYRILLIC_DIACRITICS = [
	'DESCENDER',
	'DIAERESIS',
	'GRAVE',
	'MACRON',
	'STROKE',
];
const CYRILLIC_DIACRITICS_PATTERN = CYRILLIC_DIACRITICS.join('|');

// Diacritics that only occur as standalone combining marks (no LATIN/GREEK/CYRILLIC LETTER WITH … form)
const ADDITIONAL_DIACRITICS = [
	'COMMA ABOVE',
	'MACRON BELOW',
];
const ADDITIONAL_DIACRITICS_PATTERN = ADDITIONAL_DIACRITICS.join('|');

// Dotless I and J are treated as letters with dot above for grouping and sequence purposes
const dotlessLetterOverrides = new Map<number, string>([
	[0x0131, 'LATIN SMALL LETTER I WITH DOT ABOVE'],
	[0x0237, 'LATIN SMALL LETTER J WITH DOT ABOVE'],
]);

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

function loadSequences(sequencesPath: string): Map<number, {defaultSeq: string; altSeq?: string}> {
	const content = fs.readFileSync(sequencesPath, 'utf8');
	const records = parse(content, {
		delimiter: '\t',
		columns: false,
		skip_empty_lines: true,
		quote: false,
	});

	const sequences = new Map<number, {defaultSeq: string; altSeq?: string}>();
	for (const [cpHex, , seq] of records) {
		if (!cpHex) continue;
		const cp = parseInt(cpHex.substring(2), 16);
		if (seq) {
			const existing = sequences.get(cp);
			if (existing) {
				existing.altSeq ||= seq;
			} else {
				sequences.set(cp, {defaultSeq: seq});
			}
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

const mathematicalAlphanumericSymbolsGroups = {
	MBS: 'MATHEMATICAL BOLD SCRIPT',
	MS: 'MATHEMATICAL SCRIPT',
	MBF: 'MATHEMATICAL BOLD FRAKTUR',
	MF: 'MATHEMATICAL FRAKTUR',
	MDS: 'MATHEMATICAL DOUBLE-STRUCK',
	MSSBI: 'MATHEMATICAL SANS-SERIF BOLD ITALIC',
	MSSB: 'MATHEMATICAL SANS-SERIF BOLD',
	MSSI: 'MATHEMATICAL SANS-SERIF ITALIC',
	MSS: 'MATHEMATICAL SANS-SERIF',
	MBI: 'MATHEMATICAL BOLD ITALIC',
	MB: 'MATHEMATICAL BOLD',
	MI: 'MATHEMATICAL ITALIC',
	MM: 'MATHEMATICAL MONOSPACE',
};

const ucaCollator = new Intl.Collator('und', {sensitivity: 'variant'});

function applyOrderingOverrides(built: Record<string, {cp: number; name: string; cat?: string}[]>): void {
	for (const category of Object.keys(built)) {
		const entries = built[category];
		if (!entries) continue;
		entries.sort((a, b) => ucaCollator.compare(String.fromCodePoint(a.cp), String.fromCodePoint(b.cp)));
	}
}

const sets = {
	modifier: {
		base: [
			[0x02B9, 0x02BC],
			[0x02BE, 0x02BF],
		],
	},
	dia: {
		base: [
			[0x00A8, 0x00B8],
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
			[0x0313, 0x0313],
			[0x0323, 0x0323],
			[0x0326, 0x0328],
			[0x0331, 0x0331],
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
			[0x018F, 0x018F], // Schwa
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
			[0x0268, 0x0268],
			[0x0271, 0x0271],
			[0x0282, 0x0283], // …, esh
			[0x028B, 0x028B],
			[0x0292, 0x0292], // ezh
			[0x02A0, 0x02A0],
			[0x1E02, 0x1E05],
			[0x1E0A, 0x1E0D],
			[0x1E10, 0x1E11],
			[0x1E1E, 0x1E2B],
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
			[0x03B1, 0x03C9],
		],
		base: [
			[0x0386, 0x0390],
			[0x03AA, 0x03B0],
			[0x03CA, 0x03CE],
		],
		historic: [ // polytonic
			[0x1F00, 0x1F70],
			[0x1F72, 0x1F72],
			[0x1F74, 0x1F74],
			[0x1F76, 0x1F76],
			[0x1F78, 0x1F78],
			[0x1F7A, 0x1F7A],
			[0x1F7C, 0x1F7C],
			[0x1F80, 0x1FBA],
			[0x1FBC, 0x1FBC],
			[0x1FC2, 0x1FC8],
			[0x1FCA, 0x1FCA],
			[0x1FCC, 0x1FCC],
			[0x1FD0, 0x1FD2],
			[0x1FD4, 0x1FDA],
			[0x1FE0, 0x1FE2],
			[0x1FE4, 0x1FEA],
			[0x1FEC, 0x1FEC],
			[0x1FF2, 0x1FF8],
			[0x1FFA, 0x1FFA],
			[0x1FFC, 0x1FFC],
		],
		// archaic: [],
	},
	cyrillic: {
		base: [
			[0x0400, 0x045F],
			[0x0490, 0x0491],
		],
		ext: [
			[0x0492, 0x0493],
			[0x049A, 0x049B],
			[0x04A2, 0x04A3],
			[0x04AE, 0x04AF],
			[0x04B0, 0x04B3],
			[0x04B6, 0x04B7],
			[0x04BA, 0x04BB],
			[0x04D8, 0x04D9],
			[0x04E2, 0x04E3],
			[0x04E8, 0x04E9],
			[0x04EE, 0x04EF],
		],
	},
	punctuation: {
		base: [
			[0x00A0, 0x00A0],
			[0x00A1, 0x00BF],
			[0x2010, 0x2014],
			[0x2018, 0x2022],
			[0x2026, 0x2027],
			[0x202F, 0x2033],
			[0x2039, 0x203A],
		],
	},
	format: {
		base: [
			[0x00AD, 0x200D],
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
	math_alphanumerics: {
		mds_base: [
			[0x2102],
			[0x210D],
			[0x2115],
			[0x211A],
			[0x211D],
			[0x2124],
		],
	},
	currency: {
		base: [
			[0x00A2, 0x00A5],
			[0x20AC, 0x20AC], // euro sign
			[0x20BF, 0x20BF], // bitcoin sign
		],
	},
	emoji: {
		base: [
			[0x1F603, 0x1F604],
			[0x1F606, 0x1F606],
			[0x1F609, 0x1F609],
			[0x1F60E, 0x1F60E],
			[0x1F610, 0x1F610],
			[0x1F618, 0x1F618],
			[0x1F61B, 0x1F61C],
			[0x1F620, 0x1F620],
			[0x1F622, 0x1F622],
			[0x1F62E, 0x1F62E],
			[0x1F641, 0x1F641],
			[0x1F642, 0x1F642],
		],
	},
	misc: {
		base: [
			[0x00A6, 0x00B0],
			[0x2116, 0x2116], // number sign
			[0x2122, 0x2122], // trade mark sign
			[0x2300, 0x2300], // diameter
			[0x2713, 0x2713], // check mark
			[0x2717, 0x2717], // ballot x
		],
	},
};

function getSetsForCodePoint(cp: number, category: string): string[] {
	const categorySets = sets[category as keyof typeof sets];
	if (!categorySets || typeof categorySets !== 'object') {
		return [];
	}
	const result: string[] = [];
	for (const [setName, ranges] of Object.entries(categorySets)) {
		if (
			Array.isArray(ranges)
			&& ranges.some(([start, end]) => cp >= start && cp <= (end ?? start))
		) {
			result.push(setName);
		}
	}
	return result;
}

function generateFileContent(
	categories: string[],
	built: Record<string, {cp: number; name: string; cat?: string}[]>,
	sequences: Map<number, {defaultSeq: string; altSeq?: string}>,
): string {
	const usedConstants = new Set<string>();
	const bodyLines: string[] = [];

	const setsPart = (sets: string[]) => sets.length > 0 ? `, set: [${sets.map((s) => `'${s}'`).join(', ')}]` : '';

	const addLetterEntry = (
		linesArr: string[],
		cpHex: string,
		sets: string[],
		seqPart: string,
		name: string,
		script: 'LATIN' | 'GREEK' | 'CYRILLIC',
		diacriticsPattern: string,
	): boolean => {
		const templateIdent = script === 'GREEK' ? 'GL' : script === 'CYRILLIC' ? 'CL' : 'LL';
		const re = new RegExp(`^${script} ((CAPITAL|SMALL) )?LETTER ([A-Z0-9 -]+?)(?: WITH (${diacriticsPattern})(?: AND (${diacriticsPattern})(?: AND (${diacriticsPattern}))?)?)?$`);
		const match = name.match(re);
		if (!match) return false;
		const [, , caseMatch, letter, diacritic1, diacritic2, diacritic3] = match as [string, string | undefined, string, string, string?, string?, string?];
		let caseIdent = '_';
		if (caseMatch) {
			caseIdent = caseMatch === 'CAPITAL' ? 'C' : 'S';
		}
		usedConstants.add(templateIdent);
		usedConstants.add(caseIdent);
		if (diacritic1) {
			const d1 = diacritic1.replace(/ /g, '_');
			const d2 = diacritic2 ? diacritic2.replace(/ /g, '_') : undefined;
			const d3 = diacritic3 ? diacritic3.replace(/ /g, '_') : undefined;
			usedConstants.add(d1);
			if (d2) usedConstants.add(d2);
			if (d3) usedConstants.add(d3);
			if (d3) {
				linesArr.push(`\t{cp: ${cpHex}, template: [${templateIdent}, ${caseIdent}, '${letter}', ${d1}, ${d2}, ${d3}]${setsPart(sets)}${seqPart}},`);
			} else if (d2) {
				linesArr.push(`\t{cp: ${cpHex}, template: [${templateIdent}, ${caseIdent}, '${letter}', ${d1}, ${d2}]${setsPart(sets)}${seqPart}},`);
			} else {
				linesArr.push(`\t{cp: ${cpHex}, template: [${templateIdent}, ${caseIdent}, '${letter}', ${d1}]${setsPart(sets)}${seqPart}},`);
			}
		} else if (script === 'LATIN' && /^[A-Z]$/.test(letter)) {
			linesArr.push(`\t{cp: ${cpHex}, template: [${templateIdent}, ${caseIdent}, '${letter}']${setsPart(sets)}${seqPart}},`);
		} else {
			const endingEsc = escapeTSString(letter);
			linesArr.push(`\t{cp: ${cpHex}, end: '${endingEsc}', template: [${templateIdent}, ${caseIdent}]${setsPart(sets)}${seqPart}},`);
		}
		return true;
	};

	const addEntries = (key: string, entries: {cp: number; name: string; cat?: string}[]) => {
		if (entries.length === 0) {
			bodyLines.push(`const ${key}: NameEntry[] = [];\n`);
			return;
		}

		bodyLines.push(`const ${key}: NameEntry[] = [`);
		for (const {cp, name, cat} of entries) {
			const cpHex = '0x' + cp.toString(16).toUpperCase().padStart(4, '0');
			const effectiveName = dotlessLetterOverrides.get(cp) ?? name;
			const sets = getSetsForCodePoint(cp, key);
			const seqInfo = sequences.get(cp);
			let seqPart = '';
			if (seqInfo) {
				seqPart = `, defaultSeq: '${escapeTSString(seqInfo.defaultSeq)}'`;
				if (seqInfo.altSeq) {
					seqPart += `, altSeq: '${escapeTSString(seqInfo.altSeq)}'`;
				}
			}
			const catPart = cat ? `, cat: '${cat}'` : '';
			const namePart = dotlessLetterOverrides.has(cp) ? `, name: '${escapeTSString(name)}'` : '';
			const trailingPart = namePart + seqPart + catPart;
			let handled = false;

			handled ||= addLetterEntry(bodyLines, cpHex, sets, trailingPart, effectiveName, 'LATIN', LATIN_DIACRITICS_PATTERN);
			handled ||= addLetterEntry(bodyLines, cpHex, sets, trailingPart, effectiveName, 'GREEK', GREEK_DIACRITICS_PATTERN);
			handled ||= addLetterEntry(bodyLines, cpHex, sets, trailingPart, effectiveName, 'CYRILLIC', CYRILLIC_DIACRITICS_PATTERN);

			if (handled) {
				continue;
			}

			if (name.match(/^CYRILLIC (CAPITAL|SMALL) LETTER /)) {
				const [, caseLabel] = name.match(/CYRILLIC (CAPITAL|SMALL) LETTER /) as [string, 'CAPITAL' | 'SMALL'];
				const end = name.substring(`CYRILLIC ${caseLabel} LETTER `.length);
				const endingEsc = escapeTSString(end);
				usedConstants.add('CL');
				usedConstants.add(caseLabel === 'CAPITAL' ? 'C' : 'S');
				bodyLines.push(`\t{cp: ${cpHex}, template: [CL, ${caseLabel === 'CAPITAL' ? 'C' : 'S'}, '${endingEsc}']${setsPart(sets)}${trailingPart}},`);
			} else if (name.startsWith('MODIFIER LETTER ')) {
				const end = name.substring('MODIFIER LETTER '.length);
				const endingEsc = escapeTSString(end);
				usedConstants.add('ML');
				bodyLines.push(`\t{cp: ${cpHex}, template: [ML, '${endingEsc}']${setsPart(sets)}${trailingPart}},`);
			} else if (name.startsWith('COMBINING ')) {
				const end = name.substring('COMBINING '.length);
				const match = end.match(`^(${LATIN_DIACRITICS_PATTERN}|${GREEK_DIACRITICS_PATTERN}|${ADDITIONAL_DIACRITICS_PATTERN})( ACCENT)?$`);
				usedConstants.add('COMB');
				if (match) {
					const diacriticName = match[1].replace(' ', '_');
					usedConstants.add(diacriticName);
					bodyLines.push(`\t{cp: ${cpHex}, template: [COMB, ${diacriticName}]${setsPart(sets)}${trailingPart}},`);
				} else {
					const endingEsc = escapeTSString(end);
					bodyLines.push(`\t{cp: ${cpHex}, end: '${endingEsc}', template: [COMB]${setsPart(sets)}${trailingPart}},`);
				}
			} else if (key === 'dia') {
				const match = name.match(`^(${LATIN_DIACRITICS_PATTERN}|${GREEK_DIACRITICS_PATTERN})( ACCENT)?$`);
				if (match) {
					const diacriticName = match[1].replace(' ', '_');
					const accentString = match[2] ? '\'ACCENT\'' : '';
					usedConstants.add('DIA');
					usedConstants.add(diacriticName);
					bodyLines.push(`\t{cp: ${cpHex}, template: [DIA, ${diacriticName}${accentString ? `, ${accentString}` : ''}]${setsPart(sets)}${trailingPart}},`);
				} else {
					const nameEsc = escapeTSString(name);
					bodyLines.push(`\t{cp: ${cpHex}, name: '${nameEsc}'${setsPart(sets)}${trailingPart}},`);
				}
			} else {
				const nameEsc = escapeTSString(name);
				Object.entries(mathematicalAlphanumericSymbolsGroups).forEach(([key, value]) => {
					if (!handled && name.startsWith(value)) {
						const caseLabel = nameEsc.slice(value.length + 1).match(/^CAPITAL|SMALL/)?.[0];
						let caseIdent = '_';
						if (caseLabel) {
							caseIdent = caseLabel === 'CAPITAL' ? 'C' : 'S';
						}
						let end = nameEsc.slice(value.length + (caseLabel ? caseLabel.length + 1 : 0) + 1);
						const digitMatch = end.match(`DIGIT (${Object.keys(DIGIT_NAMES_VALUES).join('|')})`);
						if (digitMatch) {
							end = DIGIT_NAMES_VALUES[digitMatch[1] as keyof typeof DIGIT_NAMES_VALUES];
						}
						sets.push(key.toLowerCase());
						usedConstants.add(key);
						usedConstants.add(caseIdent);
						bodyLines.push(`\t{cp: ${cpHex}, template: [${key}, ${caseIdent}, '${end}']${setsPart(sets)}${trailingPart}},`);
						handled = true;
					}
				});
				if (!handled) {
					const scatteredSymbol = scatteredMathematicalAlphanumericSymbols.find((s) => s.cp === cp);
					if (scatteredSymbol) {
						const template = `[${scatteredSymbol.template[0]}, ${scatteredSymbol.template[1]}, '${scatteredSymbol.template[2]}']`;
						sets.push(scatteredSymbol.template[0].toLowerCase());
						bodyLines.push(`\t{cp: ${cpHex}, name: '${nameEsc}', template: ${template}${setsPart(sets)}${trailingPart}},`);
						handled = true;
					}
				}
				if (!handled) bodyLines.push(`\t{cp: ${cpHex}, name: '${nameEsc}'${setsPart(sets)}${trailingPart}},`);
			}
		}
		bodyLines.push('];\n');
	};

	for (const category of categories) {
		addEntries(category, built[category] ?? []);
	}

	bodyLines.push(`export const characters: Record<string, NameEntry[]> = {${categories.join(', ')}};\n`);

	// Build header with dynamically-computed imports based on what constants were actually used
	const lines: string[] = [];
	lines.push('// This file is auto-generated by scripts/generate-names.ts');
	lines.push('// Do not edit this file directly.\n');
	lines.push('import {NameEntry} from \'../types\';\n');

	if (usedConstants.size > 0) {
		const importLines: string[] = [];

		// Diacritic name constants, ordered by their position in the combined diacritics list
		const allDiacritics = Array.from(new Set([...LATIN_DIACRITICS, ...GREEK_DIACRITICS, ...CYRILLIC_DIACRITICS, ...ADDITIONAL_DIACRITICS]))
			.map((c) => c.replace(/ /g, '_'));
		const usedDiacritics = allDiacritics.filter((c) => usedConstants.has(c));
		if (usedDiacritics.length > 0) {
			importLines.push(`import {${usedDiacritics.join(', ')}} from '../constants/strings';`);
		}

		// Case constants
		const usedCase = ['_', 'C', 'S'].filter((c) => usedConstants.has(c));
		if (usedCase.length > 0) {
			importLines.push(`import {${usedCase.join(', ')}} from '../constants/strings';`);
		}

		// Template type and math group constants
		const templateAndMath = ['ML', 'DIA', 'COMB', 'LL', 'GL', 'CL', ...Object.keys(mathematicalAlphanumericSymbolsGroups)];
		const usedTemplateAndMath = templateAndMath.filter((c) => usedConstants.has(c));
		if (usedTemplateAndMath.length > 0) {
			importLines.push(`import {${usedTemplateAndMath.join(', ')}} from '../constants/strings';`);
		}

		importLines[importLines.length - 1] += '\n';
		lines.push(...importLines);
	}

	lines.push(...bodyLines);

	return lines.join('\n');
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
	// Dotless I/J behave like letters with dot above; defaultSeq kept for math alphanumeric base lookups
	sequences.set(0x0131, {defaultSeq: '.i'});
	sequences.set(0x0237, {defaultSeq: '.j'});

	// Core categories accumulator (keyed by category).
	const built: Record<string, {cp: number; name: string; cat?: string}[]> = {};
	// Extra blocks accumulator (keyed by block name).
	const extraBuilt: Record<string, {cp: number; name: string; cat?: string}[]> = {};

	for (const {start, end, name: blockName} of blockRanges) {
		for (let cp = start; cp <= end; cp++) {
			const info = nameMap.get(cp);
			if (!info) continue;
			if (CORE_BLOCKS.has(blockName)) {
				const category = classify(blockName, info.cat, cp, info.name);
				if (!category) continue;
				built[category] ||= [];
				built[category].push({cp, name: info.name, cat: info.cat});
			} else {
				extraBuilt[blockName] ||= [];
				extraBuilt[blockName].push({cp, name: info.name, cat: info.cat});
			}
		}
	}

	applyOrderingOverrides(built);
	applyOrderingOverrides(extraBuilt);

	const srcDir = path.join(projectRoot, 'src', 'data');
	if (!fs.existsSync(srcDir)) {
		fs.mkdirSync(srcDir, {recursive: true});
	}

	// Write core categories into src/names.ts
	const mainContent = generateFileContent(CORE_CATEGORIES, built, sequences);
	fs.writeFileSync(path.join(srcDir, 'names.ts'), mainContent, 'utf8');

	// Write per-block files for EXTRA_BLOCKS
	for (const [blockName, entries] of Object.entries(extraBuilt)) {
		const runtimeGroup = blockToGroup(blockName);
		const fileSlug = blockName.replace(/ /g, '_');
		const blockBuilt: Record<string, {cp: number; name: string; cat?: string}[]> = {
			[runtimeGroup]: entries,
		};
		const content = generateFileContent([runtimeGroup], blockBuilt, sequences);
		fs.writeFileSync(path.join(srcDir, `names-${fileSlug}.ts`), content, 'utf8');
	}
}

main();
