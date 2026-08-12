import {CORE_CATEGORIES} from '../constants/lists';
import {CharWithSeq, NameEntry} from '../types';
import {buildGreekPolytonicGrid, GreekPolytonicGrid} from './greekPolytonicGrid';
import {buildDiacriticGrid, buildMultiDiacriticGrid, DiacriticGrid} from './diacriticGrid';
import {buildMathStylesGrid, mathStyleLabel, MathGrid} from './mathStylesGrid';

export const MULTI_DIACRITIC_LABEL = 'Letters with multiple diacritics: ';
/** Above this many multi-diacritic letters, they render as a 2-D table instead of a flat line. */
const MULTI_DIACRITIC_TABLE_THRESHOLD = 3;

export type CharItem = {
	cp: number,
	name: string,
	seqs: string[],
	conflicts?: number[],
};

export type Sublist = {
	label?: string,
	style?: 'highlight',
	chars: CharItem[],
};

export type CategoryKind = 'plain' | 'latin' | 'diacriticTable' | 'mathTable' | 'sublists';

export type Category = {
	key: string,
	label: string,
	kind: CategoryKind,
	hidden: boolean,
	/** Flat glyph line — populated for 'plain', ignored otherwise. */
	chars: CharItem[],
	/** Give every char in the 'plain' glyph line the highlighted (blue) background. */
	highlight?: boolean,
	/** Labelled/unlabelled sub-lines — used by 'sublists', and as leftovers for the table kinds. */
	sublists?: Sublist[],
	/** Transposed diacritic grid (rows = diacritics, cols = base letters) — 'latin' | 'diacriticTable'. */
	diacriticGrid?: DiacriticGrid<CharItem>,
	/** Grid of letters with more than one diacritic (rows = other mark, cols = letter blocks of trailing "tone" marks) — 'latin'. */
	multiDiacriticGrid?: DiacriticGrid<CharItem>,
	/** Transposed math-styles grid (rows = style, cols = base char) — 'mathTable'. */
	mathGrid?: MathGrid<CharItem>,
	/** Polytonic Greek table (rows = accent, cols = vowel+breathing) — 'diacriticTable' only. */
	polytonicGrid?: GreekPolytonicGrid<CharItem>,
	/** Group key driving the set-selection checkboxes in the category's config modal. */
	setGroup: string,
};

export type SuperCategory = {
	/** Stable id for supercategory-level modal targeting; only set when `label` is set. */
	key?: string,
	/** Undefined ⇒ standalone: its (usually single) category renders as a full-width row. */
	label?: string,
	categories: Category[],
};

/** Identifies which label was clicked, for opening the right CategoryConfigModal scope. */
export type CategoryModalTarget = {
	scope: 'super' | 'category',
	key: string,
	label: string,
};

export const formatScriptGroupName = (groupName: string): string => groupName
	.split('_')
	.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
	.join(' ');

function toItem(char: CharWithSeq): CharItem {
	return {
		cp: char.cp,
		name: char.name,
		seqs: [char.seq, ...(char.additionalSeqs ?? [])].filter(Boolean) as string[],
		conflicts: char.conflicts,
	};
}

function charsWithSeq(chars: CharWithSeq[] | undefined): CharItem[] {
	return (chars ?? []).filter((c) => c.seq).map(toItem);
}

function rawByCpFor(entries: NameEntry[] | undefined): Map<number, NameEntry> {
	return new Map((entries ?? []).map((e) => [e.cp, e]));
}

function nonEmpty(sublists: Sublist[]): Sublist[] | undefined {
	const filtered = sublists.filter((s) => s.chars.length > 0);
	return filtered.length > 0 ? filtered : undefined;
}

/** Splits a script's characters into three unlabelled sublists: capitals, small letters, other. */
function splitByCase(items: CharItem[], rawByCp: Map<number, NameEntry>): Sublist[] {
	const capitals: CharItem[] = [];
	const smalls: CharItem[] = [];
	const others: CharItem[] = [];
	for (const item of items) {
		const cat = rawByCp.get(item.cp)?.cat ?? '';
		if (cat === 'Lu' || cat === 'Lt') capitals.push(item);
		else if (cat === 'Ll') smalls.push(item);
		else others.push(item);
	}

	return nonEmpty([{chars: capitals}, {chars: smalls}, {chars: others}]) ?? [];
}

/**
 * Builds the ordered supercategory → category tree rendered by the "Selected characters"
 * grid. `withSeq` is the memoized applySequencesToCharacters() result; `raw` is the matching
 * deferred selectedCharacters (for template/cat, which withSeq drops). Only characters that
 * currently have a sequence are included.
 */
