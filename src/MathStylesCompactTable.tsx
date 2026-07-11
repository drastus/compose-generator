import {CharItem} from './utils/buildCategoryTree';
import {MathGrid} from './utils/mathStylesGrid';
import CharGlyph from './CharGlyph';

type Props = {
	readonly grid: MathGrid<CharItem>,
	readonly onCharClick: (_cp: number) => void,
};

/**
 * Compact, borderless glyph table for math alphanumerics: columns are base characters, rows
 * are styles (Bold, Italic, …), so the same base character aligns vertically across styles.
 */
export default function MathStylesCompactTable({grid, onCharClick}: Props) {
	if (grid.rows.length === 0) return null;

	return (
		<table className='compact-table'>
			<tbody>
				{grid.rows.map((row) => (
					<tr key={row.style}>
						<td className='compact-table-row-label'>{row.label}</td>
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
