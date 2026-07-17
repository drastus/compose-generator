import {CharItem} from './utils/buildCategoryTree';
import {GreekPolytonicGrid, GreekPolytonicGridRow} from './utils/greekPolytonicGrid';
import CharGlyph from './CharGlyph';
import SeqDisplay from './SeqDisplay';

type Props = {
	readonly grid: GreekPolytonicGrid<CharItem>,
	readonly isShowingSeqs?: boolean,
	readonly onCharClick: (_cp: number) => void,
};

function extractPolytonicRowBadge(row: GreekPolytonicGridRow<CharItem>, columns: string[]): string | null {
	const plainCols = columns.filter((c) => c.split('|')[1] === '');
	for (const col of [...plainCols, ...columns]) {
		const cell = row.cells.get(col);
		const seq = cell?.lower?.seqs[0] ?? cell?.upper?.seqs[0];
		if (seq && seq.length >= 3) return seq.slice(1, -1);
	}

	return null;
}

function extractPolytonicColBadge(
	colKey: string,
	baseRow: GreekPolytonicGridRow<CharItem> | undefined,
): string | null {
	if (!baseRow) return null;
	const cell = baseRow.cells.get(colKey);
	const seq = cell?.lower?.seqs[0] ?? cell?.upper?.seqs[0];
	return seq && seq.length >= 3 ? seq.slice(1, -1) : null;
}

/**
 * Compact, borderless, header-less glyph table for polytonic Greek letters with more than
 * one diacritic: rows are accents (no-accent row first, then grave/acute/circumflex), columns
 * are vowel+breathing combinations (iota-subscript/diaeresis variants as extra columns),
 * lower/upper stacked per cell.
 */
export default function GreekPolytonicTable({grid, isShowingSeqs = false, onCharClick}: Props) {
	if (grid.rows.length === 0) return null;

	const baseRow = isShowingSeqs ? grid.rows.find((r) => r.accentKey === '') : undefined;

	return (
		<table className='compact-table'>
			{isShowingSeqs && (
				<thead>
					<tr>
						<th className='compact-table-row-badge'/>
						{grid.columns.map((column) => (
							<th key={column} className='compact-table-col-badge'>
								<SeqDisplay seq={extractPolytonicColBadge(column, baseRow) ?? ''}/>
							</th>
						))}
					</tr>
				</thead>
			)}
			<tbody>
				{grid.rows.map((row) => (
					<tr key={row.accentKey || '—'}>
						{isShowingSeqs && (
							<td className='compact-table-row-badge'>
								<SeqDisplay seq={extractPolytonicRowBadge(row, grid.columns) ?? ''}/>
							</td>
						)}
						{grid.columns.map((column) => {
							const cell = row.cells.get(column);
							const tdClassName = !cell?.upper && cell?.lower
								? 'compact-table-cell compact-table-cell--bottom'
								: 'compact-table-cell';
							return (
								<td key={column} className={tdClassName}>
									<div className='compact-table-cell-inner'>
										{cell?.upper && <CharGlyph item={cell.upper} onClick={onCharClick}/>}
										{cell?.lower && <CharGlyph item={cell.lower} onClick={onCharClick}/>}
									</div>
								</td>
							);
						})}
					</tr>
				))}
			</tbody>
		</table>
	);
}
