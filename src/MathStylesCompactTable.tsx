import {CharItem} from './utils/buildCategoryTree';
import {MathGrid, MathGridRow} from './utils/mathStylesGrid';
import CharGlyph from './CharGlyph';
import SeqDisplay from './SeqDisplay';

type Props = {
	readonly grid: MathGrid<CharItem>,
	readonly isShowingSeqs?: boolean,
	readonly onCharClick: (_cp: number) => void,
};

function extractMathPrefix(row: MathGridRow<CharItem>): string | null {
	for (const cell of row.cells.values()) {
		const seq = cell.lower?.seqs[0] ?? cell.upper?.seqs[0];
		if (seq && seq.length >= 2) return seq.slice(0, -1);
	}

	return null;
}

/**
 * Compact, borderless glyph table for math alphanumerics: columns are base characters, rows
 * are styles (Bold, Italic, …), so the same base character aligns vertically across styles.
 */
export default function MathStylesCompactTable({grid, isShowingSeqs = false, onCharClick}: Props) {
	if (grid.rows.length === 0) return null;

	return (
		<table className='compact-table'>
			<tbody>
				{grid.rows.map((row) => (
					<tr key={row.style}>
						<td className='compact-table-row-label'>{row.label}</td>
						{isShowingSeqs && (
							<td className='compact-table-row-badge'><SeqDisplay seq={extractMathPrefix(row) ?? ''}/></td>
						)}
						{grid.baseLetters.map((letter) => {
							const cell = row.cells.get(letter);
							const tdClassName = !cell?.upper && cell?.lower
								? 'compact-table-cell compact-table-cell--bottom'
								: 'compact-table-cell';
							return (
								<td key={letter} className={tdClassName}>
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
