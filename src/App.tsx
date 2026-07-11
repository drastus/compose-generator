import {Dispatch, Fragment, SetStateAction, useState, useCallback, useMemo, useDeferredValue, useEffect, useRef} from 'react';
import {createPortal} from 'react-dom';
import {CORE_CATEGORIES} from './constants/lists';
import {defaultDiacriticMarks, defaultPrefixes, groupsToUnicodeBlocks} from './constants/mappings';
import {assignedRanges} from './data/assigned-ranges';
import {characters as mainCharacters} from './data/names';
import {usePrefixes} from './hooks/usePrefixes';
import {applySequencesToCharacters} from './utils/applySequences';
import {blockToGroup, groupPrimaryBlock} from './utils/blockToGroup';
import {buildCategoryTree, CategoryModalTarget} from './utils/buildCategoryTree';
import {buildName} from './utils/buildName';
import {detectConflicts} from './utils/detectConflicts';
import {formatSequence} from './utils/formatSequence';
import {CharWithSeq, DiacriticMark, NameEntry} from './types';
import AddingModal from './AddingModal';
import CategoryConfigModal from './CategoryConfigModal';
import CharacterPickerModal from './CharacterPickerModal';
import CharEditModal from './CharEditModal';
import SelectedCharactersGrid from './SelectedCharactersGrid';
import Footer from './Footer';
import Modal from './Modal';
import './index.css';

