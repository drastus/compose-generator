import {CORE_BLOCKS} from '../constants/lists';
import {blockToGroup} from './blockToGroup';

export const scatteredMathematicalAlphanumericSymbols = [
	{cp: 0x2102, template: ['MDS', 'C', 'C']},
	{cp: 0x210A, template: ['MS', 'S', 'G']},
	{cp: 0x210B, template: ['MS', 'C', 'H']},
	{cp: 0x210C, template: ['MF', 'C', 'H']},
	{cp: 0x210D, template: ['MDS', 'C', 'H']},
	{cp: 0x210E, template: ['MI', 'S', 'H']},
	{cp: 0x2110, template: ['MS', 'C', 'I']},
	{cp: 0x2111, template: ['MF', 'C', 'I']},
	{cp: 0x2112, template: ['MS', 'C', 'L']},
	{cp: 0x2115, template: ['MDS', 'C', 'N']},
	{cp: 0x2119, template: ['MDS', 'C', 'P']},
	{cp: 0x211A, template: ['MDS', 'C', 'Q']},
	{cp: 0x211B, template: ['MS', 'C', 'R']},
	{cp: 0x211D, template: ['MDS', 'C', 'R']},
	{cp: 0x2124, template: ['MDS', 'C', 'Z']},
	{cp: 0x2128, template: ['MF', 'C', 'Z']},
	{cp: 0x212C, template: ['MS', 'C', 'B']},
	{cp: 0x212D, template: ['MF', 'C', 'C']},
	{cp: 0x212F, template: ['MS', 'S', 'E']},
	{cp: 0x2130, template: ['MS', 'C', 'E']},
	{cp: 0x2131, template: ['MS', 'C', 'F']},
	{cp: 0x2133, template: ['MS', 'C', 'M']},
	{cp: 0x2134, template: ['MS', 'S', 'O']},
];

const scatteredCurrencySymbols = [ // only non-script-specific
	0x058F, // dram
	0x0E3F, // baht
	0x09F3, // taka
	0x17DB, // riel
];

const symbolBlockRanges = [
	{start: 0x2000, end: 0x20CF}, // General Punctuation through Currency Symbols
	{start: 0x2100, end: 0x218F}, // Letterlike Symbols through Number Forms
	{start: 0x2190, end: 0x23FF}, // Arrows through Miscellaneous Technical
	{start: 0x2400, end: 0x245F}, // Control Pictures through Optical Character Recognition
	{start: 0x2460, end: 0x24FF}, // Enclosed Alphanumerics
	{start: 0x2500, end: 0x257F}, // Box Drawing
	{start: 0x2580, end: 0x259F}, // Block Elements
	{start: 0x25A0, end: 0x27FF}, // Geometric Shapes through Supplemental Arrows-A
	{start: 0x2900, end: 0x2AFF}, // Supplemental Arrows-B through Supplemental Mathematical Operators
	{start: 0x2B00, end: 0x2BFF}, // Miscellaneous Symbols and Arrows
	{start: 0x2E00, end: 0x2E7F}, // Supplemental Punctuation
	{start: 0x4DC0, end: 0x4DFF}, // Yijing Hexagram Symbols
	{start: 0xA830, end: 0xA83F}, // Common Indic Number Forms
	{start: 0xFE00, end: 0xFE0F}, // Variation Selectors
	{start: 0xFE10, end: 0xFE1F}, // Vertical Forms
	{start: 0xFE20, end: 0xFE2F}, // Combining Half Marks
	{start: 0xFE30, end: 0xFE4F}, // CJK Compatibility Forms
	{start: 0xFE50, end: 0xFE6F}, // Small Form Variants
	{start: 0xFF00, end: 0xFFEF}, // Halfwidth and Fullwidth Forms
	{start: 0xFFF0, end: 0xFFFF}, // Specials
	{start: 0x10190, end: 0x101CF}, // Ancient Symbols
	{start: 0x16FE0, end: 0x16FFF}, // Ideographic Symbols and Punctuation
	{start: 0x1D000, end: 0x1D0FF}, // Byzantine Musical Symbols
	{start: 0x1D100, end: 0x1D1FF}, // Musical Symbols
	{start: 0x1D200, end: 0x1D24F}, // Ancient Greek Musical Notation
	{start: 0x1D300, end: 0x1D35F}, // Tai Xuan Jing Symbols
	{start: 0x1D400, end: 0x1D7FF}, // Mathematical Alphanumeric Symbols
	{start: 0x1F000, end: 0x1F02F}, // Mahjong Tiles
	{start: 0x1F030, end: 0x1F09F}, // Domino Tiles
	{start: 0x1F0A0, end: 0x1F0FF}, // Playing Cards
	{start: 0x1F100, end: 0x1F1FF}, // Enclosed Alphanumeric Supplement
	{start: 0x1F200, end: 0x1F2FF}, // Enclosed Ideographic Supplement
	{start: 0x1F300, end: 0x1F5FF}, // Miscellaneous Symbols and Pictographs
	{start: 0x1F600, end: 0x1F64F}, // Emoticons
	{start: 0x1F650, end: 0x1F67F}, // Ornamental Dingbats
	{start: 0x1F680, end: 0x1F6FF}, // Transport and Map Symbols
	{start: 0x1F700, end: 0x1F77F}, // Alchemical Symbols
	{start: 0x1F780, end: 0x1F7FF}, // Geometric Shapes Extended
	{start: 0x1F800, end: 0x1F8FF}, // Supplemental Arrows-C
	{start: 0x1F900, end: 0x1F9FF}, // Supplemental Symbols and Pictographs
	{start: 0x1FA00, end: 0x1FA6F}, // Chess Symbols
	{start: 0x1FA70, end: 0x1FAFF}, // Symbols and Pictographs Extended-A
	{start: 0x1FB00, end: 0x1FBFF}, // Symbols for Legacy Computing
	{start: 0xE0000, end: 0xE007F}, // Tags
	{start: 0xE0100, end: 0xE01EF}, // Variation Selectors Supplement
];

