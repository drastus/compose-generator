import {
	ADDITIONAL_GREEK_LETTERS,
	ADDITIONAL_MATH_ALPHANUMERIC_SYMBOLS,
	C,
	GREEK_LETTERS,
	MB,
	MBF,
	MBI,
	MBS,
	MDS,
	MF,
	MH,
	MI,
	MM,
	MS,
	MSS,
	MSSB,
	MSSBI,
	MSSI,
} from '../constants/strings';
import {NameEntry} from '../types';

type RawLookup = Pick<NameEntry, 'template'>;

export type StyleColumn = {
	style: string,
	label: string,
};

/** Style constant → display label, in canonical display order. Shared with the tree builder. */
export const STYLE_ORDER: StyleColumn[] = [
	{style: MB, label: 'Bold'},
	{style: MI, label: 'Italic'},
	{style: MBI, label: 'Bold italic'},
	{style: MS, label: 'Script'},
	{style: MBS, label: 'Bold script'},
	{style: MF, label: 'Fraktur'},
	{style: MBF, label: 'Bold fraktur'},
	{style: MDS, label: 'Double-struck'},
	{style: MSS, label: 'Sans-serif'},
	{style: MSSB, label: 'Sans-serif bold'},
	{style: MSSI, label: 'Sans-serif italic'},
	{style: MSSBI, label: 'Sans-serif bold italic'},
	{style: MM, label: 'Monospace'},
	{style: MH, label: 'Hebrew letters'},
];

const STYLE_LABEL_BY_KEY = new Map(STYLE_ORDER.map((s) => [s.style, s.label]));

export function mathStyleLabel(style: string): string {
	return STYLE_LABEL_BY_KEY.get(style) ?? style;
}

const getLetterType = (letter: string) => {
	if (letter.length === 1 && letter >= '0' && letter <= '9') return 'digit';
	if (letter.length === 1 && letter >= 'A' && letter <= 'Z') return 'latin';
	if (GREEK_LETTERS.includes(letter)) return 'greek';
	if (ADDITIONAL_GREEK_LETTERS.includes(letter)) return 'additional_greek';
	if (ADDITIONAL_MATH_ALPHANUMERIC_SYMBOLS.includes(letter)) return 'additional';
	return 'other';
};

const compareLetters = (a: string, b: string) => {
	const aType = getLetterType(a);
	const bType = getLetterType(b);

	const typeOrder = {
		latin: 0, greek: 1, additional_greek: 2, additional: 3, digit: 4, other: 5,
	};
	const typeDiff = typeOrder[aType] - typeOrder[bType];
	if (typeDiff !== 0) return typeDiff;

	if (aType === 'digit' || aType === 'latin') return a.localeCompare(b);
	if (aType === 'greek') {
		return GREEK_LETTERS.indexOf(a) - GREEK_LETTERS.indexOf(b);
	}

	return a.localeCompare(b);
};

export type MathGridRow<T> = {
	style: string,
	label: string,
	cells: Map<string, {lower?: T, upper?: T}>,
};

export type MathGrid<T> = {
	rows: Array<MathGridRow<T>>,
	baseLetters: string[],
	unmatched: T[],
};

/**
 * Builds a transposed math-alphanumerics grid — rows are styles (Bold, Italic, …), columns
 * are base characters — so the same base character aligns vertically across styles.
 */
export function buildMathStylesGrid<T extends {cp: number}>(
	entries: T[],
	rawByCp: Map<number, RawLookup>,
): MathGrid<T> {
	const rowsByStyle = new Map<string, Map<string, {lower?: T, upper?: T}>>();
	const baseLetterSet = new Set<string>();
	const unmatched: T[] = [];

	for (const char of entries) {
		const rawChar = rawByCp.get(char.cp);
		const {template} = rawChar ?? {};
		if (!template) {
			unmatched.push(char);
			continue;
		}

		const style = template[0];
		const caseMarker = template[1];
		const baseLetter = template[2];

		const isLatinLetter = typeof baseLetter === 'string' && baseLetter.length === 1 && baseLetter >= 'A' && baseLetter <= 'Z';
		const isGreekLetter = typeof baseLetter === 'string' && GREEK_LETTERS.includes(baseLetter);
		const isAdditionalGreek = typeof baseLetter === 'string' && ADDITIONAL_GREEK_LETTERS.includes(baseLetter);
		const isAdditionalAlphanumeric = typeof baseLetter === 'string' && ADDITIONAL_MATH_ALPHANUMERIC_SYMBOLS.includes(baseLetter);
		const isDigit = typeof baseLetter === 'string' && baseLetter.length === 1 && baseLetter >= '0' && baseLetter <= '9';

		if (!isLatinLetter && !isGreekLetter && !isAdditionalGreek && !isAdditionalAlphanumeric && !isDigit) {
			unmatched.push(char);
			continue;
		}

		if (!rowsByStyle.has(style)) {
			rowsByStyle.set(style, new Map());
		}
		const row = rowsByStyle.get(style)!;
		if (!row.has(baseLetter)) {
			row.set(baseLetter, {});
		}
		const cell = row.get(baseLetter)!;
		if (caseMarker === C) {
			cell.upper = char;
		} else {
			cell.lower = char;
		}

		baseLetterSet.add(baseLetter);
	}

	const activeStyles = STYLE_ORDER.filter((s) => rowsByStyle.has(s.style));

	return {
		rows: activeStyles.map(({style, label}) => ({style, label, cells: rowsByStyle.get(style)!})),
		baseLetters: Array.from(baseLetterSet).sort(compareLetters),
		unmatched,
	};
}
