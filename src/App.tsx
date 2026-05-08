import {Fragment, useState, useCallback, useMemo} from 'react';
import {CORE_CATEGORIES} from './constants/lists';
import {defaultDiacriticMarks, scriptsGroups, symbolsGroups} from './constants/mappings';
import {assignedRanges} from './data/assigned-ranges';
import {characters as mainCharacters} from './data/names';
import {usePrefixes} from './hooks/usePrefixes';
import {applySequencesToCharacters} from './utils/applySequences';
import {blockToGroup, groupPrimaryBlock} from './utils/blockToGroup';
import {buildName} from './utils/buildName';
import {detectConflicts} from './utils/detectConflicts';
import {formatSequence} from './utils/formatSequence';
import {CharWithSeq, DiacriticMark, NameEntry} from './types';
import AddingModal from './AddingModal';
import CharacterPickerModal from './CharacterPickerModal';
import CharactersContainer from './CharactersContainer';
import CharactersTable from './CharactersTable';
import Checkbox from './Checkbox';
import ScriptSectionWithDiacritics from './ScriptSectionWithDiacritics';
import SimpleScriptSection from './SimpleScriptSection';
import Footer from './Footer';
import Modal from './Modal';
import './index.css';

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

const formatScriptGroupName = (groupName: string): string => groupName
	.split('_')
	.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
	.join(' ');

const findBlockNameForCp = (cp: number): string | null => {
	for (const [blockName, ranges] of assignedRanges) {
		for (const [start, end] of ranges) {
			if (cp >= start && cp <= end) {
				return blockName;
			}
		}
	}
	return null;
};

type SetSelectionState = Record<string, Record<string, boolean | undefined>>;

const initialSetSelection: SetSelectionState = {
	latin: {base: true, ext: true, historic: false},
	greek: {basic: true, base: false, historic: false},
	cyrillic: {base: true, ext: false},
	math_alphanumerics: {
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

const defaultCharacters: Record<string, NameEntry[]> = Object.fromEntries(Object.entries(mainCharacters).map(([key, entries]) => [
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
		if (key === 'math_alphanumerics') {
			return entry.set.includes('mds_base');
		}
		return entry.set.includes('base');
	}),
]));

