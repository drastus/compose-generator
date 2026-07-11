import {
	DASIA, DIALYTIKA, GREEK_LETTERS, OXIA, PERISPOMENI, PROSGEGRAMMENI, PSILI, TONOS, VARIA, YPOGEGRAMMENI,
} from '../constants/strings';
import {NameEntry} from '../types';

type RawLookup = Pick<NameEntry, 'template'>;

/** Breathing-like marks — occupy the same "vowel modification" slot, mutually exclusive. */
const BREATHINGS = [PSILI, DASIA, DIALYTIKA];
/** Maps a raw accent mark to its row key — TONOS (modern monotonic) rows alongside OXIA (acute). */
const ACCENT_ROW: Record<string, string> = {[VARIA]: VARIA, [OXIA]: OXIA, [TONOS]: OXIA, [PERISPOMENI]: PERISPOMENI};
/** Row order: no-accent row first, then grave/acute/circumflex. */
const ROW_ORDER = ['', VARIA, OXIA, PERISPOMENI];
const IOTA_SUBS = [YPOGEGRAMMENI, PROSGEGRAMMENI];

export type GreekPolytonicGridRow<T> = {
	accentKey: string,
	cells: Map<string, {lower?: T, upper?: T}>,
};

export type GreekPolytonicGrid<T> = {
	rows: Array<GreekPolytonicGridRow<T>>,
	columns: string[],
	/** Chars whose marks don't decompose into breathing/accent/iota-subscript (unexpected). */
	leftover: T[],
};

type Decomposed = {
	vowel: string,
	breathing: string,
	accent: string,
	hasIotaSub: boolean,
	isUpper: boolean,
};

function decompose(rawChar: RawLookup | undefined): Decomposed | null {
	if (!rawChar?.template) return null;
	const {template} = rawChar;
	const vowel = template[2];
	if (typeof vowel !== 'string') return null;

	const marks = template.slice(3);
	const breathing = marks.find((m) => BREATHINGS.includes(m)) ?? '';
	const accentMark = marks.find((m) => m in ACCENT_ROW);
	const accent = accentMark ? ACCENT_ROW[accentMark] : '';
	const hasIotaSub = marks.some((m) => IOTA_SUBS.includes(m));

	// Every mark on the letter must be accounted for by breathing/accent/iota-subscript
	// (e.g. ᾲ = accent + iota-subscript with no breathing at all is still valid).
	const accounted = new Set([breathing, accentMark, ...IOTA_SUBS].filter(Boolean));
	if (marks.length === 0 || marks.some((m) => !accounted.has(m))) return null;

	return {vowel, breathing, accent, hasIotaSub, isUpper: template[1] === 'CAPITAL'};
}

const vowelIndex = (vowel: string): number => {
	const index = GREEK_LETTERS.indexOf(vowel);
	return index === -1 ? GREEK_LETTERS.length : index;
};

/** Order within a column group; 'no breathing' sorts after psili/dasia. */
const breathingOrder = (breathing: string): number => (breathing === '' ? BREATHINGS.length : BREATHINGS.indexOf(breathing));

function columnKey({vowel, breathing, hasIotaSub}: Decomposed): string {
	return `${vowel}|${breathing}|${hasIotaSub ? '1' : '0'}`;
}

function columnSortValue(key: string): [number, number, number] {
	const [vowel, breathing, iotaSub] = key.split('|');
	// Group order: plain breathing columns, then iota-subscript, then diaeresis (dialytika).
	const group = breathing === DIALYTIKA ? 2 : (iotaSub === '1' ? 1 : 0);
	return [group, vowelIndex(vowel), breathingOrder(breathing)];
}

/**
 * Builds the Greek polytonic table: rows are accents (no-accent row first, then
 * grave/acute/circumflex), columns are vowel+breathing combinations, with
 * iota-subscript and diaeresis (dialytika) variants placed as extra column groups.
 * Input is the `multiDiacritic` leftover from `buildDiacriticGrid`.
 */
export function buildGreekPolytonicGrid<T extends {cp: number}>(
	entries: T[],
	rawByCp: Map<number, RawLookup>,
): GreekPolytonicGrid<T> {
	const rowsByAccent = new Map<string, Map<string, {lower?: T, upper?: T}>>();
	const columnKeys = new Set<string>();
	const leftover: T[] = [];

	for (const char of entries) {
		const decomposed = decompose(rawByCp.get(char.cp));
		if (!decomposed) {
			leftover.push(char);
			continue;
		}

		const colKey = columnKey(decomposed);
		columnKeys.add(colKey);

		if (!rowsByAccent.has(decomposed.accent)) {
			rowsByAccent.set(decomposed.accent, new Map());
		}
		const row = rowsByAccent.get(decomposed.accent)!;
		if (!row.has(colKey)) {
			row.set(colKey, {});
		}
		const cell = row.get(colKey)!;
		if (decomposed.isUpper) {
			cell.upper = char;
		} else {
			cell.lower = char;
		}
	}

	const sortedColumns = Array.from(columnKeys).sort((a, b) => {
		const av = columnSortValue(a);
		const bv = columnSortValue(b);
		return av[0] - bv[0] || av[1] - bv[1] || av[2] - bv[2];
	});

	const rows = ROW_ORDER
		.filter((accentKey) => rowsByAccent.has(accentKey))
		.map((accentKey) => ({accentKey, cells: rowsByAccent.get(accentKey)!}));

	return {rows, columns: sortedColumns, leftover};
}
