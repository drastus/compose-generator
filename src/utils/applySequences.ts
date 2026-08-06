import {C, COMB, DIA, GREEK_LETTERS} from '../constants/strings';
import {
	MATH_FLAGS,
	composeMathPrefix,
	defaultDiacriticMarkKeys,
	defaultDiacriticMarks,
	defaultPrefixes,
	mapDiacriticParts,
} from '../constants/mappings';
import {characters as mainCharacters} from '../data/names';
import {CharWithSeq, DiacriticMark, NameEntry} from '../types';
import {buildName} from './buildName';
import {detectConflicts} from './detectConflicts';

type Prefixes = typeof defaultPrefixes;

function getDiacriticTemplateSeq(entry: NameEntry, diacriticMarksParam: DiacriticMark[]): string | undefined {
	if (
		!entry.template
		|| entry.template.length < 4
		|| !entry.template[0].endsWith('LETTER')
		|| entry.template[2].length !== 1
	) return undefined;
	const diacriticParts = entry.template.slice(3);
	const diacriticNames = mapDiacriticParts(diacriticParts);
	const marks = diacriticNames.map((n) => diacriticMarksParam.find((m) => m.name === n));
	if (marks.some((m) => !m)) return undefined;
	const diacriticKeys = marks.map((m) => m!.key).join('');
	const letter = entry.template[1] === 'SMALL' ? entry.template[2].toLowerCase() : entry.template[2];
	return diacriticKeys + letter;
}

function getMathAlphanumericSymbolBase(entry: NameEntry): NameEntry | undefined {
	const baseLetterName = entry.template![2];
	if (baseLetterName === 'PARTIAL DIFFERENTIAL') return mainCharacters.math_operators.find((e) => e.cp === 0x2202);
	if (baseLetterName === 'NABLA') return mainCharacters.math_operators.find((e) => e.cp === 0x2207);
	if (baseLetterName === 'DOTLESS I') return mainCharacters.latin.find((e) => e.cp === 0x0131);
	if (baseLetterName === 'DOTLESS J') return mainCharacters.latin.find((e) => e.cp === 0x0237);
	if (baseLetterName === 'DIGAMMA' && entry.template?.[1] === C) return mainCharacters.greek.find((e) => e.cp === 0x03DC);
	if (baseLetterName === 'THETA SYMBOL' && entry.template?.[1] === C) return mainCharacters.greek.find((e) => e.cp === 0x03F4);
	if (baseLetterName === 'EPSILON SYMBOL') return mainCharacters.greek.find((e) => e.cp === 0x03F5);
	if (GREEK_LETTERS.includes(baseLetterName) || baseLetterName === 'DIGAMMA') {
		return mainCharacters.greek.find((e) =>
			e.template?.[0] === 'GREEK LETTER'
			&& e.template[1] === entry.template![1]
			&& (e.end === baseLetterName || e.template[2] === baseLetterName)
			&& e.defaultSeq?.toLowerCase().startsWith(defaultPrefixes.greek.char));
	}
	return mainCharacters.greek.find((e) => e.name?.endsWith(baseLetterName));
}

function getGreekSeq(baseEntry: NameEntry, diacriticKeys: string, prefixes: Prefixes, preprefix = ''): string {
	const firstChar = baseEntry.defaultSeq![0];
	const isCapital = firstChar === firstChar.toUpperCase();
	const coreSeq = prefixes.greek.cased
		? baseEntry.defaultSeq!.slice(1)
		: baseEntry.altSeq?.slice(1) ?? baseEntry.defaultSeq!.slice(1);
	const prefix = prefixes.greek.cased && isCapital
		? prefixes.greek.char.toUpperCase()
		: prefixes.greek.char;
	return preprefix + prefix + diacriticKeys + coreSeq;
}