export function classifyAsCore(blockName: string, generalCat: string, cp: number): string | undefined {
	if (blockName === 'Greek and Coptic' || blockName === 'Greek Extended') return 'greek';
	const isLatinBlock = blockName.startsWith('Latin') || ['Basic Latin', 'IPA Extensions', 'Phonetic Extensions', 'Phonetic Extensions Supplement'].includes(blockName);

	// Mathematical alphanumeric symbols
	if (blockName === 'Mathematical Alphanumeric Symbols' || scatteredMathematicalAlphanumericSymbols.some((s) => s.cp === cp)) {
		return 'math_alphanumerics';
	}
	// Letters
	if (generalCat === 'Lu' || generalCat === 'Ll' || generalCat === 'Lt' || generalCat === 'Lo') {
		if (isLatinBlock) {
			return 'latin';
		}
	}
	// Modifier
	if ((generalCat === 'Lm' || generalCat === 'Sk') && (isLatinBlock || blockName === 'Spacing Modifier Letters')) return 'modifier';
	// Combining marks
	if ((['Mn', 'Mc', 'Me'].includes(generalCat)) && blockName.startsWith('Combining')) {
		return 'combining';
	}
	// Numbers
	if ((['Nd', 'Nl', 'No'].includes(generalCat)) && (isLatinBlock || ['Number Forms', 'Superscripts and Subscripts'].includes(blockName))) {
		return 'math_number';
	}
	// Punctuation
	if ((generalCat.startsWith('P') || generalCat.startsWith('Z')) && (isLatinBlock || ['General Punctuation', 'Supplemental Punctuation'].includes(blockName))) {
		return 'punctuation';
	}
	// Math operators
	if (generalCat === 'Sm') return 'math_operators';
	// Currency
	if (generalCat === 'Sc' && (isLatinBlock || blockName === 'Currency Symbols' || scatteredCurrencySymbols.includes(cp))) {
		return 'currency';
	}
	// Emoji
	if (generalCat === 'So' && (
		['Miscellaneous Symbols and Pictographs', 'Emoticons', 'Transport and Map Symbols', 'Miscellaneous Symbols', 'Dingbats'].includes(blockName)
	)) {
		return 'emoji';
	}
	// Format
	if (generalCat === 'Cf' || generalCat === 'Cc' || blockName === 'Variation Selectors') {
		return 'format';
	}
	// Symbols other
	if (generalCat === 'So' || symbolBlockRanges.some((range) => cp >= range.start && cp <= range.end)) {
		return 'misc';
	}

	return undefined;
}

export default function classify(blockName: string, generalCat: string, cp: number): string | undefined {
	if (!CORE_BLOCKS.has(blockName)) {
		return blockToGroup(blockName);
	}
	return classifyAsCore(blockName, generalCat, cp) ?? blockName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
}
