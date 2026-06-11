import {Fragment, useState, useCallback, useMemo, useEffect, useDeferredValue} from 'react';
import {createPortal} from 'react-dom';
import {CORE_CATEGORIES} from './constants/lists';
import {defaultDiacriticMarks, groupsToUnicodeBlocks, scriptsGroups, symbolsGroups} from './constants/mappings';
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
import CharactersList from './CharactersList';
import CharactersMathStylesTable from './CharactersMathStylesTable';
import Checkbox from './Checkbox';
import PrefixDisclosure from './PrefixDisclosure';
import ScriptSectionWithDiacritics from './ScriptSectionWithDiacritics';
import SimpleScriptSection from './SimpleScriptSection';
import Footer from './Footer';
import Modal from './Modal';
import './index.css';

const H1 = (EMBEDDED ? 'h2' : 'h1') as 'h1' | 'h2';
const H2 = (EMBEDDED ? 'h3' : 'h2') as 'h2' | 'h3';
console.log('EMBEDDED', EMBEDDED);

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
		mds: false,
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
	const [pickerSection, setPickerSection] = useState<{label: string; key: string} | undefined>(undefined);
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
	const [useMathStylesView, setUseMathStylesView] = useState(false);
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

	useEffect(() => {
		const mathAlphaSelection = setSelection.math_alphanumerics;
		const {mds_base, ...relevantSelections} = mathAlphaSelection;
		const hasAnyTrue = Object.values(relevantSelections).some((value) => value === true);
		const hasOnlyFalseOrUndefined = Object.values(relevantSelections).every((value) => value === false || value === undefined);

		if (hasAnyTrue) {
			setUseMathStylesView(true);
		} else if (hasOnlyFalseOrUndefined) {
			setUseMathStylesView(false);
		}
	}, [setSelection.math_alphanumerics]);

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

	const handleMathAlphanumericsSelectAll = useCallback((toEnable: boolean) => {
		setSelectedCharacters((prev) => ({
			...prev,
			math_alphanumerics: toEnable
				? (availableCharacters.math_alphanumerics ?? [])
				: [],
		}));
	}, [availableCharacters]);

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

	const handleOpenPicker = useCallback((section?: {label: string; key: string}) => {
		setPickerSection(section);
		setPickerOpen(true);
	}, []);

	const handlePickerConfirm = useCallback((cps: number[]) => {
		setPickerOpen(false);

		const coreCatSet = new Set(CORE_CATEGORIES);
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
			let blockName: string | null = null;
			if (!group) {
				blockName = findBlockNameForCp(cp);
				if (blockName) {
					group = blockToGroup(blockName);
				} else {
					console.error(`No group found for code point ${cp}`);
				}
			}

			// If the resolved group is a raw block-derived name (not a known category),
			// look it up in groupsToUnicodeBlocks to find the appropriate section.
			// pickerSection acts as a tie-breaker when the block appears in multiple groups.
			if (group && !coreCatSet.has(group)) {
				blockName ??= findBlockNameForCp(cp);
				if (blockName) {
					const candidates = Object.entries(groupsToUnicodeBlocks)
						.filter(([key, blocks]) => coreCatSet.has(key) && blocks.some(([name]) => name === blockName))
						.map(([key]) => key);
					if (candidates.length > 0) {
						group = pickerSection && candidates.includes(pickerSection.key)
							? pickerSection.key
							: candidates[0];
					} else if (pickerSection && coreCatSet.has(pickerSection.key)) {
						group = pickerSection.key;
					}
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
	}, [availableCharacters, pickerSection]);

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

	const deferredSelectedCharacters = useDeferredValue(selectedCharacters);
	const selectedCharactersWithSequences = useMemo(
		() => applySequencesToCharacters(deferredSelectedCharacters, customSequences, diacriticMarks, prefixes),
		[deferredSelectedCharacters, customSequences, diacriticMarks, prefixes],
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

	const footerRoot = useMemo(() => document.getElementById('page-footer-root'), []);

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
			<main className={EMBEDDED ? 'container embedded' : 'container'} style={{paddingBottom: '80px'}}>
				<H1>Compose Generator</H1>
				<p className='intro'>
					Select the characters you need below, then download a ready-to-use <code>~/.XCompose</code> file.
					The file teaches X11 how to type those characters via the Compose key — for example,
					pressing <kbd>Compose</kbd> <kbd>`</kbd> <kbd>e</kbd> produces <strong>è</strong>.
				</p>
				<section>
					<H2>Scripts</H2>
					<details className='section-disclosure'>
						<summary>Diacritic prefixes</summary>
						<div className='scripts-layout'>
							{(() => {
								const filtered = diacriticMarks
									.map((mark, index) => ({mark, index}))
									.filter(({mark}) => mark.name !== 'ypogegrammeni' || setSelection.greek.historic !== false);
								const mid = Math.ceil(filtered.length / 2);
								return [filtered.slice(0, mid), filtered.slice(mid)].map((col, colIdx) => (
									<div key={colIdx === 0 ? 'col-a' : 'col-b'} className='diacritic-marks-col'>
										{col.map(({mark, index}) => (
											<div key={mark.name} className='diacritic-mark-item'>
												<span className='diacritic-mark-name'>{mark.name}</span>
												<span className='diacritic-mark-char'>{mark.mark}</span>
												<input
													type='text'
													value={mark.key}
													maxLength={2}
													className='key-input'
													onChange={(e) => handleDiacriticKeyChange(index, e.target.value)}
												/>
											</div>
										))}
									</div>
								));
							})()}
						</div>
					</details>
					<div className='filters'>
						{scriptsGroups.map((g) => {
							const id = `script-${g.label.toLowerCase().replace(/\s+/g, '-')}`;
							const prefixKey = g.key === 'modifier' ? 'dia' : g.key === 'combining' ? 'comb' : g.key;
							const hasPrefixDisclosure = ['dia', 'comb', 'greek', 'cyrillic'].includes(prefixKey);
							return (
								<div key={g.label} className='script-filter-row'>
									<div>
										<input
											id={id}
											type='checkbox'
											checked={isGroupChecked([g.key])}
											onChange={() => handleGroupToggle([g.key])}
										/>
										<label htmlFor={id} style={{cursor: 'pointer'}}>
											{g.label}
										</label>
										{hasPrefixDisclosure && (
											<PrefixDisclosure
												scriptKey={prefixKey as 'dia' | 'comb' | 'greek' | 'cyrillic'}
												prefixes={prefixes}
												setPrefixes={setPrefixes}
											/>
										)}
									</div>
									<div className='description'>{g.description}</div>
								</div>
							);
						})}
					</div>
					<section>
						{selectedCharacters.modifier.length > 0 && (
							<CharactersContainer
								header='Modifier letters'
								charactersNumber={selectedCharacters.modifier.length}
								conflictCount={selectedCharactersWithSequences.modifier.filter((e) => e.conflicts && e.conflicts.length > 0).length}
								onAddSequence={() => handleOpenPicker({label: 'Modifier letters', key: 'modifier'})}
							>
								<CharactersList
									entries={selectedCharactersWithSequences.modifier}
									{...commonTableAttributes}
								/>
							</CharactersContainer>
						)}
					</section>
					<section>
						{selectedCharacters.combining.length > 0 && (
							<CharactersContainer
								header='Combining diacritical marks'
								charactersNumber={selectedCharacters.combining.length}
								conflictCount={selectedCharactersWithSequences.combining.filter((e) => e.conflicts && e.conflicts.length > 0).length}
								onAddSequence={() => handleOpenPicker({label: 'Combining diacritical marks', key: 'combining'})}
							>
								<CharactersList
									entries={selectedCharactersWithSequences.combining}
									{...commonTableAttributes}
								/>
							</CharactersContainer>
						)}
					</section>
					<ScriptSectionWithDiacritics
						id='latin'
						title='Latin'
						entries={selectedCharactersWithSequences.latin}
						selectedCharacters={selectedCharacters.latin}
						isDiacriticsView={useDiacriticsView.latin}
						onDiacriticsViewChange={(v) => setUseDiacriticsView((prev) => ({...prev, latin: v}))}
						onAddSequence={() => handleOpenPicker({label: 'Latin', key: 'latin'})}
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
						onAddSequence={() => handleOpenPicker({label: 'Greek', key: 'greek'})}
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
					</ScriptSectionWithDiacritics>
					<ScriptSectionWithDiacritics
						id='cyrillic'
						title='Cyrillic'
						entries={selectedCharactersWithSequences.cyrillic ?? []}
						selectedCharacters={selectedCharacters.cyrillic ?? []}
						isDiacriticsView={useDiacriticsView.cyrillic}
						onDiacriticsViewChange={(v) => setUseDiacriticsView((prev) => ({...prev, cyrillic: v}))}
						onAddSequence={() => handleOpenPicker({label: 'Cyrillic', key: 'cyrillic'})}
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
					</ScriptSectionWithDiacritics>
					{Object.keys(selectedCharacters)
						.filter((key) => ![...CORE_CATEGORIES, 'cyrillic'].includes(key))
						.map((scriptKey) => (
							<SimpleScriptSection
								key={scriptKey}
								title={formatScriptGroupName(scriptKey)}
								entries={selectedCharactersWithSequences[scriptKey as keyof typeof selectedCharactersWithSequences] || []}
								onAddSequence={() => handleOpenPicker({label: formatScriptGroupName(scriptKey), key: scriptKey})}
								{...commonTableAttributes}
							/>
						))}
				</section>
				<section>
					<H2>Symbols</H2>
					<div className='filters'>
						{symbolsGroups.map((g) => {
							const id = `symbol-${g.label.toLowerCase().replace(/\s+/g, '-')}`;
							if (g.key === 'math_alphanumerics') {
								return (
									<div key={g.label} className='script-filter-row'>
										<div>
											<input
												id={id}
												type='checkbox'
												checked={isGroupChecked([g.key])}
												onChange={() => handleGroupToggle([g.key])}
											/>
											<label htmlFor={id} style={{cursor: 'pointer'}}>{g.label}</label>
											<details className='inline-prefix'>
												<summary>Prefixes</summary>
												<div className='math-prefixes-grid'>
													{(
														[
															['bold', 'Bold'],
															['italic', 'Italic'],
															['sansSerif', 'Sans-serif'],
															['script', 'Script'],
															['fraktur', 'Fraktur'],
															['monospace', 'Monospace'],
															['doubleStruck', 'Double-struck'],
														] as const
													).map(([key, label]) => (
														<Fragment key={key}>
															<label htmlFor={`math-prefix-${key}`}>{label}</label>
															<input
																id={`math-prefix-${key}`}
																type='text'
																className='key-input'
																value={prefixes.math[key]}
																maxLength={4}
																onChange={(e) => setPrefixes((prev) => ({
																	...prev,
																	math: {...prev.math, [key]: e.target.value},
																}))}
															/>
														</Fragment>
													))}
												</div>
											</details>
										</div>
										<div className='description'>{g.description}</div>
									</div>
								);
							}
							if (g.key === 'currency') {
								return (
									<div key={g.label} className='script-filter-row'>
										<div>
											<input
												id={id}
												type='checkbox'
												checked={isGroupChecked([g.key])}
												onChange={() => handleGroupToggle([g.key])}
											/>
											<label htmlFor={id} style={{cursor: 'pointer'}}>{g.label}</label>
											<details className='inline-prefix'>
												<summary>Prefix</summary>
												<div className='inline-prefix-content'>
													<input
														type='text'
														className='key-input'
														maxLength={2}
														value={prefixes.currency.char}
														onChange={(e) => setPrefixes((prev) => ({
															...prev,
															currency: {char: e.target.value},
														}))}
													/>
												</div>
											</details>
										</div>
										<div className='description'>{g.description}</div>
									</div>
								);
							}
							return (
								<Checkbox
									key={g.label}
									id={id}
									isChecked={isGroupChecked([g.key])}
									label={g.label}
									description={g.description}
									onChange={() => handleGroupToggle([g.key])}
								/>
							);
						})}
					</div>
					<SimpleScriptSection
						title='Punctuation'
						entries={selectedCharactersWithSequences.punctuation}
						onAddSequence={() => handleOpenPicker({label: 'Punctuation', key: 'punctuation'})}
						{...commonTableAttributes}
					/>
					<SimpleScriptSection
						title='Format'
						entries={selectedCharactersWithSequences.format}
						onAddSequence={() => handleOpenPicker({label: 'Format', key: 'format'})}
						{...commonTableAttributes}
					/>
					<section>
						{hasAnyInGroup(['math_number', 'math_operators', 'math_alphanumerics']) && (
							<Fragment>
								<section>
									<CharactersContainer
										header='Numbers'
										charactersNumber={selectedCharacters.math_number.length}
										conflictCount={selectedCharactersWithSequences.math_number.filter((e) => e.conflicts && e.conflicts.length > 0).length}
										onAddSequence={() => handleOpenPicker({label: 'Numbers', key: 'math_number'})}
									>
										<CharactersList
											entries={selectedCharactersWithSequences.math_number}
											{...commonTableAttributes}
										/>
									</CharactersContainer>
								</section>
								<section>
									<CharactersContainer
										header='Mathematical operators'
										charactersNumber={selectedCharacters.math_operators.length}
										conflictCount={selectedCharactersWithSequences.math_operators.filter((e) => e.conflicts && e.conflicts.length > 0).length}
										onAddSequence={() => handleOpenPicker({label: 'Mathematical operators', key: 'math_operators'})}
									>
										<CharactersList
											entries={selectedCharactersWithSequences.math_operators}
											{...commonTableAttributes}
										/>
									</CharactersContainer>
								</section>
								<section>
									<CharactersContainer
										header='Math alphanumeric symbols'
										charactersNumber={selectedCharacters.math_alphanumerics.length}
										conflictCount={selectedCharactersWithSequences.math_alphanumerics.filter((e) => e.conflicts && e.conflicts.length > 0).length}
										onAddSequence={() => handleOpenPicker({label: 'Math alphanumeric symbols', key: 'math_alphanumerics'})}
									>
										<p className='description'>
											Mathematical alphanumeric symbols are Unicode characters duplicating Latin letters, Greek
											letters, and digits in styled variants (bold, italic, script, …). Use them sparingly —
											they are meant for plain-text math like &ldquo;ℝ ⊆ ℂ&rdquo; or &ldquo;𝐀 = 𝐁 ⋅ 𝐂&rdquo;,
											and most rendering software ignores their styling. By default only common number-set symbols
											(ℕ ℤ ℚ ℝ ℂ ℍ) are selected.
										</p>
										<div className='filters'>
											<table>
												<tbody>
													<tr>
														<td>
															{(() => {
																const allSelected = Object.values(setSelection.math_alphanumerics).every((v) => v === true);
																return (
																	<button
																		type='button'
																		className='select-all-btn'
																		onClick={() => handleMathAlphanumericsSelectAll(!allSelected)}
																	>
																		{allSelected ? 'Unselect all' : 'Select all'}
																	</button>
																);
															})()}
														</td>
														<td>
															<Checkbox
																id='math-alphanumeric-symbols-bold'
																isChecked={setSelection.math_alphanumerics.mb === true}
																isIndeterminate={setSelection.math_alphanumerics.mb === undefined}
																label='Bold'
																onChange={() => handleSetSelectionToggle('math_alphanumerics', 'mb')}
															/>
														</td>
														<td>
															<Checkbox
																id='math-alphanumeric-symbols-italic'
																isChecked={setSelection.math_alphanumerics.mi === true}
																isIndeterminate={setSelection.math_alphanumerics.mi === undefined}
																label='Italic'
																onChange={() => handleSetSelectionToggle('math_alphanumerics', 'mi')}
															/>
														</td>
														<td>
															<Checkbox
																id='math-alphanumeric-symbols-bold-italic'
																isChecked={setSelection.math_alphanumerics.mbi === true}
																isIndeterminate={setSelection.math_alphanumerics.mbi === undefined}
																label='Bold italic'
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
																onChange={() => handleSetSelectionToggle('math_alphanumerics', 'mss')}
															/>
														</td>
														<td>
															<Checkbox
																id='math-alphanumeric-symbols-sans-serif-bold'
																isChecked={setSelection.math_alphanumerics.mssb === true}
																isIndeterminate={setSelection.math_alphanumerics.mssb === undefined}
																label='Sans-serif bold'
																onChange={() => handleSetSelectionToggle('math_alphanumerics', 'mssb')}
															/>
														</td>
														<td>
															<Checkbox
																id='math-alphanumeric-symbols-sans-serif-italic'
																isChecked={setSelection.math_alphanumerics.mssi === true}
																isIndeterminate={setSelection.math_alphanumerics.mssi === undefined}
																label='Sans-serif italic'
																onChange={() => handleSetSelectionToggle('math_alphanumerics', 'mssi')}
															/>
														</td>
														<td>
															<Checkbox
																id='math-alphanumeric-symbols-sans-serif-bold-italic'
																isChecked={setSelection.math_alphanumerics.mssbi === true}
																isIndeterminate={setSelection.math_alphanumerics.mssbi === undefined}
																label='Sans-serif bold italic'
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
																onChange={() => handleSetSelectionToggle('math_alphanumerics', 'ms')}
															/>
														</td>
														<td>
															<Checkbox
																id='math-alphanumeric-symbols-script-bold'
																isChecked={setSelection.math_alphanumerics.mbs === true}
																isIndeterminate={setSelection.math_alphanumerics.mbs === undefined}
																label='Script bold'
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
																onChange={() => handleSetSelectionToggle('math_alphanumerics', 'mf')}
															/>
														</td>
														<td>
															<Checkbox
																id='math-alphanumeric-symbols-fraktur-bold'
																isChecked={setSelection.math_alphanumerics.mbf === true}
																isIndeterminate={setSelection.math_alphanumerics.mbf === undefined}
																label='Fraktur bold'
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
																onChange={() => handleSetSelectionToggle('math_alphanumerics', 'mds')}
															/>
														</td>
													</tr>
												</tbody>
											</table>
										</div>
										<div className='view-toggle'>
											<label htmlFor='math-alphanumerics-view-toggle'>
												<input
													id='math-alphanumerics-view-toggle'
													type='checkbox'
													role='switch'
													checked={useMathStylesView}
													onChange={(e) => setUseMathStylesView(e.target.checked)}
												/>
												{' '}
												Math styles table view
											</label>
										</div>
										{useMathStylesView
											? (
												<CharactersMathStylesTable
													entries={selectedCharactersWithSequences.math_alphanumerics}
													selectedCharacters={selectedCharacters.math_alphanumerics}
													{...commonTableAttributes}
												/>
											)
											: (
												<CharactersList
													entries={selectedCharactersWithSequences.math_alphanumerics}
													{...commonTableAttributes}
												/>
											)}
									</CharactersContainer>
								</section>
							</Fragment>
						)}
					</section>
					<SimpleScriptSection
						title='Currency'
						entries={selectedCharactersWithSequences.currency}
						onAddSequence={() => handleOpenPicker({label: 'Currency', key: 'currency'})}
						{...commonTableAttributes}
					/>
					<SimpleScriptSection
						title='Emoji'
						entries={selectedCharactersWithSequences.emoji}
						onAddSequence={() => handleOpenPicker({label: 'Emoji', key: 'emoji'})}
						{...commonTableAttributes}
					/>
					<SimpleScriptSection
						title='Miscellaneous'
						entries={selectedCharactersWithSequences.misc}
						onAddSequence={() => handleOpenPicker({label: 'Miscellaneous', key: 'misc'})}
						{...commonTableAttributes}
					/>
				</section>
			</main>
			{(() => {
				const footer = (
					<Footer
						selectedCount={selectedCount}
						conflictCount={conflictCount}
						onGenerate={handleGenerate}
						onPreview={handlePreview}
						onAddAnyCharacter={() => handleOpenPicker()}
					/>
				);
				return footerRoot ? createPortal(footer, footerRoot) : footer;
			})()}
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
