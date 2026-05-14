import {C, COMB, DIA, GREEK_LETTERS} from '../constants/strings';
import {
	defaultDiacriticMarkKeys,
	defaultDiacriticMarks,
	defaultPrefixes,
	mapDiacriticParts,
	scriptPrefixes,
} from '../constants/mappings';
import {characters as mainCharacters} from '../data/names';
import {CharWithSeq, DiacriticMark, NameEntry} from '../types';
import {buildName} from './buildName';
import {detectConflicts} from './detectConflicts';

type Prefixes = typeof defaultPrefixes;

function getMathAlphanumericSymbolBase(entry: NameEntry): NameEntry | undefined {
	const baseLetterName = entry.template![2];
	if (baseLetterName === 'PARTIAL DIFFERENTIAL') return mainCharacters.math_operators.find((e) => e.cp === 0x2202);
	if (baseLetterName === 'NABLA') return mainCharacters.math_operators.find((e) => e.cp === 0x2207);
	if (baseLetterName === 'DOTLESS I') return mainCharacters.latin.find((e) => e.cp === 0x0131);
	if (baseLetterName === 'DOTLESS J') return mainCharacters.latin.find((e) => e.cp === 0x0237);
	if (baseLetterName === 'DIGAMMA' && entry.template?.[1] === C) return mainCharacters.greek.find((e) => e.cp === 0x03DC);
	if (baseLetterName === 'THETA SYMBOL' && entry.template?.[1] === C) return mainCharacters.greek.find((e) => e.cp === 0x03F4);
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
	customSequencesParam: {key: string; seq: string}[],
	diacriticMarksParam: DiacriticMark[],
	prefixes: Prefixes,
): Record<string, CharWithSeq[]> {
	const customMap = new Map(customSequencesParam.map((cs) => [cs.key, cs.seq]));
	const result: Record<string, CharWithSeq[]> = {};

	for (const [groupKey, entries] of Object.entries(selectedCharactersParam)) {
		const updatedEntries = entries.map((entry) => {
			let seq: string | undefined;
			const customSeq = customMap.get(String(entry.cp));
			if (customSeq) {
				seq = customSeq;
			} else if (entry.defaultSeq) {
				let baseSeq = entry.defaultSeq;
				if (['greek', 'cyrillic'].includes(groupKey)) {
					baseSeq = prefixes[groupKey as keyof typeof prefixes].cased ? entry.defaultSeq : (entry.altSeq ?? entry.defaultSeq);
				}
				let newSeq = baseSeq ?? '';
				if (['greek', 'cyrillic'].includes(groupKey) && newSeq.length > 0 && newSeq[0].toLowerCase() === defaultPrefixes[groupKey as keyof typeof defaultPrefixes].char) {
					let coreSeq = newSeq.slice(1);
					if (coreSeq.length > 1 && defaultDiacriticMarkKeys.includes(coreSeq[0])) {
						const diacriticMarkName = defaultDiacriticMarks.find((mark) => mark.key === coreSeq[0])!.name;
						const diacriticMarkKey = diacriticMarksParam.find((mark) => mark.name === diacriticMarkName)!.key;
						coreSeq = diacriticMarkKey + coreSeq.slice(1);
					}
					if (newSeq.startsWith(defaultPrefixes[groupKey as keyof typeof defaultPrefixes].char)) {
						newSeq = prefixes[groupKey as keyof typeof prefixes].char + coreSeq;
					} else {
						newSeq = prefixes[groupKey as keyof typeof prefixes].cased
							? prefixes[groupKey as keyof typeof prefixes].char.toUpperCase() + coreSeq
							: prefixes[groupKey as keyof typeof prefixes].char + '\\' + coreSeq;
					}
				}
				seq = newSeq;
			} else if (
				entry.template && ((
					entry.template.length >= 3
					&& (entry.template[0].endsWith('LETTER') || entry.template[0].startsWith('MATHEMATICAL'))
					&& (entry.template[2].length === 1 || entry.template[0] === 'GREEK LETTER' || entry.template[0] === 'CYRILLIC LETTER')
				) || (
					Object.keys(scriptPrefixes).includes(entry.template[0])
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
							let preprefix = scriptPrefixes[entry.template[0] as keyof typeof scriptPrefixes];
							const hasStandardGreekLetter = [...GREEK_LETTERS, 'DIGAMMA'].includes(entry.template[2].split(' ')[0]);
							if (hasStandardGreekLetter || [0x03C2, 0x2202].includes(baseEntry.cp)) {
								preprefix = preprefix.charAt(0).toUpperCase() + preprefix.slice(1);
							}
							seq = hasStandardGreekLetter
								? getGreekSeq(baseEntry, diacriticKeys, prefixes, preprefix)
								: preprefix + baseEntry.defaultSeq;
						}
					} else {
						let prefix = '';
						if (Object.keys(scriptPrefixes).includes(entry.template[0])) {
							prefix = scriptPrefixes[entry.template[0] as keyof typeof scriptPrefixes];
						}
						let baseLetter = [DIA, COMB].includes(entry.template[0]) ? '' : entry.template[2];
						if (entry.template[1] === 'SMALL') {
							baseLetter = baseLetter.toLowerCase();
						}
						seq = prefix + diacriticKeys + baseLetter;
					}
				}
			}
			return {
				cp: entry.cp,
				name: buildName(entry),
				seq,
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