export function buildCategoryTree(
	withSeq: Record<string, CharWithSeq[]>,
	raw: Record<string, NameEntry[]>,
): SuperCategory[] {
	// --- Diacritics ---
	const modifierItems = charsWithSeq(withSeq.modifier);
	const diaItems = charsWithSeq(withSeq.dia);
	const combiningItems = charsWithSeq(withSeq.combining);

	// --- Latin ---
	const latinRawByCp = rawByCpFor(raw.latin);
	const latinItems = charsWithSeq(withSeq.latin);
	const latinGrid = buildDiacriticGrid(latinItems, latinRawByCp);
	const latinShowMultiDiacriticTable = latinGrid.multiDiacritic.length > MULTI_DIACRITIC_TABLE_THRESHOLD;
	const latinMultiDiacriticGrid = latinShowMultiDiacriticTable
		? buildMultiDiacriticGrid(latinGrid.multiDiacritic, latinRawByCp)
		: undefined;

	// --- Greek ---
	const greekRawByCp = rawByCpFor(raw.greek);
	const greekItems = charsWithSeq(withSeq.greek);
	const greekGrid = buildDiacriticGrid(greekItems, greekRawByCp);
	const greekShowPolytonicTable = greekGrid.multiDiacritic.length > MULTI_DIACRITIC_TABLE_THRESHOLD;
	const greekPolytonicGrid = greekShowPolytonicTable
		? buildGreekPolytonicGrid(greekGrid.multiDiacritic, greekRawByCp)
		: undefined;

	// --- Cyrillic + dynamic scripts ---
	const cyrillicRawByCp = rawByCpFor(raw.cyrillic);
	const cyrillicItems = charsWithSeq(withSeq.cyrillic);
	const dynamicScriptKeys = Object.keys(raw)
		.filter((key) => ![...CORE_CATEGORIES, 'cyrillic'].includes(key))
		.sort((a, b) => formatScriptGroupName(a).localeCompare(formatScriptGroupName(b)));

	// --- Punctuation ---
	const punctuationRawByCp = rawByCpFor(raw.punctuation);
	const punctuationItems = charsWithSeq(withSeq.punctuation);
	const separators: CharItem[] = [];
	const dashes: CharItem[] = [];
	const brackets: CharItem[] = [];
	const restPunctuation: CharItem[] = [];
	for (const item of punctuationItems) {
		const cat = punctuationRawByCp.get(item.cp)?.cat ?? '';
		if (cat.startsWith('Z')) separators.push(item);
		else if (cat === 'Pd') dashes.push(item);
		else if ((cat === 'Ps' || cat === 'Pe') && !item.name.includes('QUOTATION')) brackets.push(item);
		else restPunctuation.push(item);
	}

	// --- Format ---
	const formatItems = charsWithSeq(withSeq.format);

	// --- Math ---
	const mathOperatorsItems = charsWithSeq(withSeq.math_operators);
	const isArrowChar = (cp: number) =>
		(cp >= 0x2190 && cp <= 0x21FF)
		|| (cp >= 0x27F0 && cp <= 0x27FF)
		|| (cp >= 0x2900 && cp <= 0x297F)
		|| (cp >= 0x2B00 && cp <= 0x2BFF)
		|| (cp >= 0x1F800 && cp <= 0x1F8FF);
	const mathArrowItems = mathOperatorsItems.filter((c) => isArrowChar(c.cp));
	const mathOperatorOnlyItems = mathOperatorsItems.filter((c) => !isArrowChar(c.cp));
	const mathNumberItems = charsWithSeq(withSeq.math_number);
	const superscripts: CharItem[] = [];
	const subscripts: CharItem[] = [];
	const fractions: CharItem[] = [];
	const otherNumbers: CharItem[] = [];
	for (const item of mathNumberItems) {
		if (item.name.includes('SUPERSCRIPT')) superscripts.push(item);
		else if (item.name.includes('SUBSCRIPT')) subscripts.push(item);
		else if (item.name.includes('FRACTION')) fractions.push(item);
		else otherNumbers.push(item);
	}
	const mathAlphaRawByCp = rawByCpFor(raw.math_alphanumerics);
	const mathAlphaItems = charsWithSeq(withSeq.math_alphanumerics);
	const mathGrid = buildMathStylesGrid(mathAlphaItems, mathAlphaRawByCp);
	const mathIsTable = mathGrid.rows.length > 1;

	// --- Currency / Emoji / Misc ---
	const currencyItems = charsWithSeq(withSeq.currency);
	const emojiItems = charsWithSeq(withSeq.emoji);
	const miscItems = charsWithSeq(withSeq.misc);

	const tree: SuperCategory[] = [
		{
			key: 'scripts',
			label: 'Scripts',
			categories: [
				{
					key: 'dia', label: 'Standalone diacritics', kind: 'plain', hidden: false,
					chars: diaItems, setGroup: 'dia',
				},
				{
					key: 'combining', label: 'Combining diacritics', kind: 'plain',
					hidden: combiningItems.length === 0, chars: combiningItems, setGroup: 'combining',
				},
				{
					key: 'modifier', label: 'Modifier letters', kind: 'plain', hidden: false,
					chars: modifierItems, setGroup: 'modifier',
				},
				{
					key: 'latin', label: 'Latin', kind: 'latin', hidden: false, chars: [],
					diacriticGrid: latinGrid,
					multiDiacriticGrid: latinMultiDiacriticGrid,
					sublists: nonEmpty([
						latinShowMultiDiacriticTable
							? {chars: []}
							: {label: MULTI_DIACRITIC_LABEL, chars: latinGrid.multiDiacritic},
						{label: 'Special letters: ', chars: latinGrid.special},
						{label: 'Other: ', chars: latinGrid.other},
					]),
					setGroup: 'latin',
				},
				{
					key: 'greek', label: 'Greek', kind: 'diacriticTable', hidden: false, chars: [],
					diacriticGrid: greekGrid,
					polytonicGrid: greekPolytonicGrid,
					sublists: nonEmpty([
						greekShowPolytonicTable
							? {chars: greekPolytonicGrid!.leftover}
							: {label: MULTI_DIACRITIC_LABEL, chars: greekGrid.multiDiacritic},
						{chars: [...greekGrid.special, ...greekGrid.other]},
					]),
					setGroup: 'greek',
				},
				{
					key: 'cyrillic', label: 'Cyrillic', kind: 'sublists', hidden: cyrillicItems.length === 0, chars: [],
					sublists: splitByCase(cyrillicItems, cyrillicRawByCp),
					setGroup: 'cyrillic',
				},
				...dynamicScriptKeys.map((key): Category => ({
					key,
					label: formatScriptGroupName(key),
					kind: 'sublists',
					hidden: (withSeq[key]?.filter((c) => c.seq).length ?? 0) === 0,
					chars: [],
					sublists: splitByCase(charsWithSeq(withSeq[key]), rawByCpFor(raw[key])),
					setGroup: key,
				})),
			],
		},
		{
			key: 'symbols',
			label: 'Symbols',
			categories: [
				{
					key: 'punctuation', label: 'Punctuation marks', kind: 'sublists', hidden: false, chars: [],
					sublists: nonEmpty([
						{chars: restPunctuation},
						{label: 'Brackets: ', chars: brackets},
						{label: 'Dashes: ', chars: dashes},
						{label: 'Separators: ', style: 'highlight', chars: separators},
					]),
					setGroup: 'punctuation',
				},
				{
					key: 'format', label: 'Formatting characters', kind: 'plain', hidden: false,
					chars: formatItems, highlight: true, setGroup: 'format',
				},
				{
					key: 'math_operators', label: 'Math operators', kind: 'sublists', hidden: false, chars: [],
					sublists: nonEmpty([
						{chars: mathOperatorOnlyItems},
						{label: 'Arrows: ', chars: mathArrowItems},
					]),
					setGroup: 'math_operators',
				},
				mathIsTable
					? {
						key: 'math_alphanumerics', label: 'Math alphanumerics', kind: 'mathTable', hidden: false, chars: [],
						mathGrid,
						sublists: nonEmpty([{chars: mathGrid.unmatched}]),
						setGroup: 'math_alphanumerics',
					}
					: {
						key: 'math_alphanumerics', label: 'Math alphanumerics', kind: 'sublists', hidden: false, chars: [],
						sublists: nonEmpty([
							...mathGrid.rows.map((row) => ({
								label: `${mathStyleLabel(row.style)}: `,
								chars: [...row.cells.values()].flatMap((cell) => [cell.lower, cell.upper].filter((c): c is CharItem => Boolean(c))),
							})),
							{chars: mathGrid.unmatched},
						]),
						setGroup: 'math_alphanumerics',
					},
				{
					key: 'math_number', label: 'Numbers', kind: 'sublists', hidden: false, chars: [],
					sublists: nonEmpty([
						{label: 'Superscripts: ', chars: superscripts},
						{label: 'Subscripts: ', chars: subscripts},
						{label: 'Fractions: ', chars: fractions},
						{chars: otherNumbers},
					]),
					setGroup: 'math_number',
				},
				{
					key: 'currency', label: 'Currencies', kind: 'plain', hidden: false,
					chars: currencyItems, setGroup: 'currency',
				},
				{
					key: 'emoji', label: 'Emoji', kind: 'plain', hidden: false, chars: emojiItems, setGroup: 'emoji',
				},
				{
					key: 'misc', label: 'Miscellaneous', kind: 'plain', hidden: false,
					chars: miscItems, setGroup: 'misc',
				},
			],
		},
	];

	return tree;
}