function getCyrillicSeq(baseEntry: NameEntry, diacriticKeys: string, prefixes: Prefixes): string {
	const firstChar = baseEntry.defaultSeq![0];
	const isCapital = firstChar === firstChar.toUpperCase();
	const coreSeq = prefixes.cyrillic.cased
		? baseEntry.defaultSeq!.slice(1)
		: baseEntry.altSeq?.slice(1) ?? baseEntry.defaultSeq!.slice(1);
	const prefix = prefixes.cyrillic.cased && isCapital
		? prefixes.cyrillic.char.toUpperCase()
		: prefixes.cyrillic.char;
	return prefix + diacriticKeys + coreSeq;
}

export function applySequencesToCharacters(
	selectedCharactersParam: Record<string, NameEntry[]>,
	customSequencesParam: {key: string; seq: string; additionalSeqs?: string[]}[],
	diacriticMarksParam: DiacriticMark[],
	prefixes: Prefixes,
): Record<string, CharWithSeq[]> {
	const customMap = new Map(customSequencesParam.map((cs) => [cs.key, cs]));
	const result: Record<string, CharWithSeq[]> = {};

	for (const [groupKey, entries] of Object.entries(selectedCharactersParam)) {
		const updatedEntries = entries.map((entry) => {
			let seq: string | undefined;
			const customEntry = customMap.get(String(entry.cp));
			if (customEntry?.seq) {
				seq = customEntry.seq;
			} else if (entry.defaultSeq && !getDiacriticTemplateSeq(entry, diacriticMarksParam)) {
				let baseSeq = entry.defaultSeq;
				if (groupKey === 'greek') {
					baseSeq = prefixes.greek.cased ? entry.defaultSeq : (entry.altSeq ?? entry.defaultSeq);
				} else if (groupKey === 'cyrillic') {
					baseSeq = prefixes.cyrillic.cased ? entry.defaultSeq : (entry.altSeq ?? entry.defaultSeq);
				}
				let newSeq = baseSeq ?? '';
				if ((groupKey === 'greek' || groupKey === 'cyrillic') && newSeq.length > 0 && newSeq[0].toLowerCase() === defaultPrefixes[groupKey].char) {
					const gk = groupKey as 'greek' | 'cyrillic';
					let coreSeq = newSeq.slice(1);
					if (coreSeq.length > 1 && defaultDiacriticMarkKeys.includes(coreSeq[0])) {
						const diacriticMarkName = defaultDiacriticMarks.find((mark) => mark.key === coreSeq[0])!.name;
						const diacriticMarkKey = diacriticMarksParam.find((mark) => mark.name === diacriticMarkName)!.key;
						coreSeq = diacriticMarkKey + coreSeq.slice(1);
					}
					if (newSeq.startsWith(defaultPrefixes[gk].char)) {
						newSeq = prefixes[gk].char + coreSeq;
					} else {
						newSeq = prefixes[gk].cased
							? prefixes[gk].char.toUpperCase() + coreSeq
							: prefixes[gk].char + '\\' + coreSeq;
					}
				} else if (groupKey === 'currency' && newSeq.length > 0 && newSeq[0] === '$') {
					newSeq = prefixes.currency.char + newSeq.slice(1);
				} else if (groupKey === 'modifier' && newSeq.length > 0 && newSeq[0] === 'l') {
					newSeq = prefixes.modifierLetter.char + newSeq.slice(1);
				}
				seq = newSeq;
			} else if (
				entry.template && ((
					entry.template.length >= 3
					&& (entry.template[0].endsWith('LETTER') || entry.template[0].startsWith('MATHEMATICAL'))
					&& (entry.template[2].length === 1 || entry.template[0] === 'GREEK LETTER' || entry.template[0] === 'CYRILLIC LETTER')
				) || (
					entry.template[0] in MATH_FLAGS || entry.template[0] === DIA || entry.template[0] === COMB
				))
			) {
				const diacriticParts = entry.template.slice([DIA, COMB].includes(entry.template[0]) ? 1 : 3)
					.filter((name: string) => name !== 'ACCENT');
				const diacriticNames = mapDiacriticParts(diacriticParts);
				const diacriticMarksForChar = diacriticNames
					.map((name: string) => diacriticMarksParam.find((mark) => mark.name === name));
				if (!diacriticMarksForChar.some((mark) => !mark)) { // all diacritics found
					const diacriticKeys = diacriticMarksForChar.map((mark: DiacriticMark | undefined) => mark!.key).join('');
					if ((groupKey === 'greek' && entry.template[0] === 'GREEK LETTER')) {
						const baseLetterName = entry.template[2];
						const baseEntry = mainCharacters.greek.find((e) =>
							e.template?.[0] === 'GREEK LETTER'
							&& e.template[1] === entry.template![1]
							&& (e.end === baseLetterName || e.template[2] === baseLetterName)
							&& e.defaultSeq?.toLowerCase().startsWith(defaultPrefixes.greek.char));
						if (baseEntry?.defaultSeq) {
							seq = getGreekSeq(baseEntry, diacriticKeys, prefixes);
						}
					} else if ((groupKey === 'cyrillic' && entry.template[0] === 'CYRILLIC LETTER')) {
						const baseLetterName = entry.template[2];
						const baseEntry = selectedCharactersParam.cyrillic?.find((e) =>
							e.template?.[0] === 'CYRILLIC LETTER'
							&& e.template[1] === entry.template![1]
							&& (e.end === baseLetterName || e.template[2] === baseLetterName)
							&& e.defaultSeq?.toLowerCase().startsWith(defaultPrefixes.cyrillic.char));
						if (baseEntry?.defaultSeq) {
							seq = getCyrillicSeq(baseEntry, diacriticKeys, prefixes);
						}
					} else if (groupKey === 'math_alphanumerics' && entry.template[2].length > 1) {
						const baseEntry = getMathAlphanumericSymbolBase(entry);
						if (baseEntry) {
							const flags = MATH_FLAGS[entry.template[0]];
							let preprefix = composeMathPrefix(prefixes.math, flags ?? {});
							const hasStandardGreekLetter = [...GREEK_LETTERS, 'DIGAMMA'].includes(entry.template[2].split(' ')[0]);
							if (hasStandardGreekLetter || [0x03C2, 0x2202].includes(baseEntry.cp)) {
								preprefix = preprefix.charAt(0).toUpperCase() + preprefix.slice(1);
							}
							if (hasStandardGreekLetter) {
								seq = getGreekSeq(baseEntry, diacriticKeys, prefixes, preprefix);
							} else {
								const baseSeq = getDiacriticTemplateSeq(baseEntry, diacriticMarksParam) ?? baseEntry.defaultSeq;
								seq = preprefix + baseSeq;
							}
						}
					} else {
						let prefix = '';
						if (entry.template[0] === DIA) {
							prefix = prefixes.dia.char;
						} else if (entry.template[0] === COMB) {
							prefix = prefixes.comb.char;
						} else if (entry.template[0] in MATH_FLAGS) {
							prefix = composeMathPrefix(prefixes.math, MATH_FLAGS[entry.template[0]]);
						}
						let baseLetter = [DIA, COMB].includes(entry.template[0]) ? '' : entry.template[2];
						if (entry.template[1] === 'SMALL') {
							baseLetter = baseLetter.toLowerCase();
						}
						seq = prefix + diacriticKeys + baseLetter;
					}
				}
			}
			const additionalSeqs = customEntry?.additionalSeqs?.filter(Boolean);
			return {
				cp: entry.cp,
				name: buildName(entry),
				seq,
				additionalSeqs: additionalSeqs && additionalSeqs.length > 0 ? additionalSeqs : undefined,
			};
		});
		result[groupKey] = updatedEntries;
	}

	const allChars = Object.values(result).flat();
	const conflictMap = detectConflicts(allChars);

	for (const groupKey of Object.keys(result)) {
		result[groupKey] = result[groupKey].map((char) => ({
			...char,
			conflicts: conflictMap.get(char.cp),
		}));
	}

	return result;
}