function App() {
	const [showModal, setShowModal] = useState(false);
	const [modalContent, setModalContent] = useState('');
	const [modalMode, setModalMode] = useState<'preview' | 'addSequence' | null>(null);
	const [pickerOpen, setPickerOpen] = useState(false);
	const [pickerSection, setPickerSection] = useState<{label: string; keys: string[]} | undefined>(undefined);
	const [pendingEntries, setPendingEntries] = useState<NameEntry[]>([]);
	const [pendingEntryGroups, setPendingEntryGroups] = useState<Map<number, string>>(new Map());
	const [pendingConflictMap, setPendingConflictMap] = useState<Map<number, number[]>>(new Map());
	const [availableCharacters, setAvailableCharacters] = useState<Record<string, NameEntry[]>>(mainCharacters);
	const [loadedBlocks, setLoadedBlocks] = useState<Set<string>>(new Set());
	const [diacriticMarks, setDiacriticMarks] = useState<DiacriticMark[]>(defaultDiacriticMarks);
	const [customSequences, setCustomSequences] = useState<{key: string; seq: string}[]>([]);
	const [prefixes, setPrefixes] = usePrefixes(setCustomSequences);
	const [useDiacriticsView, setUseDiacriticsView] = useState<Record<'latin' | 'greek' | 'cyrillic', boolean>>({
		latin: true,
		greek: true,
		cyrillic: true,
	});
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

	const buildSetSelection = useCallback(<K extends keyof SetSelectionState & keyof typeof mainCharacters>(
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

	const handleOpenPicker = useCallback((section?: {label: string; keys: string[]}) => {
		setPickerSection(section);
		setPickerOpen(true);
	}, []);

	const handlePickerConfirm = useCallback((cps: number[]) => {
		setPickerOpen(false);

		const cpGroups = new Map<number, string>();

		for (const cp of cps) {
			// Check if character is in availableCharacters
			let group: string | null = null;
			for (const [groupKey, entries] of Object.entries(availableCharacters)) {
				if (entries.some((entry) => entry.cp === cp)) {
					group = groupKey;
					break;
				}
			}

			// If not found in availableCharacters, use blockToGroup
			if (!group) {
				const blockName = findBlockNameForCp(cp);
				if (blockName) {
					group = blockToGroup(blockName);
				} else {
					console.error(`No group found for code point ${cp}`);
				}
			}

			if (group) {
				cpGroups.set(cp, group);
			}
		}

		const entries: NameEntry[] = cps.map((cp) => {
			const group = cpGroups.get(cp)!;
			const existing = (availableCharacters[group] ?? []).find((e) => e.cp === cp);
			return existing ?? {
				cp,
				name: `U+${cp.toString(16).toUpperCase().padStart(4, '0')}`,
			};
		});

		setPendingEntries(entries);
		setPendingEntryGroups(cpGroups);
		setModalMode('addSequence');
		setShowModal(true);
	}, [availableCharacters]);

	const closeModal = useCallback(() => {
		setShowModal(false);
		setModalMode(null);
		setPendingEntries([]);
		setPendingEntryGroups(new Map());
		setPendingConflictMap(new Map());
	}, []);

	const handleApplySequences = useCallback(() => {
		setSelectedCharacters((prev) => {
			const next = {...prev};
			for (const entry of pendingEntries) {
				const group = pendingEntryGroups.get(entry.cp);
				if (!group) continue;
				const key = String(entry.cp);
				const seq = customSequences.find((cs) => cs.key === key)?.seq ?? '';
				if (!seq) continue;
				const existingList = next[group] ?? [];
				const existingSet = new Set(existingList.map((e) => e.cp));
				if (!existingSet.has(entry.cp)) {
					next[group] = [...existingList, entry];
				}
			}
			return next;
		});
		setShowModal(false);
		setModalMode(null);
		setPendingEntries([]);
		setPendingEntryGroups(new Map());
		setPendingConflictMap(new Map());
	}, [customSequences, pendingEntries, pendingEntryGroups]);

	const selectedCharactersWithSequences = useMemo(
		() => applySequencesToCharacters(selectedCharacters, customSequences, diacriticMarks, prefixes),
		[selectedCharacters, customSequences, diacriticMarks, prefixes],
	);

	const pendingEntriesWithConflicts = useMemo(() =>
		pendingEntries.map((entry) => ({
			cp: entry.cp,
			name: buildName(entry),
			seq: customSequences.find((cs) => cs.key === String(entry.cp))?.seq ?? '',
			conflicts: pendingConflictMap.get(entry.cp),
		})),
	[pendingEntries, customSequences, pendingConflictMap]);

	const handleAddingModalConflictDetection = useCallback((cpKey: string, seq: string) => {
		const cp = Number(cpKey);
		const pendingChars: CharWithSeq[] = pendingEntries.map((entry) => ({
			cp: entry.cp,
			name: buildName(entry),
			seq: entry.cp === cp ? seq : (customSequences.find((cs) => cs.key === String(entry.cp))?.seq ?? ''),
		}));
		const existingChars = Object.values(selectedCharactersWithSequences).flat();
		const conflictMap = detectConflicts([...existingChars, ...pendingChars]);
		const newPendingConflicts = new Map<number, number[]>();
		for (const char of pendingChars) {
			if (char.seq) {
				const charConflicts = conflictMap.get(char.cp);
				if (charConflicts) newPendingConflicts.set(char.cp, charConflicts);
			}
		}
		setPendingConflictMap(newPendingConflicts);
	}, [pendingEntries, customSequences, selectedCharactersWithSequences]);

	const handleGroupToggle = (keys: (keyof typeof defaultCharacters)[]) => {
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
						const primaryBlock = groupPrimaryBlock[k];
						const fileSlug = primaryBlock ? primaryBlock.replace(/ /g, '_') : k;
						import(`./data/names-${fileSlug}.ts`).then((mod) => {
							setAvailableCharacters((current) => ({
								...current,
								[k]: mod.characters[k] ?? [],
							}));
							setSelectedCharacters((current) => ({
								...current,
								[k]: currentlyChecked ? [] : (mod.characters[k] ?? []).filter((entry: NameEntry) => entry.set?.includes('base')),
							}));
							if (primaryBlock) {
								setLoadedBlocks((current) => new Set(current).add(primaryBlock));
							}
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
				const allEntriesForSet = (availableCharacters[group] ?? []).filter((entry) => (entry.set ?? []).includes(setKey as string));
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

	const pickerSelectedCps = useMemo(
		() => new Set(Object.values(selectedCharacters).flat().map((e) => e.cp)),
		[selectedCharacters],
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
						<h3>Diacritic marks</h3>
						<CharactersContainer
							charactersNumber={selectedCharacters.modifier.length + selectedCharacters.combining.length}
							onAddSequence={() => handleOpenPicker({label: 'Diacritic marks', keys: ['modifier', 'combining']})}
						>
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
							<section>
								{selectedCharacters.modifier.length > 0 && (
									<Fragment>
										<div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem'}}>
											<h3>Modifier letters</h3>
										</div>
										<CharactersTable
											entries={selectedCharactersWithSequences.modifier}
											{...commonTableAttributes}
										/>
									</Fragment>
								)}
							</section>
							<section>
								{selectedCharacters.combining.length > 0 && (
									<Fragment>
										<div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem'}}>
											<h3>Combining diacritical marks</h3>
										</div>
										<CharactersTable
											entries={selectedCharactersWithSequences.combining}
											{...commonTableAttributes}
										/>
									</Fragment>
								)}
							</section>
						</CharactersContainer>
					</section>
					<ScriptSectionWithDiacritics
						id='latin'
						title='Latin'
						entries={selectedCharactersWithSequences.latin}
						selectedCharacters={selectedCharacters.latin}
						isDiacriticsView={useDiacriticsView.latin}
						onDiacriticsViewChange={(v) => setUseDiacriticsView((prev) => ({...prev, latin: v}))}
						onAddSequence={() => handleOpenPicker({label: 'Latin', keys: ['latin']})}
						{...commonTableAttributes}
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
					</ScriptSectionWithDiacritics>
					<ScriptSectionWithDiacritics
						id='greek'
						title='Greek'
						entries={selectedCharactersWithSequences.greek}
						selectedCharacters={selectedCharacters.greek}
						isDiacriticsView={useDiacriticsView.greek}
						onDiacriticsViewChange={(v) => setUseDiacriticsView((prev) => ({...prev, greek: v}))}
						onAddSequence={() => handleOpenPicker({label: 'Greek', keys: ['greek']})}
						{...commonTableAttributes}
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
					</ScriptSectionWithDiacritics>
					<ScriptSectionWithDiacritics
						id='cyrillic'
						title='Cyrillic alphabet'
						entries={selectedCharactersWithSequences.cyrillic ?? []}
						selectedCharacters={selectedCharacters.cyrillic ?? []}
						isDiacriticsView={useDiacriticsView.cyrillic}
						onDiacriticsViewChange={(v) => setUseDiacriticsView((prev) => ({...prev, cyrillic: v}))}
						onAddSequence={() => handleOpenPicker({label: 'Cyrillic alphabet', keys: ['cyrillic']})}
						{...commonTableAttributes}
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
							<Checkbox
								id='cyrillic-ext'
								isChecked={setSelection.cyrillic.ext === true}
								isIndeterminate={setSelection.cyrillic.ext === undefined}
								label='Extended Cyrillic'
								description='Extended Cyrillic letters.'
								onChange={() => handleSetSelectionToggle('cyrillic', 'ext')}
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
					</ScriptSectionWithDiacritics>
					{Object.keys(selectedCharacters)
						.filter((key) => ![...CORE_CATEGORIES, 'cyrillic'].includes(key))
						.map((scriptKey) => (
							<SimpleScriptSection
								key={scriptKey}
								title={formatScriptGroupName(scriptKey)}
								entries={selectedCharactersWithSequences[scriptKey as keyof typeof selectedCharactersWithSequences] || []}
								onAddSequence={() => handleOpenPicker({label: formatScriptGroupName(scriptKey), keys: [scriptKey]})}
								{...commonTableAttributes}
							/>
						))}
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
					<SimpleScriptSection
						title='Punctuation'
						entries={selectedCharactersWithSequences.punctuation}
						onAddSequence={() => handleOpenPicker({label: 'Punctuation', keys: ['punctuation']})}
						{...commonTableAttributes}
					/>
					<section>
						{hasAnyInGroup(['math_operators', 'math_number', 'math_alphanumerics']) && (
							<Fragment>
								<div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem'}}>
									<h3>Mathematical symbols</h3>
								</div>
								<section>
									<h4>Operators</h4>
									<CharactersContainer
										charactersNumber={selectedCharacters.math_operators.length}
										onAddSequence={() => handleOpenPicker({label: 'Operators', keys: ['math_operators']})}
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
										onAddSequence={() => handleOpenPicker({label: 'Numbers', keys: ['math_number']})}
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
										charactersNumber={selectedCharacters.math_alphanumerics.length}
										onAddSequence={() => handleOpenPicker({label: 'Alphanumeric symbols', keys: ['math_alphanumerics']})}
									>
										<div className='filters'>
											<table>
												<tr>
													<td/>
													<td>
														<Checkbox
															id='math-alphanumeric-symbols-bold'
															isChecked={setSelection.math_alphanumerics.mb === true}
															isIndeterminate={setSelection.math_alphanumerics.mb === undefined}
															label='Bold'
															description='Bold alphanumeric symbols.'
															onChange={() => handleSetSelectionToggle('math_alphanumerics', 'mb')}
														/>
													</td>
													<td>
														<Checkbox
															id='math-alphanumeric-symbols-italic'
															isChecked={setSelection.math_alphanumerics.mi === true}
															isIndeterminate={setSelection.math_alphanumerics.mi === undefined}
															label='Italic'
															description='Italic alphanumeric symbols.'
															onChange={() => handleSetSelectionToggle('math_alphanumerics', 'mi')}
														/>
													</td>
													<td>
														<Checkbox
															id='math-alphanumeric-symbols-bold-italic'
															isChecked={setSelection.math_alphanumerics.mbi === true}
															isIndeterminate={setSelection.math_alphanumerics.mbi === undefined}
															label='Bold italic'
															description='Bold italic alphanumeric symbols.'
															onChange={() => handleSetSelectionToggle('math_alphanumerics', 'mbi')}
														/>
													</td>
												</tr>
												<tr>
													<td>
														<Checkbox
															id='math-alphanumeric-symbols-sans-serif'
															isChecked={setSelection.math_alphanumerics.mss === true}
															isIndeterminate={setSelection.math_alphanumerics.mss === undefined}
															label='Sans-serif'
															description='Sans-serif alphanumeric symbols.'
															onChange={() => handleSetSelectionToggle('math_alphanumerics', 'mss')}
														/>
													</td>
													<td>
														<Checkbox
															id='math-alphanumeric-symbols-sans-serif-bold'
															isChecked={setSelection.math_alphanumerics.mssb === true}
															isIndeterminate={setSelection.math_alphanumerics.mssb === undefined}
															label='Sans-serif bold'
															description='Sans-serif bold alphanumeric symbols.'
															onChange={() => handleSetSelectionToggle('math_alphanumerics', 'mssb')}
														/>
													</td>
													<td>
														<Checkbox
															id='math-alphanumeric-symbols-sans-serif-italic'
															isChecked={setSelection.math_alphanumerics.mssi === true}
															isIndeterminate={setSelection.math_alphanumerics.mssi === undefined}
															label='Sans-serif italic'
															description='Sans-serif italic alphanumeric symbols.'
															onChange={() => handleSetSelectionToggle('math_alphanumerics', 'mssi')}
														/>
													</td>
													<td>
														<Checkbox
															id='math-alphanumeric-symbols-sans-serif-bold-italic'
															isChecked={setSelection.math_alphanumerics.mssbi === true}
															isIndeterminate={setSelection.math_alphanumerics.mssbi === undefined}
															label='Sans-serif bold italic'
															description='Sans-serif bold italic alphanumeric symbols.'
															onChange={() => handleSetSelectionToggle('math_alphanumerics', 'mssbi')}
														/>
													</td>
												</tr>
												<tr>
													<td>
														<Checkbox
															id='math-alphanumeric-symbols-script'
															isChecked={setSelection.math_alphanumerics.ms === true}
															isIndeterminate={setSelection.math_alphanumerics.ms === undefined}
															label='Script'
															description='Script alphanumeric symbols.'
															onChange={() => handleSetSelectionToggle('math_alphanumerics', 'ms')}
														/>
													</td>
													<td>
														<Checkbox
															id='math-alphanumeric-symbols-script-bold'
															isChecked={setSelection.math_alphanumerics.mbs === true}
															isIndeterminate={setSelection.math_alphanumerics.mbs === undefined}
															label='Script bold'
															description='Script bold alphanumeric symbols.'
															onChange={() => handleSetSelectionToggle('math_alphanumerics', 'mbs')}
														/>
													</td>
												</tr>
												<tr>
													<td>
														<Checkbox
															id='math-alphanumeric-symbols-fraktur'
															isChecked={setSelection.math_alphanumerics.mf === true}
															isIndeterminate={setSelection.math_alphanumerics.mf === undefined}
															label='Fraktur'
															description='Fraktur alphanumeric symbols.'
															onChange={() => handleSetSelectionToggle('math_alphanumerics', 'mf')}
														/>
													</td>
													<td>
														<Checkbox
															id='math-alphanumeric-symbols-fraktur-bold'
															isChecked={setSelection.math_alphanumerics.mbf === true}
															isIndeterminate={setSelection.math_alphanumerics.mbf === undefined}
															label='Fraktur bold'
															description='Fraktur bold alphanumeric symbols.'
															onChange={() => handleSetSelectionToggle('math_alphanumerics', 'mbf')}
														/>
													</td>
												</tr>
												<tr>
													<td>
														<Checkbox
															id='math-alphanumeric-symbols-monospace'
															isChecked={setSelection.math_alphanumerics.mm === true}
															isIndeterminate={setSelection.math_alphanumerics.mm === undefined}
															label='Monospace'
															description='Monospace alphanumeric symbols.'
															onChange={() => handleSetSelectionToggle('math_alphanumerics', 'mm')}
														/>
													</td>
												</tr>
												<tr>
													<td>
														<Checkbox
															id='math-alphanumeric-symbols-double-struck'
															isChecked={setSelection.math_alphanumerics.mds === true}
															isIndeterminate={setSelection.math_alphanumerics.mds === undefined}
															label='Double-struck'
															description='Double-struck alphanumeric symbols.'
															onChange={() => handleSetSelectionToggle('math_alphanumerics', 'mds')}
														/>
														<Checkbox
															id='math-alphanumeric-symbols-double-struck-base'
															isChecked={setSelection.math_alphanumerics.mds_base === true}
															isIndeterminate={setSelection.math_alphanumerics.mds_base === undefined}
															label='Base double-struck'
															description='Number sets symbols.'
															onChange={() => handleSetSelectionToggle('math_alphanumerics', 'mds_base')}
														/>
													</td>
												</tr>
											</table>
										</div>
										<CharactersTable
											entries={selectedCharactersWithSequences.math_alphanumerics}
											{...commonTableAttributes}
										/>
									</CharactersContainer>
								</section>
							</Fragment>
						)}
					</section>
					<SimpleScriptSection
						title='Currency'
						entries={selectedCharactersWithSequences.currency}
						onAddSequence={() => handleOpenPicker({label: 'Currency', keys: ['currency']})}
						{...commonTableAttributes}
					/>
					<SimpleScriptSection
						title='Emoji'
						entries={selectedCharactersWithSequences.emoji}
						onAddSequence={() => handleOpenPicker({label: 'Emoji', keys: ['emoji']})}
						{...commonTableAttributes}
					/>
					<SimpleScriptSection
						title='Miscellaneous'
						entries={selectedCharactersWithSequences.misc}
						onAddSequence={() => handleOpenPicker({label: 'Miscellaneous', keys: ['misc']})}
						{...commonTableAttributes}
					/>
					<SimpleScriptSection
						title='Format'
						entries={selectedCharactersWithSequences.format}
						onAddSequence={() => handleOpenPicker({label: 'Format', keys: ['format']})}
						{...commonTableAttributes}
					/>
				</section>
			</main>
			<Footer
				selectedCount={selectedCount}
				conflictCount={conflictCount}
				onGenerate={handleGenerate}
				onPreview={handlePreview}
				onAddAnyCharacter={() => handleOpenPicker()}
			/>
			<Modal
				isOpen={pickerOpen}
				title='Add sequence'
				contentClassName='picker-modal-content'
				onClose={() => setPickerOpen(false)}
			>
				<CharacterPickerModal
					availableCharacters={availableCharacters}
					loadedBlocks={loadedBlocks}
					restrictToSection={pickerSection}
					selectedCps={pickerSelectedCps}
					closeModal={() => setPickerOpen(false)}
					onAvailableCharactersChange={setAvailableCharacters}
					onBlockLoaded={(blockName) => setLoadedBlocks((prev) => new Set(prev).add(blockName))}
					onConfirm={handlePickerConfirm}
				/>
			</Modal>
			<Modal
				isOpen={showModal}
				title={modalMode === 'addSequence' ? 'Add sequences' : 'Generated Compose sequences'}
				onClose={closeModal}
			>
				{modalMode === 'addSequence'
					? (
						<AddingModal
							entries={pendingEntriesWithConflicts}
							allCharacters={[...allCharacters, ...pendingEntriesWithConflicts]}
							customSequences={customSequences}
							handleApplySequences={handleApplySequences}
							handleSequenceChange={handleSequenceChange}
							closeModal={closeModal}
							onConflictDetection={handleAddingModalConflictDetection}
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
