import {useState, useMemo, useCallback, Fragment} from 'react';
import {assignedRanges} from './data/assigned-ranges';
import {groupsToUnicodeBlocks} from './constants/mappings';
import {NameEntry} from './types';
import {buildName} from './utils/buildName';
import {blockToGroup} from './utils/blockToGroup';

type CharacterPickerModalProps = {
	readonly closeModal: () => void;
	readonly onConfirm: (_cps: number[]) => void;
	readonly restrictToSection?: {label: string; key: string};
	readonly selectedCps: Set<number>;
	readonly availableCharacters: Record<string, NameEntry[]>;
	readonly onAvailableCharactersChange: (_characters: Record<string, NameEntry[]>) => void;
	readonly loadedBlocks: Set<string>;
	readonly onBlockLoaded: (_blockName: string) => void;
	/** When false, hides the section/"All characters" tabs and stays restricted to the section. */
	readonly isAllTabShown?: boolean;
};

function dedupeByCp(entries: NameEntry[]): NameEntry[] {
	const seen = new Set<number>();
	return entries.filter((e) => {
		if (seen.has(e.cp)) return false;
		seen.add(e.cp);
		return true;
	});
}

function isCpInRanges(cp: number, ranges: [number, number][]): boolean {
	let lo = 0;
	let hi = ranges.length - 1;
	while (lo <= hi) {
		const mid = Math.floor((lo + hi) / 2);
		const [start, end] = ranges[mid];
		if (cp < start) {
			hi = mid - 1;
		} else if (cp > end) {
			lo = mid + 1;
		} else {
			return true;
		}
	}
	return false;
}

