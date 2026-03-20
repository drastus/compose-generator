import {Fragment, useState, useCallback, useMemo, useRef, useEffect} from 'react';
import {buildName} from './utils/buildName';
import {
	ACUTE,
	BREVE,
	C,
	CIRCUMFLEX,
	COMB,
	DASIA,
	DIA,
	DIAERESIS,
	DIALYTIKA,
	GRAVE,
	GREEK_LETTERS,
	MB,
	MBF,
	MBI,
	MBS,
	MDS,
	MF,
	MI,
	MM,
	MS,
	MSS,
	MSSB,
	MSSBI,
	MSSI,
	OXIA,
	PERISPOMENI,
	PROSGEGRAMMENI,
	PSILI,
	TONOS,
	VARIA,
	VRACHY,
	YPOGEGRAMMENI,
} from './constants';
import {characters} from './names';
import {CharWithSeq, NameEntry} from './types';
import AddingModal from './AddingModal';
import CharactersContainer from './CharactersContainer';
import CharactersTable from './CharactersTable';
import Checkbox from './Checkbox';
import Footer from './Footer';
import Modal from './Modal';
import './index.css';

const scriptsGroups: {label: string; keys: string[]; description: string}[] = [
	{label: 'Modifier letters', keys: ['modifier'], description: 'Spacing modifier letters used for phonetic/diacritic purposes.'},
	{label: 'Combining diacritical marks', keys: ['combining'], description: 'Non-spacing combining marks to modify preceding characters.'},
	{label: 'Latin alphabet', keys: ['latin'], description: 'Basic and extended Latin letters commonly used in European languages.'},
	{label: 'Greek alphabet', keys: ['greek'], description: 'Greek letters including basic forms.'},
	{label: 'Cyrillic alphabet', keys: ['cyrillic'], description: 'Cyrillic letters used by Slavic and other languages.'},
];
const symbolsGroups: {label: string; keys: string[]; description: string}[] = [
	{label: 'Punctuation', keys: ['punctuation_separators', 'punctuation'], description: 'Common punctuation including separators (space-like) and general marks.'},
	{label: 'Mathematical symbols', keys: ['math_operators', 'math_number', 'math_alphanumeric_symbols'], description: 'Operators and number-related math symbols.'},
	{label: 'Currency', keys: ['currency'], description: 'Currency signs such as €, £, ¥.'},
	{label: 'Miscellaneous', keys: ['misc'], description: 'Various symbols that do not fit other categories.'},
	{label: 'Format', keys: ['format'], description: 'Invisible formatting and control characters.'},
];

interface DiacriticMark {
	name: string,
	mark: string,
	key: string,
}

const defaultDiacriticMarks: DiacriticMark[] = [
	{name: 'grave', mark: '`', key: '`'},
	{name: 'acute', mark: '´', key: '\''},
	{name: 'circumflex', mark: '^', key: '>'},
	{name: 'tilde', mark: '~', key: '~'},
	{name: 'diaeresis', mark: '¨', key: ':'},
	{name: 'ring above', mark: '˚', key: '0'},
	{name: 'cedilla', mark: '¸', key: ';'},
	{name: 'stroke', mark: '̷', key: '/'},
	{name: 'ogonek', mark: '˛', key: '6'},
	{name: 'breve', mark: '˘', key: '('},
	{name: 'dot above', mark: '˙', key: '.'},
	{name: 'macron', mark: '¯', key: '-'},
	{name: 'caron', mark: 'ˇ', key: '<'},
	{name: 'dot below', mark: '̣', key: '!'},
	{name: 'hook above', mark: '̉', key: '?'},
	{name: 'hook', mark: '̡', key: '3'},
	{name: 'horn', mark: '̛', key: '9'},
	{name: 'inverted breve', mark: '̑', key: ')'},
	{name: 'double grave', mark: '̏', key: '``'},
	{name: 'double acute', mark: '˝', key: '"'},
	{name: 'comma below', mark: '̦', key: ','},
	{name: 'ypogegrammeni', mark: 'ͅ', key: '_i'},
];
const defaultDiacriticMarkKeys = defaultDiacriticMarks.map((mark) => mark.key);

const mapDiacriticParts = (parts: string[]) => (
	parts.map((part) => {
		if (part === DASIA) return 'ogonek';
		if (part === PSILI) return 'horn';
		if (part === DIALYTIKA || part === DIAERESIS) return 'diaeresis';
		if (part === VARIA || part === GRAVE) return 'grave';
		if (part === OXIA || part === TONOS || part === ACUTE) return 'acute';
		if (part === PERISPOMENI || part === CIRCUMFLEX) return 'circumflex';
		if (part === VRACHY || part === BREVE) return 'breve';
		if (part === YPOGEGRAMMENI || part === PROSGEGRAMMENI) return 'ypogegrammeni';
		return part.toLowerCase().replace('_', ' ');
	})
);

const scriptPrefixes = {
	[DIA]: 'd',
	[COMB]: '&',
	[MBS]: 's*',
	[MS]: 's',
	[MBF]: 'f*',
	[MF]: 'f',
	[MDS]: '2',
	[MSSBI]: '0*/',
	[MSSB]: '0*',
	[MSSI]: '0/',
	[MSS]: '0',
	[MBI]: 'm*/',
	[MB]: 'm*',
	[MI]: 'm/',
	[MM]: 'm',
};

const latinPrefixLetters = 'abcdefghijklmnopqrstuvwxyz'.split('');

const casedPrefixOptions = latinPrefixLetters.map((letter) => {
	const upper = letter.toUpperCase();
	return {value: letter, label: `${letter} / ${upper}`};
});

const uncasedPrefixOptions = latinPrefixLetters.flatMap((letter) => {
	const upper = letter.toUpperCase();
	return [
		{value: letter, label: letter},
		{value: upper, label: upper},
	];
});

type SetSelectionState = Record<string, Record<string, boolean | undefined>>;

