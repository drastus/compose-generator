import {CharItem} from './utils/buildCategoryTree';
import {DiacriticGrid, DiacriticGridRow} from './utils/diacriticGrid';
import CharGlyph from './CharGlyph';
import SeqDisplay from './SeqDisplay';

type DiacriticTableMode = 'latin' | 'greek' | 'multiDiacritic';

type Props = {
	readonly grid: DiacriticGrid<CharItem>,
	readonly isShowingSeqs?: boolean,
	readonly mode?: DiacriticTableMode,
	readonly onCharClick: (_cp: number) => void,
};

function extractRowBadge(row: DiacriticGridRow<CharItem>, mode: DiacriticTableMode): string | null {
	if (row.diacriticKey === '') return null;
	for (const cell of row.cells.values()) {
		const seq = cell.lower?.seqs[0] ?? cell.upper?.seqs[0];
		if (!seq) continue;
		if (mode === 'greek') return seq.length >= 3 ? seq.slice(1, -1) : null;
		if (mode === 'multiDiacritic') return seq.length >= 3 ? seq.slice(0, -2) : null;
		return seq.length >= 2 ? seq.slice(0, -1) : null;
	}

	return null;
}

function charIsNonStandard(item: CharItem | undefined, rowBadge: string | null, mode: DiacriticTableMode): boolean {
	if (!item || !rowBadge || !item.seqs[0]) return false;
	const seq = item.seqs[0];
	if (mode === 'greek') return seq.length < 3 || seq.slice(1, -1) !== rowBadge;
	if (mode === 'multiDiacritic') return seq.length < 3 || seq.slice(0, -2) !== rowBadge;
	return seq.length < 2 || seq.slice(0, -1) !== rowBadge;
}

function extractColBadge(columnKey: string, rows: Array<DiacriticGridRow<CharItem>>): string | null {
	for (const row of rows) {
		const cell = row.cells.get(columnKey);
		const seq = cell?.lower?.seqs[0] ?? cell?.upper?.seqs[0];
		if (seq && seq.length >= 3) return seq[seq.length - 2];
	}

	return null;
}

/**
 * Compact, borderless, header-less glyph table shared by Latin and Greek: rows are
 * diacritics (base row first), columns are base letters, lower/upper stacked per cell.
 */
export default function DiacriticCompactTable({grid, isShowingSeqs = false, mode = 'latin', onCharClick}: Props) {
	if (grid.rows.length === 0) return null;

	return (
		<table className='compact-table'>
			{isShowingSeqs && mode === 'multiDiacritic' && (
				<thead>
					<tr>
						<th className='compact-table-row-badge'/>
						{grid.baseLetters.map((letter) => (
							<th key={letter} className='compact-table-col-badge'>
								<SeqDisplay seq={extractColBadge(letter, grid.rows) ?? ''}/>
							</th>
						))}
					</tr>
				</thead>
			)}
			<tbody>
				{grid.rows.map((row) => {
					const isBaseRow = row.diacriticKey === '';
					const showCharSeqs = isShowingSeqs && mode === 'greek' && isBaseRow;
					const rowBadge = extractRowBadge(row, mode);
					return (
						<tr key={row.diacriticKey || '—'}>
							{isShowingSeqs && (
								<td className='compact-table-row-badge'>
									<SeqDisplay seq={rowBadge ?? ''}/>
								</td>
							)}
							{grid.baseLetters.map((letter) => {
								const cell = row.cells.get(letter);
								const upperNonStd = isShowingSeqs && charIsNonStandard(cell?.upper, rowBadge, mode);
								const lowerNonStd = isShowingSeqs && charIsNonStandard(cell?.lower, rowBadge, mode);
								return (
									<td key={letter} className='compact-table-cell'>
										<div className='compact-table-cell-inner'>
											{cell?.upper
												? <CharGlyph item={cell.upper} isShowingSeqs={showCharSeqs || upperNonStd} isNonStandard={upperNonStd} onClick={onCharClick}/>
												: cell?.lower && <span className='char-glyph compact-table-upper-gap' aria-hidden='true'>{' '}</span>
											}
											{cell?.lower && <CharGlyph item={cell.lower} isShowingSeqs={showCharSeqs || lowerNonStd} isNonStandard={lowerNonStd} onClick={onCharClick}/>}
										</div>
									</td>
								);
							})}
						</tr>
					);
				})}
			</tbody>
		</table>
	);
}