function CharacterPickerModal({
	closeModal, onConfirm, restrictToSection, selectedCps, availableCharacters,
	onAvailableCharactersChange, loadedBlocks, onBlockLoaded, isAllTabShown = true,
}: CharacterPickerModalProps) {
	const [activeTab, setActiveTab] = useState<'section' | 'all'>('section');
	const [selectedBlock, setSelectedBlock] = useState<string | null>(null);
	const [pickedCps, setPickedCps] = useState<Set<number>>(new Set());
	const [lastPickedCp, setLastPickedCp] = useState<number | null>(null);
	const [loadingBlocks, setLoadingBlocks] = useState<Set<string>>(new Set());

	const cpNameMap = useMemo(() => {
		const map = new Map<number, string>();
		for (const entries of Object.values(availableCharacters)) {
			for (const entry of entries) {
				if (!map.has(entry.cp)) {
					map.set(entry.cp, buildName(entry));
				}
			}
		}
		return map;
	}, [availableCharacters]);

	const lazyLoadBlock = useCallback(async (blockName: string) => {
		if (loadingBlocks.has(blockName) || loadedBlocks.has(blockName)) return;
		const group = blockToGroup(blockName);
		const fileSlug = blockName.replace(/ /g, '_');

		setLoadingBlocks((prev) => new Set(prev).add(blockName));

		try {
			const mod = await import(`./data/names-${fileSlug}.ts`);
			const groupData = (mod as {characters: Record<string, NameEntry[]>}).characters[group] ?? [];
			const merged = dedupeByCp([...(availableCharacters[group] ?? []), ...groupData]);
			onAvailableCharactersChange({...availableCharacters, [group]: merged});
		} catch {
			// Block data not found, silently fail
		} finally {
			onBlockLoaded(blockName);
			setLoadingBlocks((prev) => {
				const next = new Set(prev);
				next.delete(blockName);
				return next;
			});
		}
	}, [availableCharacters, loadingBlocks, loadedBlocks, onAvailableCharactersChange, onBlockLoaded]);

	const sectionBlockNames = useMemo(() => {
		if (!restrictToSection) return null;

		const names = new Set<string>();
		const blocks = groupsToUnicodeBlocks[restrictToSection.key as keyof typeof groupsToUnicodeBlocks] ?? [];
		if (blocks.length > 0) {
			for (const [blockName] of blocks) {
				// Only add block names that actually exist in assignedRanges
				if (assignedRanges.some(([name]) => name === blockName)) {
					names.add(blockName as string);
				}
			}
		} else {
			// For dynamic script sections not in groupsToUnicodeBlocks, match by block prefix
			for (const [blockName] of assignedRanges) {
				if (blockToGroup(blockName) === restrictToSection.key) {
					names.add(blockName);
				}
			}
		}
		return names;
	}, [restrictToSection]);

	const visibleBlocks = useMemo(() => {
		if (activeTab === 'section' && sectionBlockNames) {
			return assignedRanges.filter(([name]) => sectionBlockNames.has(name));
		}
		return assignedRanges.filter(([name]) => !name.includes('Surrogates'));
	}, [activeTab, sectionBlockNames]);

	const blockRanges = useMemo(() => {
		if (!selectedBlock) return [];
		return assignedRanges.find(([name]) => name === selectedBlock)?.[1] ?? [];
	}, [selectedBlock]);

	const gridRows = useMemo(() => {
		if (!blockRanges.length) return [];
		const minCp = blockRanges[0][0];
		const maxCp = blockRanges[blockRanges.length - 1][1];
		const minRow = Math.floor(minCp / 16);
		const maxRow = Math.floor(maxCp / 16);
		const rows: Array<{rowBase: number; cells: Array<{key: number; cp: number | null}>}> = [];
		for (let row = minRow; row <= maxRow; row++) {
			const rowBase = row * 16;
			const cells: Array<{key: number; cp: number | null}> = [];
			for (let col = 0; col < 16; col++) {
				const cp = rowBase + col;
				cells.push({key: cp, cp: isCpInRanges(cp, blockRanges) ? cp : null});
			}
			rows.push({rowBase, cells});
		}
		return rows;
	}, [blockRanges]);

	const handleCellClick = useCallback((cp: number, shiftKey: boolean) => {
		setPickedCps((prev) => {
			const next = new Set(prev);
			if (shiftKey && lastPickedCp !== null) {
				const rangeLow = Math.min(lastPickedCp, cp);
				const rangeHigh = Math.max(lastPickedCp, cp);
				for (const {cells} of gridRows) {
					for (const {cp: cellCp} of cells) {
						if (cellCp !== null && cellCp >= rangeLow && cellCp <= rangeHigh && !selectedCps.has(cellCp)) {
							next.add(cellCp);
						}
					}
				}
			} else if (next.has(cp)) {
				next.delete(cp);
			} else {
				next.add(cp);
			}
			return next;
		});
		setLastPickedCp(cp);
	}, [lastPickedCp, gridRows, selectedCps]);

	const handleConfirm = useCallback(() => {
		const cps = [...pickedCps];
		setPickedCps(new Set());
		setLastPickedCp(null);
		setSelectedBlock(null);
		setActiveTab('section');
		onConfirm(cps);
	}, [pickedCps, onConfirm]);

	const handleClose = useCallback(() => {
		setPickedCps(new Set());
		setLastPickedCp(null);
		setSelectedBlock(null);
		setActiveTab('section');
		closeModal();
	}, [closeModal]);

	const handleSectionTabClick = useCallback(() => {
		setActiveTab('section');
		setSelectedBlock(null);
	}, []);

	const handleAllTabClick = useCallback(() => {
		setActiveTab('all');
		setSelectedBlock(null);
	}, []);

	const handleBlockClick = useCallback(async (blockName: string) => {
		setSelectedBlock(blockName);
		await lazyLoadBlock(blockName);
	}, [lazyLoadBlock]);

	const colHeaders = Array.from({length: 16}, (_, i) => i.toString(16).toUpperCase());

	return (
		<Fragment>
			{restrictToSection && isAllTabShown && (
				<div className='picker-tabs'>
					<button
						type='button'
						className={`picker-tab${activeTab === 'section' ? ' active' : ''}`}
						onClick={handleSectionTabClick}
					>
						{restrictToSection.label}
					</button>
					<button
						type='button'
						className={`picker-tab${activeTab === 'all' ? ' active' : ''}`}
						onClick={handleAllTabClick}
					>
						All characters
					</button>
				</div>
			)}
			<div className='picker-body'>
				<div className='picker-block-list'>
					{visibleBlocks.map(([blockName]) => {
						const isLoading = loadingBlocks.has(blockName);
						return (
							<button
								key={blockName}
								type='button'
								className={`picker-block-item${selectedBlock === blockName ? ' active' : ''}${isLoading ? ' loading' : ''}`}
								disabled={isLoading}
								onClick={() => handleBlockClick(blockName)}
							>
								{blockName}
							</button>
						);
					})}
				</div>
				<div className='picker-grid'>
					{selectedBlock
						? (
							<table className='picker-grid-table'>
								<thead>
									<tr>
										<th className='picker-row-header-cell'/>
										{colHeaders.map((h) => (
											<th key={h} className='picker-col-header-cell'>_{h}</th>
										))}
									</tr>
								</thead>
								<tbody>
									{gridRows.map(({rowBase, cells}) => (
										<tr key={rowBase}>
											<td className='picker-row-header-cell'>
												{Math.floor(rowBase / 16).toString(16).toUpperCase().padStart(3, '0')}_
											</td>
											{cells.map(({key, cp}) => {
												if (cp === null) {
													return <td key={key} className='picker-cell picker-cell-empty'/>;
												}
												const isAlreadySequenced = selectedCps.has(cp);
												const isPicked = pickedCps.has(cp);
												const cpHex = cp.toString(16).toUpperCase().padStart(4, '0');
												const name = cpNameMap.get(cp) ?? '';
												let glyph: string;
												try {
													glyph = String.fromCodePoint(cp);
												} catch {
													glyph = '?';
												}
												return (
													<td
														key={key}
														className={[
															'picker-cell',
															isPicked ? 'picked' : '',
															isAlreadySequenced ? 'already-sequenced' : '',
														].filter(Boolean).join(' ')}
														title={`U+${cpHex} ${name}`}
														onClick={(e) => {
															if (!isAlreadySequenced) handleCellClick(cp, e.shiftKey);
														}}
													>
														{glyph}
													</td>
												);
											})}
										</tr>
									))}
								</tbody>
							</table>
						)
						: (
							<div className='picker-grid-empty'>
								Select a Unicode block from the left panel.
							</div>
						)}
				</div>
			</div>
			<div className='picker-footer'>
				<span className='picker-selected-count'>
					{pickedCps.size > 0 ? `${pickedCps.size} character${pickedCps.size === 1 ? '' : 's'} selected` : ''}
				</span>
				<div className='picker-footer-actions'>
					<button className='secondary' type='button' onClick={handleClose}>Cancel</button>
					<button
						type='button'
						disabled={pickedCps.size === 0}
						onClick={handleConfirm}
					>
						Continue
					</button>
				</div>
			</div>
		</Fragment>
	);
}

export default CharacterPickerModal;
