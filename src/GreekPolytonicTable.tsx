import {CharItem} from './utils/buildCategoryTree';
import {GreekPolytonicGrid} from './utils/greekPolytonicGrid';
import CharGlyph from './CharGlyph';

type Props = {
	readonly grid: GreekPolytonicGrid<CharItem>,
	readonly onCharClick: (_cp: number) => void,
};

/**
 * Compact, borderless, header-less glyph table for polytonic Greek letters with more than
 * one diacritic: rows are accents (no-accent row first, then grave/acute/circumflex), columns
 * are vowel+breathing combinations (iota-subscript/diaeresis variants as extra columns),
 * lower/upper stacked per cell.
 */
export default function GreekPolytonicTable({grid, onCharClick}: Props) {
	if (grid.rows.length === 0) return null;

	return (
		<table className='compact-table'>
			<tbody>
				{grid.rows.map((row) => (
					<tr key={row.accentKey || '—'}>
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