const initialSetSelection: SetSelectionState = {
	latin: {base: true, ext: true, historic: false},
	greek: {basic: true, base: false, historic: false},
	cyrillic: {base: true},
	math_alphanumeric_symbols: {
		mbs: false,
		ms: false,
		mbf: false,
		mf: false,
		mds: undefined,
		mds_base: true,
		mssbi: false,
		mssb: false,
		mssi: false,
		mss: false,
		mbi: false,
		mb: false,
		mi: false,
		mm: false,
	},
};

const greekCodePoints = new Set((characters.greek ?? []).map((entry) => entry.cp));
const cyrillicCodePoints = new Set((characters.cyrillic ?? []).map((entry) => entry.cp));

const keySymNames: Record<string, string> = {
	' ': 'space',
	'!': 'exclam',
	'"': 'quotedbl',
	'#': 'numbersign',
	$: 'dollar',
	'%': 'percent',
	'&': 'ampersand',
	'\'': 'apostrophe',
	'(': 'parenleft',
	')': 'parenright',
	'*': 'asterisk',
	'+': 'plus',
	',': 'comma',
	'-': 'minus',
	'.': 'period',
	'/': 'slash',
	':': 'colon',
	';': 'semicolon',
	'<': 'less',
	'=': 'equal',
	'>': 'greater',
	'?': 'question',
	'@': 'at',
	'[': 'bracketleft',
	'\\': 'backslash',
	']': 'bracketright',
	'^': 'asciicircum',
	_: 'underscore',
	'`': 'grave',
	'{': 'braceleft',
	'|': 'bar',
	'}': 'braceright',
	'~': 'asciitilde',
};

const defaultPrefixes = {
	greek: {char: 'g', cased: true},
	cyrillic: {char: 'c', cased: true},
};