const H1 = (EMBEDDED ? 'h2' : 'h1') as 'h1' | 'h2';

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
	const [selectedCharacters, setSelectedCharacters] = useState(defaultCharacters);
	const [charModalCp, setCharModalCp] = useState<number | null>(null);
	const [categoryModalTarget, setCategoryModalTarget] = useState<CategoryModalTarget | null>(null);

	const [draftSelectedCharacters, setDraftSelectedCharacters] = useState<Record<string, NameEntry[]> | null>(null);
	const [draftPrefixes, setDraftPrefixes] = useState<typeof defaultPrefixes | null>(null);
	const [draftDiacriticMarks, setDraftDiacriticMarks] = useState<DiacriticMark[] | null>(null);

	const selectedCharactersRef = useRef(selectedCharacters);
	selectedCharactersRef.current = selectedCharacters;
	const prefixesRef = useRef(prefixes);
	prefixesRef.current = prefixes;
	const diacriticMarksRef = useRef(diacriticMarks);
	diacriticMarksRef.current = diacriticMarks;

	const isCategoryModalOpen = categoryModalTarget !== null;
	useEffect(() => {
		if (isCategoryModalOpen) {
			setDraftSelectedCharacters(selectedCharactersRef.current);
			setDraftPrefixes(prefixesRef.current);
			setDraftDiacriticMarks(diacriticMarksRef.current);
		}
	}, [isCategoryModalOpen]);

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

	const draftSetSelection = useMemo(
		() => draftSelectedCharacters ? computeSetSelection(draftSelectedCharacters) : setSelection,
		[computeSetSelection, draftSelectedCharacters, setSelection],
	);

	const buildSetSelectionWithChars = useCallback(<K extends keyof SetSelectionState & keyof typeof mainCharacters>(
		chars: Record<string, NameEntry[]>,
		category: K,
		selection: SetSelectionState[K],
	) => availableCharacters[category].filter((entry) => {
		if (!entry.set || entry.set.length === 0) {
			return chars[category]?.find((c) => c.cp === entry.cp) !== undefined;
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
			return chars[category]?.find((c) => c.cp === entry.cp) !== undefined;
		}
		return false;
	}), [availableCharacters]);

	const handleDraftDiacriticKeyChange = useCallback((index: number, newKey: string) => {
		setDraftDiacriticMarks((prev) => {
			if (!prev) return prev;
			const updated = [...prev];
			updated[index] = {...updated[index], key: newKey};
			return updated;
		});
	}, []);

	const handleDraftMathAlphanumericsSelectAll = useCallback((toEnable: boolean) => {
		setDraftSelectedCharacters((prev) => {
			if (!prev) return prev;
			return {
				...prev,
				math_alphanumerics: toEnable ? (availableCharacters.math_alphanumerics ?? []) : [],
			};
		});
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

	const draftIsGroupChecked = useMemo(() => (
		draftSelectedCharacters
			? (keys: (keyof typeof defaultCharacters)[]) => keys.every((k) => draftSelectedCharacters[k]?.length > 0)
			: isGroupChecked
	), [draftSelectedCharacters, isGroupChecked]);

	const handleOpenPicker = useCallback((section?: {label: string; key: string}) => {
		setPickerSection(section);
		setPickerOpen(true);
	}, []);

	const openCharModal = useCallback((cp: number) => setCharModalCp(cp), []);
	const closeCharModal = useCallback(() => setCharModalCp(null), []);
	const openCategoryModal = useCallback((target: CategoryModalTarget) => setCategoryModalTarget(target), []);

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

	const closeCategoryModal = useCallback(() => {
		setCategoryModalTarget(null);
		setPickerOpen(false);
		closeModal();
	}, [closeModal]);

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

	const handleDraftGroupToggle = (keys: (keyof typeof defaultCharacters)[]) => {
		if (!draftSelectedCharacters) return;
		const next = {...draftSelectedCharacters};
		const currentlyChecked = keys.every((k) => draftSelectedCharacters[k]?.length > 0);
		keys.forEach((k) => {
			if (k === 'latin') {
				next.latin = currentlyChecked ? [] : buildSetSelectionWithChars(draftSelectedCharacters, 'latin', draftSetSelection.latin);
			} else if (k === 'greek') {
				next.greek = currentlyChecked ? [] : buildSetSelectionWithChars(draftSelectedCharacters, 'greek', draftSetSelection.greek);
			} else {
				if (!defaultCharacters[k]) {
					const primaryBlock = groupPrimaryBlock[k];
					const fileSlug = primaryBlock ? primaryBlock.replace(/ /g, '_') : k;
					import(`./data/names-${fileSlug}.ts`).then((mod) => {
						setAvailableCharacters((current) => ({
							...current,
							[k]: mod.characters[k] ?? [],
						}));
						setDraftSelectedCharacters((current) => {
							if (!current) return current;
							return {
								...current,
								[k]: currentlyChecked ? [] : (mod.characters[k] ?? []).filter((entry: NameEntry) => entry.set?.includes('base')),
							};
						});
						if (primaryBlock) {
							setLoadedBlocks((current) => new Set(current).add(primaryBlock));
						}
					});
					return;
				}
				next[k] = currentlyChecked ? [] : (defaultCharacters[k] ?? []);
			}
		});
		setDraftSelectedCharacters(next);
	};

	const handleDraftSetSelectionToggle = <K extends keyof SetSelectionState & keyof typeof defaultCharacters>(
		group: K,
		setKey: keyof SetSelectionState[K],
	) => {
		if (!draftSelectedCharacters) return;
		const groupSelection = draftSetSelection[group];
		const current = groupSelection[setKey];
		const isTurningOn = current === false;
		const setKeyStr = String(setKey);
		const [maybeParentKey] = setKeyStr.split('_');
		const isChildSet = setKeyStr.includes('_') && maybeParentKey in groupSelection;
		const isParentSet = Object.keys(groupSelection).some((key) => key.startsWith(`${setKeyStr}_`));

		setDraftSelectedCharacters((prevChars) => {
			if (!prevChars) return prevChars;
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

			let nextGroupEntries: NameEntry[];
			if (isChildSet || isParentSet) {
				nextGroupEntries = prevGroupEntries.filter((entry) => {
					if (!entry.set || entry.set.length === 0) return true;
					return !entry.set.includes(setKeyStr);
				});
			} else {
				const stillActiveSetKeys = Object.keys(groupSelection).filter((key) => {
					if (key === setKeyStr) return false;
					return groupSelection[key as keyof typeof groupSelection] !== false;
				});
				nextGroupEntries = prevGroupEntries.filter((entry) => {
					if (!entry.set || entry.set.length === 0) return true;
					if (!entry.set.includes(setKeyStr)) return true;
					return entry.set.some((s) => stillActiveSetKeys.includes(s));
				});
			}

			return {
				...prevChars,
				[group]: nextGroupEntries,
			};
		});
	};

	const handleCategoryApply = useCallback(() => {
		if (draftPrefixes) setPrefixes(draftPrefixes);
		if (draftDiacriticMarks) setDiacriticMarks(draftDiacriticMarks);
		if (draftSelectedCharacters) setSelectedCharacters(draftSelectedCharacters);
		closeCategoryModal();
	}, [draftPrefixes, draftDiacriticMarks, draftSelectedCharacters, closeCategoryModal, setPrefixes]);

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

	const cpToChar = useMemo(() => new Map(allCharacters.map((c) => [c.cp, c])), [allCharacters]);

	const categoryTree = useMemo(
		() => buildCategoryTree(selectedCharactersWithSequences, deferredSelectedCharacters),
		[selectedCharactersWithSequences, deferredSelectedCharacters],
	);

	const editingChar = charModalCp === null ? undefined : cpToChar.get(charModalCp);
	const editingCharValue = editingChar
		? (customSequences.find((cs) => cs.key === String(editingChar.cp))?.seq ?? editingChar.seq ?? '')
		: '';

	return (
		<Fragment>
			<main className={EMBEDDED ? 'container embedded' : 'container'} style={{paddingBottom: '80px'}}>
				<H1>Compose Generator</H1>
				<p className='intro'>
					Select the characters you need below, then download a ready-to-use <code>~/.XCompose</code> file.
					The file teaches X11 how to type those characters via the Compose key — for example,
					pressing <kbd>Compose</kbd> <kbd>:</kbd> <kbd>o</kbd> produces <strong>ö</strong>.
				</p>
				<SelectedCharactersGrid
					tree={categoryTree}
					onCharClick={openCharModal}
					onLabelClick={openCategoryModal}
				/>
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
					isAllTabShown={pickerSection === undefined}
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
			<Modal
				isOpen={categoryModalTarget !== null && !pickerOpen && modalMode !== 'addSequence'}
				title={categoryModalTarget?.label ?? ''}
				onClose={closeCategoryModal}
				footer={
					<>
						<button type='button' className='secondary' onClick={closeCategoryModal}>Cancel</button>
						<button type='button' onClick={handleCategoryApply}>Apply</button>
					</>
				}
			>
				{categoryModalTarget && (
					<CategoryConfigModal
						target={categoryModalTarget}
						tree={categoryTree}
						setSelection={draftSetSelection}
						isGroupChecked={draftIsGroupChecked}
						prefixes={draftPrefixes ?? prefixes}
						setPrefixes={setDraftPrefixes as Dispatch<SetStateAction<typeof defaultPrefixes>>}
						diacriticMarks={draftDiacriticMarks ?? diacriticMarks}
						onSetSelectionToggle={handleDraftSetSelectionToggle}
						onGroupToggle={handleDraftGroupToggle}
						onDiacriticKeyChange={handleDraftDiacriticKeyChange}
						onMathAlphanumericsSelectAll={handleDraftMathAlphanumericsSelectAll}
						onAddCharacters={handleOpenPicker}
						onApply={handleCategoryApply}
						onCancel={closeCategoryModal}
					/>
				)}
			</Modal>
			<Modal
				isOpen={charModalCp !== null}
				title='Edit character'
				onClose={closeCharModal}
			>
				{editingChar && (
					<CharEditModal
						char={editingChar}
						value={editingCharValue}
						allCharacters={allCharacters}
						cpToChar={cpToChar}
						onApply={(seq) => {
							handleSequenceChange(String(editingChar.cp), seq);
							closeCharModal();
						}}
						onRemove={() => {
							handleRemoveSequence(String(editingChar.cp));
							closeCharModal();
						}}
						onCancel={closeCharModal}
					/>
				)}
			</Modal>
		</Fragment>
	);
}

export default App;
