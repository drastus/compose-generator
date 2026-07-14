import {C, CL, GL, LL} from '../constants/strings';
import {NameEntry} from '../types';

type RawLookup = Pick<NameEntry, 'template' | 'end' | 'cat'>;

export type DiacriticGridRow<T> = {
	diacriticKey: string,
	cells: Map<string, {lower?: T, upper?: T}>,
};

export type DiacriticGrid<T> = {
	rows: Array<DiacriticGridRow<T>>,
	baseLetters: string[],
	/** Unmatched chars (no single base letter) that are letters (Lu/Ll/Lt/other). */
	special: T[],
	/** Unmatched chars with general category Lo (e.g. ordinal indicators). */
	other: T[],
	/** Letters with a single base letter but more than one diacritic. */
	multiDiacritic: T[],
};

const isCommonAlphabetLetter = (letter: string): boolean => [LL, GL, CL].includes(letter);

function extractBaseLetter(rawChar: RawLookup | undefined): string | null {
	if (!rawChar) return null;
	const {template} = rawChar;
	if (!template || !Array.isArray(template)) return null;

	if (template[0] === LL && template.length >= 3) {
		const letter = template[2];
		if (typeof letter === 'string' && letter.length === 1) {
			return letter.toUpperCase();
		}
	}

	if (template[0] === GL || template[0] === CL) {
		if (template.length >= 3) {
			return template[2];
		}
		if (rawChar.end && typeof rawChar.end === 'string') {
			return rawChar.end;
		}
		return null;
	}

	return null;
}

function extractDiacritics(rawChar: RawLookup | undefined): {diacritics: string[], diacriticKey: string} {
	if (!rawChar) return {diacritics: [], diacriticKey: ''};
	const {template} = rawChar;
	if (!template || !Array.isArray(template)) return {diacritics: [], diacriticKey: ''};

	if (isCommonAlphabetLetter(template[0]) && template.length >= 3) {
		const diacritics = template.slice(3);
		const diacriticKey = diacritics.length === 0 ? '' : diacritics.join('+');
		return {diacritics, diacriticKey};
	}

	return {diacritics: [], diacriticKey: ''};
}

function isUpperCase(rawChar: RawLookup | undefined): boolean {
	if (!rawChar) return false;
	const {template} = rawChar;
	if (!template || !Array.isArray(template)) return false;

	if (isCommonAlphabetLetter(template[0]) && template.length >= 2) {
		return template[1] === C;
	}

	return false;
}

/**
 * Builds a transposed diacritic grid — rows are diacritics (base row first), columns are
 * base letters — from a flat list of chars-with-seq plus a cp→NameEntry lookup for their
 * templates. Shared by the Latin and Greek compact table renderers.
 */
export function buildDiacriticGrid<T extends {cp: number}>(
	entries: T[],
	rawByCp: Map<number, RawLookup>,
): DiacriticGrid<T> {
	const rowsByDiacritic = new Map<string, Map<string, {lower?: T, upper?: T}>>();
	const baseLetterCp = new Map<string, number>();
	const baseLetterFallbackMinCp = new Map<string, number>();
	const special: T[] = [];
	const other: T[] = [];
	const multiDiacritic: T[] = [];

	for (const char of entries) {
		const rawChar = rawByCp.get(char.cp);
		const baseLetter = extractBaseLetter(rawChar);
		const {diacritics, diacriticKey} = extractDiacritics(rawChar);

		if (!baseLetter) {
			if (rawChar?.cat === 'Lo') {
				other.push(char);
			} else {
				special.push(char);
			}
			continue;
		}

		if (diacritics.length > 1) {
			multiDiacritic.push(char);
			continue;
		}

		const isUpper = isUpperCase(rawChar);

		if (!rowsByDiacritic.has(diacriticKey)) {
			rowsByDiacritic.set(diacriticKey, new Map());
		}
		const row = rowsByDiacritic.get(diacriticKey)!;
		if (!row.has(baseLetter)) {
			row.set(baseLetter, {});
		}
		const cell = row.get(baseLetter)!;
		if (isUpper) {
			cell.upper = char;
		} else {
			cell.lower = char;
		}

		if (diacriticKey === '' && (!isUpper || !baseLetterCp.has(baseLetter))) {
			baseLetterCp.set(baseLetter, char.cp);
		}
		const prevFallbackMinCp = baseLetterFallbackMinCp.get(baseLetter);
		if (prevFallbackMinCp === undefined || char.cp < prevFallbackMinCp) {
			baseLetterFallbackMinCp.set(baseLetter, char.cp);
		}
	}

	const sortCpFor = (letter: string) => baseLetterCp.get(letter) ?? baseLetterFallbackMinCp.get(letter)!;

	const sortedDiacriticKeys = Array.from(rowsByDiacritic.keys()).sort((a, b) => {
		if (a === '') return -1;
		if (b === '') return 1;
		return a.localeCompare(b);
	});

	const sortBaseLetters = (a: string, b: string) => {
		if (a.length === 1 && b.length === 1) return a.localeCompare(b);
		return sortCpFor(a) - sortCpFor(b);
	};

	return {
		rows: sortedDiacriticKeys.map((diacriticKey) => ({
			diacriticKey,
			cells: rowsByDiacritic.get(diacriticKey)!,
		})),
		baseLetters: Array.from(baseLetterFallbackMinCp.keys()).sort(sortBaseLetters),
		special,
		other,
		multiDiacritic: multiDiacritic.sort((a, b) => a.cp - b.cp),
	};
}