function App() {
	const [showModal, setShowModal] = useState(false);
	const [modalContent, setModalContent] = useState('');
	const [modalMode, setModalMode] = useState<'preview' | 'addSequence' | null>(null);
	const [modalGroups, setModalGroups] = useState<string[]>([]);
	const [availableCharacters, setAvailableCharacters] = useState<Record<string, NameEntry[]>>(characters);
	const [diacriticMarks, setDiacriticMarks] = useState<DiacriticMark[]>(defaultDiacriticMarks);
	const [customSequences, setCustomSequences] = useState<{key: string; seq: string}[]>([]);
	const [prefixes, setPrefixes] = useState(defaultPrefixes);
	const prevPrefixesRef = useRef(prefixes);
	const defaultCharacters: Record<string, NameEntry[]> = Object.fromEntries(Object.entries(characters).map(([key, entries]) => [
		key,
		entries.filter((entry) => {
			if (!entry.set || entry.set.length === 0) return false;
			if (key === 'latin') {
				const selection = initialSetSelection.latin;
				return entry.set.some((s) => selection[s] ?? false);
			}
			if (key === 'greek') {
				const selection = initialSetSelection.greek;
				return entry.set.some((s) => selection[s] ?? false);
			}
			if (key === 'math_alphanumeric_symbols') {
				return entry.set.includes('mds_base');
			}
			return entry.set.includes('base');
		}),
	]));
	const [selectedCharacters, setSelectedCharacters] = useState(defaultCharacters);

	const computeSetSelection = useCallback((
		selectedCharactersParam: Record<string, NameEntry[]>,
	): SetSelectionState => {
		const next: SetSelectionState = {};

		Object.keys(initialSetSelection).forEach((group) => {
			const entries = availableCharacters[group] ?? [];
			const selected = selectedCharactersParam[group] ?? [];
			const selectedSet = new Set(selected.map((e) => e.cp));
			const selection = initialSetSelection[group];
			const nextSelection: Record<string, boolean | undefined> = {...selection};

			Object.keys(selection).forEach((setKey) => {
				const allEntries = entries.filter((e) => (e.set ?? []).includes(setKey));
				const total = allEntries.length;
				if (total === 0) {
					nextSelection[setKey] = false;
					return;
				}
				const selectedCount = allEntries.filter((e) => selectedSet.has(e.cp)).length;
				if (selectedCount === 0) {
					nextSelection[setKey] = false;
				} else if (selectedCount === total) {
					nextSelection[setKey] = true;
				} else {
					nextSelection[setKey] = undefined;
				}
			});

			next[group] = nextSelection;
		});

		return next;
	}, [availableCharacters]);

	const setSelection = useMemo(() => computeSetSelection(selectedCharacters), [computeSetSelection, selectedCharacters]);

	const buildSetSelection = useCallback(<K extends keyof SetSelectionState & keyof typeof characters>(
		category: K,
		selection: SetSelectionState[K],
	) => availableCharacters[category].filter((entry) => {
		if (!entry.set || entry.set.length === 0) {
			return selectedCharacters[category].find((c) => c.cp === entry.cp) !== undefined;
		}
		let indeterminate = false;
		for (const s of entry.set) {
			const value = selection[s];
			if (value) {
				return true;
			}
			if (value === undefined) {
				indeterminate = true;
			}
		}
		if (indeterminate) {
			return selectedCharacters[category].find((c) => c.cp === entry.cp) !== undefined;
		}
		return false;
	}), [availableCharacters, selectedCharacters]);

	const handleDiacriticKeyChange = useCallback((index: number, newKey: string) => {
		setDiacriticMarks((prev) => {
			const updated = [...prev];
			updated[index] = {...updated[index], key: newKey};
			return updated;
		});
	}, []);

	const handleSequenceChange = useCallback((cpKey: string, seq: string) => {
		setCustomSequences((prev) => {
			const withoutCurrent = prev.filter((cs) => cs.key !== cpKey);
			if (!seq) {
				return withoutCurrent;
			}
			return [...withoutCurrent, {key: cpKey, seq}];
		});
	}, []);

	const handleRemoveSequence = useCallback((cpKey: string) => {
		setSelectedCharacters((prev) => {
			const cp = Number(cpKey);
			const next: typeof prev = {} as typeof prev;
			for (const [groupKey, entries] of Object.entries(prev)) {
				next[groupKey] = entries.filter((entry) => entry.cp !== cp);
			}
			return next;
		});
		setCustomSequences((prev) => prev.filter((cs) => cs.key !== cpKey));
	}, []);

	const isGroupChecked = useMemo(() => (
		(keys: (keyof typeof defaultCharacters)[]) => keys.every((k) => selectedCharacters[k]?.length > 0)
	), [selectedCharacters]);
	const hasAnyInGroup = useMemo(() => (
		(keys: (keyof typeof defaultCharacters)[]) => keys.some((k) => selectedCharacters[k]?.length > 0)
	), [selectedCharacters]);

	const handleAddSequence = useCallback((groups: string[]) => {
		setModalMode('addSequence');
		setModalGroups(groups);
		setShowModal(true);
	}, []);

	const closeModal = useCallback(() => {
		setShowModal(false);
		setModalMode(null);
		setModalGroups([]);
	}, []);

	/* excluding Latin latters and digits */
	const getMathAlphanumericSymbolBase = (entry: NameEntry) => {
		const baseLetterName = entry.template![2];
		if (baseLetterName === 'PARTIAL DIFFERENTIAL') return characters.math_operators.find((e) => e.cp === 0x2202);
		if (baseLetterName === 'NABLA') return characters.math_operators.find((e) => e.cp === 0x2207);
		if (baseLetterName === 'DOTLESS I') return characters.latin.find((e) => e.cp === 0x0131);
		if (baseLetterName === 'DOTLESS J') return characters.latin.find((e) => e.cp === 0x0237);
		if (baseLetterName === 'DIGAMMA' && entry.template?.[1] === C) return characters.greek.find((e) => e.cp === 0x03DC);
		if (GREEK_LETTERS.includes(baseLetterName) || baseLetterName === 'FINAL SIGMA' || baseLetterName === 'DIGAMMA') {
			return characters.greek.find((e) =>
				e.template?.[0] === 'GREEK LETTER'
				&& e.template[1] === entry.template![1]
				&& (e.end === baseLetterName || e.template[2] === baseLetterName)
				&& e.defaultSeq?.toLowerCase().startsWith(defaultPrefixes.greek.char));
		}
		return characters.greek.find((e) => e.name?.endsWith(baseLetterName));
	};

	const getGreekSeq = useCallback((baseEntry: NameEntry, diacriticKeys: string, preprefix = '') => {
		const firstChar = baseEntry.defaultSeq![0];
		const isCapital = firstChar === firstChar.toUpperCase();
		const coreSeq = prefixes.greek.cased
			? baseEntry.defaultSeq!.slice(1)
			: baseEntry.altSeq?.slice(1) ?? baseEntry.defaultSeq!.slice(1);
		const prefix = prefixes.greek.cased && isCapital
			? prefixes.greek.char.toUpperCase()
			: prefixes.greek.char;
		return preprefix + prefix + diacriticKeys + coreSeq;
	}, [prefixes.greek.cased, prefixes.greek.char]);

	const handleApplySequences = useCallback(() => {
		setSelectedCharacters((prev) => {
			const next = {...prev};
			modalGroups.forEach((groupKey) => {
				const all = availableCharacters[groupKey] ?? [];
				if (!all.length) return;
				const existingSet = new Set((next[groupKey] ?? []).map((e) => e.cp));
				const toAdd = all.filter((entry) => {
					if (existingSet.has(entry.cp)) return false;
					const key = String(entry.cp);
					const seq = customSequences.find((cs) => cs.key === key)?.seq ?? '';
					return Boolean(seq);
				});
				if (toAdd.length > 0) {
					next[groupKey] = [...(next[groupKey] ?? []), ...toAdd];
				}
			});
			return next;
		});
		setShowModal(false);
		setModalMode(null);
		setModalGroups([]);
	}, [availableCharacters, customSequences, modalGroups]);

	const detectConflicts = useCallback((allCharsWithSeq: CharWithSeq[]): Map<number, number[]> => {
		const conflicts = new Map<number, number[]>();
		const seqMap = new Map<string, number[]>();

		// Group characters by sequence
		for (const char of allCharsWithSeq) {
			if (!char.seq) continue;
			const existing = seqMap.get(char.seq) || [];
			seqMap.set(char.seq, [...existing, char.cp]);
		}

		// Check for conflicts
		for (const char of allCharsWithSeq) {
			if (!char.seq) continue;
			const conflictingCps = new Set<number>();

			// Check for exact duplicates
			const duplicates = seqMap.get(char.seq) || [];
			if (duplicates.length > 1) {
				for (const cp of duplicates) {
					if (cp !== char.cp) {
						conflictingCps.add(cp);
					}
				}
			}

			// Check if this sequence is a prefix of another sequence
			for (const [otherSeq, otherCps] of seqMap.entries()) {
				if (otherSeq === char.seq) continue;
				if (otherSeq.startsWith(char.seq)) {
					for (const cp of otherCps) {
						conflictingCps.add(cp);
					}
				}
			}

			// Check if another sequence is a prefix of this sequence
			for (const [otherSeq, otherCps] of seqMap.entries()) {
				if (otherSeq === char.seq) continue;
				if (char.seq.startsWith(otherSeq)) {
					for (const cp of otherCps) {
						conflictingCps.add(cp);
					}
				}
			}

			if (conflictingCps.size > 0) {
				conflicts.set(char.cp, Array.from(conflictingCps));
			}
		}

		return conflicts;
	}, []);

	const applySequencesToCharacters = useCallback((
		selectedCharactersParam: Record<string, NameEntry[]>,
		customSequencesParam: {key: string; seq: string}[],
		diacriticMarksParam: DiacriticMark[],
	): Record<string, CharWithSeq[]> => {
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
							const diacriticMarkKey = diacriticMarks.find((mark) => mark.name === diacriticMarkName)!.key;
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
						&& (entry.template[2].length === 1 || entry.template[0] === 'GREEK LETTER')
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
							const baseEntry = characters.greek.find((e) =>
								e.template?.[0] === 'GREEK LETTER'
								&& e.template[1] === entry.template![1]
								&& (e.end === baseLetterName || e.template[2] === baseLetterName)
								&& e.defaultSeq?.toLowerCase().startsWith(defaultPrefixes.greek.char));
							if (baseEntry?.defaultSeq) {
								seq = getGreekSeq(baseEntry, diacriticKeys);
							}
						} else if (groupKey === 'math_alphanumeric_symbols' && entry.template[2].length > 1) {
							const baseEntry = getMathAlphanumericSymbolBase(entry);
							if (baseEntry) {
								const preprefix = scriptPrefixes[entry.template[0] as keyof typeof scriptPrefixes];
								seq = GREEK_LETTERS.includes(entry.template[2].split(' ')[0])
									? getGreekSeq(baseEntry, diacriticKeys, preprefix)
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

		// Detect conflicts across all characters
		const allChars = Object.values(result).flat();
		const conflictMap = detectConflicts(allChars);

		// Add conflict information to each character
		for (const groupKey of Object.keys(result)) {
			result[groupKey] = result[groupKey].map((char) => ({
				...char,
				conflicts: conflictMap.get(char.cp),
			}));
		}

		return result;
	}, [diacriticMarks, getGreekSeq, prefixes, detectConflicts]);

	const selectedCharactersWithSequences = useMemo(
		() => applySequencesToCharacters(selectedCharacters, customSequences, diacriticMarks),
		[selectedCharacters, customSequences, diacriticMarks, applySequencesToCharacters],
	);

	useEffect(() => {
		const prev = prevPrefixesRef.current;
		if (prev.greek.char === prefixes.greek.char && prev.cyrillic.char === prefixes.cyrillic.char) {
			return;
		}

		setCustomSequences((prevCustom) => {
			if (prevCustom.length === 0) return prevCustom;
			let changed = false;
			const updated = prevCustom.map((cs) => {
				const cp = Number(cs.key);
				let {seq} = cs;
				if (!seq || Number.isNaN(cp)) return cs;

				if (prev.greek.char !== prefixes.greek.char && greekCodePoints.has(cp)) {
					const prevLower = prev.greek.char;
					const prevUpper = prevLower.toUpperCase();
					const prevWithSlash = `${prevLower}\\`;
					let replaced = false;

					if (seq.startsWith(prevLower)) {
						// lower-case prefix -> always new lower-case char
						seq = prefixes.greek.char + seq.slice(1);
						replaced = true;
					} else if (seq.startsWith(prevUpper)) {
						// upper-case prefix -> respect current cased flag
						seq = (prefixes.greek.cased ? prefixes.greek.char.toUpperCase() : `${prefixes.greek.char}\\`) + seq.slice(1);
						replaced = true;
					} else if (seq.startsWith(prevWithSlash)) {
						// "char\\" prefix -> also respect current cased flag
						const replacement = prefixes.greek.cased ? prefixes.greek.char.toUpperCase() : `${prefixes.greek.char}\\`;
						seq = replacement + seq.slice(prevWithSlash.length);
						replaced = true;
					}

					if (replaced) {
						changed = true;
						return {...cs, seq};
					}
				}

				if (prev.cyrillic.char !== prefixes.cyrillic.char && cyrillicCodePoints.has(cp)) {
					const prevLower = prev.cyrillic.char;
					const prevUpper = prevLower.toUpperCase();
					const prevWithSlash = `${prevLower}\\`;
					let replaced = false;

					if (seq.startsWith(prevLower)) {
						seq = prefixes.cyrillic.char + seq.slice(1);
						replaced = true;
					} else if (seq.startsWith(prevUpper)) {
						seq = (prefixes.cyrillic.cased ? prefixes.cyrillic.char.toUpperCase() : `${prefixes.cyrillic.char}\\`) + seq.slice(1);
						replaced = true;
					} else if (seq.startsWith(prevWithSlash)) {
						const replacement = prefixes.cyrillic.cased ? prefixes.cyrillic.char.toUpperCase() : `${prefixes.cyrillic.char}\\`;
						seq = replacement + seq.slice(prevWithSlash.length);
						replaced = true;
					}

					if (replaced) {
						changed = true;
						return {...cs, seq};
					}
				}

				return cs;
			});
			return changed ? updated : prevCustom;
		});

		prevPrefixesRef.current = prefixes;
	}, [prefixes]);

	const handleGroupToggle = (keys: (keyof typeof defaultCharacters)[]) => {
		console.log('handleGroupToggle', keys);
		setSelectedCharacters((prev) => {
			const next = {...prev};
			const currentlyChecked = keys.every((k) => prev[k]?.length > 0);
			keys.forEach((k) => {
				if (k === 'latin') {
					next.latin = currentlyChecked ? [] : buildSetSelection('latin', setSelection.latin);
				} else if (k === 'greek') {
					next.greek = currentlyChecked ? [] : buildSetSelection('greek', setSelection.greek);
				} else {
					if (!defaultCharacters[k]) {
						import(`./names-${k}.ts`).then((mod) => {
							setAvailableCharacters((current) => ({
								...current,
								[k]: mod.characters[k] ?? [],
							}));
							setSelectedCharacters((current) => ({
								...current,
								[k]: currentlyChecked ? [] : (mod.characters[k] ?? []).filter((entry: NameEntry) => entry.set?.includes('base')),
							}));
						});
						return;
					}
					next[k] = currentlyChecked ? [] : (defaultCharacters[k] ?? []);
				}
			});
			return next;
		});
	};

	const handleSetSelectionToggle = <K extends keyof SetSelectionState & keyof typeof defaultCharacters>(
		group: K,
		setKey: keyof SetSelectionState[K],
	) => {
		const groupSelection = setSelection[group];
		const current = groupSelection[setKey];
		const isTurningOn = current === false;
		const setKeyStr = String(setKey);
		const [maybeParentKey] = setKeyStr.split('_');
		const isChildSet = setKeyStr.includes('_') && maybeParentKey in groupSelection;
		const isParentSet = Object.keys(groupSelection).some((key) => key.startsWith(`${setKeyStr}_`));

		setSelectedCharacters((prevChars) => {
			const prevGroupEntries = prevChars[group] ?? [];

			if (isTurningOn) {
				const allEntriesForSet = (characters[group] ?? []).filter((entry) => (entry.set ?? []).includes(setKey as string));
				const existingSet = new Set(prevGroupEntries.map((e) => e.cp));
				const toAdd = allEntriesForSet.filter((entry) => !existingSet.has(entry.cp));
				return {
					...prevChars,
					[group]: [...prevGroupEntries, ...toAdd],
				};
			}

			// Turning a set off:
			// - For child sets (e.g. "mds_base" when "mds" exists), remove all characters
			//   that belong to this child set, regardless of other sets.
			// - For parent sets (e.g. "mds"), remove all characters that belong to the
			//   parent set, regardless of child sets, so children become indeterminate.
			// - For independent sets, remove only characters in this set that are not
			//   also covered by any other still-active set.
			let nextGroupEntries: NameEntry[];
			if (isChildSet || isParentSet) {
				// Strict removal for parent/child relationships.
				nextGroupEntries = prevGroupEntries.filter((entry) => {
					if (!entry.set || entry.set.length === 0) {
						return true;
					}
					return !entry.set.includes(setKeyStr);
				});
			} else {
				// Independent set: only remove if this is the *only* active set for the entry.
				const stillActiveSetKeys = Object.keys(groupSelection).filter((key) => {
					if (key === setKeyStr) return false;
					return groupSelection[key as keyof typeof groupSelection] !== false;
				});
				nextGroupEntries = prevGroupEntries.filter((entry) => {
					if (!entry.set || entry.set.length === 0) {
						return true;
					}
					if (!entry.set.includes(setKeyStr)) {
						return true;
					}
					// Keep the entry if it also belongs to any other still-active set.
					return entry.set.some((s) => stillActiveSetKeys.includes(s));
				});
			}

			return {
				...prevChars,
				[group]: nextGroupEntries,
			};
		});
	};

	const formatSequence = (sequence: CharWithSeq) => {
		const getKeyName = (key: string) => keySymNames[key] || key;

		const keys = sequence.seq!
			.split('')
			.map((k: string) => `<${getKeyName(k)}>`)
			.join(' ');

		const char = String.fromCodePoint(sequence.cp);
		const codePoint = sequence.cp.toString(16).toUpperCase().padStart(4, '0');

		return `<Multi_key> ${keys} \t: "${char}"\tU${codePoint} # ${sequence.name}`;
	};

	const getGeneratedContent = useCallback(
		() => Object.values(selectedCharactersWithSequences)
			.flat()
			.filter((char) => char.seq)
			.map(formatSequence)
			.join('\n'),
		[selectedCharactersWithSequences],
	);

	const handleGenerate = () => {
		const content = getGeneratedContent();
		const blob = new Blob([content], {type: 'text/plain'});
		const url = URL.createObjectURL(blob);

		const a = document.createElement('a');
		a.href = url;
		a.download = 'Compose';
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	};

	const handlePreview = () => {
		setModalMode('preview');
		setModalContent(getGeneratedContent());
		setShowModal(true);
	};

	const selectedCount = Object.values(selectedCharactersWithSequences).flat().length;

	const conflictCount = useMemo(() => Object.values(selectedCharactersWithSequences)
		.flat()
		.filter((char) => char.conflicts && char.conflicts.length > 0)
		.length, [selectedCharactersWithSequences]);

	const allCharacters = useMemo(
		() => Object.values(selectedCharactersWithSequences).flat(),
		[selectedCharactersWithSequences],
	);

	const commonTableAttributes = useMemo(() => ({
		allCharacters,
		customSequences,
		onSequenceChange: handleSequenceChange,
		onRemoveSequence: handleRemoveSequence,
	}), [allCharacters, customSequences, handleRemoveSequence, handleSequenceChange]);

	return (
		<Fragment>
			<main className='container' style={{paddingBottom: '80px'}}>
				<h1>Compose Generator</h1>
				<section>
					<h2>Scripts</h2>
					<div className='filters'>
						{scriptsGroups.map((g) => {
							const id = `script-${g.label.toLowerCase().replace(/\s+/g, '-')}`;
							return (
								<div key={g.label} style={{marginBottom: '0.5rem'}}>
									<input
										id={id}
										type='checkbox'
										checked={isGroupChecked(g.keys)}
										onChange={() => handleGroupToggle(g.keys)}
									/>
									<label htmlFor={id} style={{cursor: 'pointer'}}>
										{g.label}
									</label>
									<div className='description'>{g.description}</div>
								</div>
							);
						})}
					</div>
					<section>
						<h3>Diacritic Marks</h3>
						<table className='diacritic-table'>
							<thead>
								<tr>
									<th>Name</th>
									<th>Mark</th>
									<th>Key</th>
								</tr>
							</thead>
							<tbody>
								{diacriticMarks.filter((mark) => mark.name !== 'ypogegrammeni' || setSelection.greek.historic !== false).map((mark, index) => (
									<tr key={mark.name}>
										<td>{mark.name}</td>
										<td>{mark.mark}</td>
										<td>
											<input
												type='text'
												value={mark.key}
												maxLength={2}
												className='key-input'
												onChange={(e) => handleDiacriticKeyChange(index, e.target.value)}
											/>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</section>
					<section>
						{selectedCharacters.modifier.length > 0 && (
							<Fragment>
								<div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem'}}>
									<h3>Modifier letters</h3>
								</div>
								<CharactersContainer
									charactersNumber={selectedCharacters.modifier.length}
									onAddSequence={() => handleAddSequence(['modifier'])}
								>
									<CharactersTable
										entries={selectedCharactersWithSequences.modifier}
										{...commonTableAttributes}
									/>
								</CharactersContainer>
							</Fragment>
						)}
					</section>
					<section>
						{selectedCharacters.combining.length > 0 && (
							<Fragment>
								<div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem'}}>
									<h3>Combining diacritical marks</h3>
								</div>
								<CharactersContainer
									charactersNumber={selectedCharacters.combining.length}
									onAddSequence={() => handleAddSequence(['combining'])}
								>
									<CharactersTable
										entries={selectedCharactersWithSequences.combining}
										{...commonTableAttributes}
									/>
								</CharactersContainer>
							</Fragment>
						)}
					</section>
					<section>
						{selectedCharacters.latin.length > 0 && (
							<Fragment>
								<div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem'}}>
									<h3>Latin alphabet</h3>
								</div>
								<CharactersContainer
									charactersNumber={selectedCharacters.latin.length}
									onAddSequence={() => handleAddSequence(['latin'])}
								>
									<div className='filters'>
										<Checkbox
											id='latin-base'
											isChecked={setSelection.latin.base === true}
											isIndeterminate={setSelection.latin.base === undefined}
											label='Basic Latin'
											description='Base Latin letters commonly used in modern European languages.'
											onChange={() => handleSetSelectionToggle('latin', 'base')}
										/>
										<Checkbox
											id='latin-ext'
											isChecked={setSelection.latin.ext === true}
											isIndeterminate={setSelection.latin.ext === undefined}
											label='Extended Latin'
											description='Additional Latin letters for extended orthographies.'
											onChange={() => handleSetSelectionToggle('latin', 'ext')}
										/>
										<Checkbox
											id='latin-historic'
											isChecked={setSelection.latin.historic === true}
											isIndeterminate={setSelection.latin.historic === undefined}
											label='Historic Latin'
											description='Historic or less commonly used Latin letters.'
											onChange={() => handleSetSelectionToggle('latin', 'historic')}
										/>
									</div>
									<CharactersTable
										entries={selectedCharactersWithSequences.latin}
										{...commonTableAttributes}
									/>
								</CharactersContainer>
							</Fragment>
						)}
					</section>
					<section>
						{selectedCharacters.greek.length > 0 && (
							<Fragment>
								<div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem'}}>
									<h3>Greek alphabet</h3>
								</div>
								<CharactersContainer
									charactersNumber={selectedCharacters.greek.length}
									onAddSequence={() => handleAddSequence(['greek'])}
								>
									<div className='filters'>
										<Checkbox
											id='greek-basic'
											isChecked={setSelection.greek.basic === true}
											isIndeterminate={setSelection.greek.basic === undefined}
											label='Basic Greek'
											description='Basic Greek letters.'
											onChange={() => handleSetSelectionToggle('greek', 'basic')}
										/>
										<Checkbox
											id='greek-base'
											isChecked={setSelection.greek.base === true}
											isIndeterminate={setSelection.greek.base === undefined}
											label='Modern Greek extensions'
											description='Additional letters used in modern Greek orthography.'
											onChange={() => handleSetSelectionToggle('greek', 'base')}
										/>
										<Checkbox
											id='greek-historic'
											isChecked={setSelection.greek.historic === true}
											isIndeterminate={setSelection.greek.historic === undefined}
											label='Historic / polytonic Greek'
											description='Polytonic and historic Greek letter forms.'
											onChange={() => handleSetSelectionToggle('greek', 'historic')}
										/>
									</div>
									<div className='filters'>
										<label htmlFor='greek-prefix-select'>Prefix</label>
										<select
											id='greek-prefix-select'
											value={prefixes.greek.char}
											onChange={(e) => setPrefixes((prev) => ({
												...prev,
												greek: {...prev.greek, char: e.target.value},
											}))}
										>
											{(prefixes.greek.cased ? casedPrefixOptions : uncasedPrefixOptions).map((option) => (
												<option key={`greek-${option.value}`} value={option.value}>
													{option.label}
												</option>
											))}
										</select>
										<Checkbox
											id='greek-prefix-cased'
											isChecked={prefixes.greek.cased}
											label='Cased prefix'
											onChange={() => setPrefixes((prev) => ({
												...prev,
												greek: {
													...prev.greek,
													cased: !prev.greek.cased,
													char: prev.greek.cased ? prev.greek.char : prev.greek.char.toLowerCase(),
												},
											}))}
										/>
									</div>
									<CharactersTable
										entries={selectedCharactersWithSequences.greek}
										{...commonTableAttributes}
									/>
								</CharactersContainer>
							</Fragment>
						)}
					</section>
					{selectedCharacters.cyrillic?.length > 0 && (
						<section>
							<div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem'}}>
								<h3>Cyrillic alphabet</h3>
							</div>
							<CharactersContainer
								charactersNumber={selectedCharacters.cyrillic.length}
								onAddSequence={() => handleAddSequence(['cyrillic'])}
							>
								<div className='filters'>
									<Checkbox
										id='cyrillic-base'
										isChecked={setSelection.cyrillic.base === true}
										isIndeterminate={setSelection.cyrillic.base === undefined}
										label='Basic Cyrillic'
										description='Base Cyrillic letters.'
										onChange={() => handleSetSelectionToggle('cyrillic', 'base')}
									/>
								</div>
								<div className='filters'>
									<label htmlFor='cyrillic-prefix-select'>Prefix</label>
									<select
										id='cyrillic-prefix-select'
										value={prefixes.cyrillic.char}
										onChange={(e) => setPrefixes((prev) => ({
											...prev,
											cyrillic: {...prev.cyrillic, char: e.target.value},
										}))}
									>
										{(prefixes.cyrillic.cased ? casedPrefixOptions : uncasedPrefixOptions).map((option) => (
											<option key={`cyrillic-${option.value}`} value={option.value}>
												{option.label}
											</option>
										))}
									</select>
									<Checkbox
										id='cyrillic-prefix-cased'
										isChecked={prefixes.cyrillic.cased}
										label='Cased prefix'
										onChange={() => setPrefixes((prev) => ({
											...prev,
											cyrillic: {
												...prev.cyrillic,
												cased: !prev.cyrillic.cased,
												char: prev.cyrillic.cased ? prev.cyrillic.char : prev.cyrillic.char.toLowerCase(),
											},
										}))}
									/>
								</div>
								<CharactersTable
									entries={selectedCharactersWithSequences.cyrillic}
									{...commonTableAttributes}
								/>
							</CharactersContainer>
						</section>
					)}
				</section>
				<section>
					<h2>Symbols</h2>
					<div className='filters'>
						{symbolsGroups.map((g) => {
							const id = `symbol-${g.label.toLowerCase().replace(/\s+/g, '-')}`;
							return (
								<Checkbox
									key={g.label}
									id={id}
									isChecked={isGroupChecked(g.keys)}
									label={g.label}
									description={g.description}
									onChange={() => handleGroupToggle(g.keys)}
								/>
							);
						})}
					</div>
					<section>
						{hasAnyInGroup(['punctuation_separators', 'punctuation']) && (
							<Fragment>
								<div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem'}}>
									<h3>Punctuation</h3>
								</div>
								<section>
									<h4>Separators</h4>
									<CharactersContainer
										charactersNumber={selectedCharacters.punctuation_separators.length}
										onAddSequence={() => handleAddSequence(['punctuation_separators'])}
									>
										<CharactersTable
											entries={selectedCharactersWithSequences.punctuation_separators}
											{...commonTableAttributes}
										/>
									</CharactersContainer>
								</section>
								<section>
									<h4>General</h4>
									<CharactersContainer
										charactersNumber={selectedCharacters.punctuation.length}
										onAddSequence={() => handleAddSequence(['punctuation'])}
									>
										<CharactersTable
											entries={selectedCharactersWithSequences.punctuation}
											{...commonTableAttributes}
										/>
									</CharactersContainer>
								</section>
							</Fragment>
						)}
					</section>
					<section>
						{hasAnyInGroup(['math_operators', 'math_number', 'math_alphanumeric_symbols']) && (
							<Fragment>
								<div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem'}}>
									<h3>Mathematical symbols</h3>
								</div>
								<section>
									<h4>Operators</h4>
									<CharactersContainer
										charactersNumber={selectedCharacters.math_operators.length}
										onAddSequence={() => handleAddSequence(['math_operators'])}
									>
										<CharactersTable
											entries={selectedCharactersWithSequences.math_operators}
											{...commonTableAttributes}
										/>
									</CharactersContainer>
								</section>
								<section>
									<h4>Numbers</h4>
									<CharactersContainer
										charactersNumber={selectedCharacters.math_number.length}
										onAddSequence={() => handleAddSequence(['math_number'])}
									>
										<CharactersTable
											entries={selectedCharactersWithSequences.math_number}
											{...commonTableAttributes}
										/>
									</CharactersContainer>
								</section>
								<section>
									<h4>Alphanumeric symbols</h4>
									<CharactersContainer
										charactersNumber={selectedCharacters.math_alphanumeric_symbols.length}
										onAddSequence={() => handleAddSequence(['math_alphanumeric_symbols'])}
									>
										<div className='filters'>
											<table>
												<tr>
													<td/>
													<td>
														<Checkbox
															id='math-alphanumeric-symbols-bold'
															isChecked={setSelection.math_alphanumeric_symbols.mb === true}
															isIndeterminate={setSelection.math_alphanumeric_symbols.mb === undefined}
															label='Bold'
															description='Bold alphanumeric symbols.'
															onChange={() => handleSetSelectionToggle('math_alphanumeric_symbols', 'mb')}
														/>
													</td>
													<td>
														<Checkbox
															id='math-alphanumeric-symbols-italic'
															isChecked={setSelection.math_alphanumeric_symbols.mi === true}
															isIndeterminate={setSelection.math_alphanumeric_symbols.mi === undefined}
															label='Italic'
															description='Italic alphanumeric symbols.'
															onChange={() => handleSetSelectionToggle('math_alphanumeric_symbols', 'mi')}
														/>
													</td>
													<td>
														<Checkbox
															id='math-alphanumeric-symbols-bold-italic'
															isChecked={setSelection.math_alphanumeric_symbols.mbi === true}
															isIndeterminate={setSelection.math_alphanumeric_symbols.mbi === undefined}
															label='Bold italic'
															description='Bold italic alphanumeric symbols.'
															onChange={() => handleSetSelectionToggle('math_alphanumeric_symbols', 'mbi')}
														/>
													</td>
												</tr>
												<tr>
													<td>
														<Checkbox
															id='math-alphanumeric-symbols-sans-serif'
															isChecked={setSelection.math_alphanumeric_symbols.mss === true}
															isIndeterminate={setSelection.math_alphanumeric_symbols.mss === undefined}
															label='Sans-serif'
															description='Sans-serif alphanumeric symbols.'
															onChange={() => handleSetSelectionToggle('math_alphanumeric_symbols', 'mss')}
														/>
													</td>
													<td>
														<Checkbox
															id='math-alphanumeric-symbols-sans-serif-bold'
															isChecked={setSelection.math_alphanumeric_symbols.mssb === true}
															isIndeterminate={setSelection.math_alphanumeric_symbols.mssb === undefined}
															label='Sans-serif bold'
															description='Sans-serif bold alphanumeric symbols.'
															onChange={() => handleSetSelectionToggle('math_alphanumeric_symbols', 'mssb')}
														/>
													</td>
													<td>
														<Checkbox
															id='math-alphanumeric-symbols-sans-serif-italic'
															isChecked={setSelection.math_alphanumeric_symbols.mssi === true}
															isIndeterminate={setSelection.math_alphanumeric_symbols.mssi === undefined}
															label='Sans-serif italic'
															description='Sans-serif italic alphanumeric symbols.'
															onChange={() => handleSetSelectionToggle('math_alphanumeric_symbols', 'mssi')}
														/>
													</td>
													<td>
														<Checkbox
															id='math-alphanumeric-symbols-sans-serif-bold-italic'
															isChecked={setSelection.math_alphanumeric_symbols.mssbi === true}
															isIndeterminate={setSelection.math_alphanumeric_symbols.mssbi === undefined}
															label='Sans-serif bold italic'
															description='Sans-serif bold italic alphanumeric symbols.'
															onChange={() => handleSetSelectionToggle('math_alphanumeric_symbols', 'mssbi')}
														/>
													</td>
												</tr>
												<tr>
													<td>
														<Checkbox
															id='math-alphanumeric-symbols-script'
															isChecked={setSelection.math_alphanumeric_symbols.ms === true}
															isIndeterminate={setSelection.math_alphanumeric_symbols.ms === undefined}
															label='Script'
															description='Script alphanumeric symbols.'
															onChange={() => handleSetSelectionToggle('math_alphanumeric_symbols', 'ms')}
														/>
													</td>
													<td>
														<Checkbox
															id='math-alphanumeric-symbols-script-bold'
															isChecked={setSelection.math_alphanumeric_symbols.mbs === true}
															isIndeterminate={setSelection.math_alphanumeric_symbols.mbs === undefined}
															label='Script bold'
															description='Script bold alphanumeric symbols.'
															onChange={() => handleSetSelectionToggle('math_alphanumeric_symbols', 'mbs')}
														/>
													</td>
												</tr>
												<tr>
													<td>
														<Checkbox
															id='math-alphanumeric-symbols-fraktur'
															isChecked={setSelection.math_alphanumeric_symbols.mf === true}
															isIndeterminate={setSelection.math_alphanumeric_symbols.mf === undefined}
															label='Fraktur'
															description='Fraktur alphanumeric symbols.'
															onChange={() => handleSetSelectionToggle('math_alphanumeric_symbols', 'mf')}
														/>
													</td>
													<td>
														<Checkbox
															id='math-alphanumeric-symbols-fraktur-bold'
															isChecked={setSelection.math_alphanumeric_symbols.mbf === true}
															isIndeterminate={setSelection.math_alphanumeric_symbols.mbf === undefined}
															label='Fraktur bold'
															description='Fraktur bold alphanumeric symbols.'
															onChange={() => handleSetSelectionToggle('math_alphanumeric_symbols', 'mbf')}
														/>
													</td>
												</tr>
												<tr>
													<td>
														<Checkbox
															id='math-alphanumeric-symbols-monospace'
															isChecked={setSelection.math_alphanumeric_symbols.mm === true}
															isIndeterminate={setSelection.math_alphanumeric_symbols.mm === undefined}
															label='Monospace'
															description='Monospace alphanumeric symbols.'
															onChange={() => handleSetSelectionToggle('math_alphanumeric_symbols', 'mm')}
														/>
													</td>
												</tr>
												<tr>
													<td>
														<Checkbox
															id='math-alphanumeric-symbols-double-struck'
															isChecked={setSelection.math_alphanumeric_symbols.mds === true}
															isIndeterminate={setSelection.math_alphanumeric_symbols.mds === undefined}
															label='Double-struck'
															description='Double-struck alphanumeric symbols.'
															onChange={() => handleSetSelectionToggle('math_alphanumeric_symbols', 'mds')}
														/>
														<Checkbox
															id='math-alphanumeric-symbols-double-struck-base'
															isChecked={setSelection.math_alphanumeric_symbols.mds_base === true}
															isIndeterminate={setSelection.math_alphanumeric_symbols.mds_base === undefined}
															label='Base double-struck'
															description='Number sets symbols.'
															onChange={() => handleSetSelectionToggle('math_alphanumeric_symbols', 'mds_base')}
														/>
													</td>
												</tr>
											</table>
										</div>
										<CharactersTable
											entries={selectedCharactersWithSequences.math_alphanumeric_symbols}
											{...commonTableAttributes}
										/>
									</CharactersContainer>
								</section>
							</Fragment>
						)}
					</section>
					<section>
						{selectedCharacters.currency.length > 0 && (
							<Fragment>
								<div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem'}}>
									<h3>Currency</h3>
								</div>
								<CharactersContainer
									charactersNumber={selectedCharacters.currency.length}
									onAddSequence={() => handleAddSequence(['currency'])}
								>
									<CharactersTable
										entries={selectedCharactersWithSequences.currency}
										{...commonTableAttributes}
									/>
								</CharactersContainer>
							</Fragment>
						)}
					</section>
					<section>
						{selectedCharacters.misc.length > 0 && (
							<Fragment>
								<div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem'}}>
									<h3>Miscellaneous</h3>
								</div>
								<CharactersContainer
									charactersNumber={selectedCharacters.misc.length}
									onAddSequence={() => handleAddSequence(['misc'])}
								>
									<CharactersTable
										entries={selectedCharactersWithSequences.misc}
										{...commonTableAttributes}
									/>
								</CharactersContainer>
							</Fragment>
						)}
					</section>
					<section>
						{selectedCharacters.format.length > 0 && (
							<Fragment>
								<div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem'}}>
									<h3>Format</h3>
								</div>
								<CharactersContainer
									charactersNumber={selectedCharacters.format.length}
									onAddSequence={() => handleAddSequence(['format'])}
								>
									<CharactersTable
										entries={selectedCharactersWithSequences.format}
										{...commonTableAttributes}
									/>
								</CharactersContainer>
							</Fragment>
						)}
					</section>
				</section>
			</main>
			<Footer
				selectedCount={selectedCount}
				conflictCount={conflictCount}
				onGenerate={handleGenerate}
				onPreview={handlePreview}
			/>
			<Modal
				isOpen={showModal}
				title={modalMode === 'addSequence' ? 'Add sequences' : 'Generated Compose sequences'}
				onClose={closeModal}
			>
				{modalMode === 'addSequence'
					? (
						<AddingModal
							availableCharacters={availableCharacters}
							selectedCharacters={selectedCharacters}
							modalGroups={modalGroups}
							customSequences={customSequences}
							handleApplySequences={handleApplySequences}
							handleSequenceChange={handleSequenceChange}
							closeModal={closeModal}
						/>
					)
					: (
						<pre>
							{modalContent}
						</pre>
					)}
			</Modal>
		</Fragment>
	);
}

export default App;
