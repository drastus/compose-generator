import {CharItem} from './utils/buildCategoryTree';
import {DiacriticGrid} from './utils/diacriticGrid';
import CharGlyph from './CharGlyph';

type Props = {
	readonly grid: DiacriticGrid<CharItem>,
	readonly onCharClick: (_cp: number) => void,
};

/**
 * Compact, borderless, header-less glyph table shared by Latin and Greek: rows are
 * diacritics (base row first), columns are base letters, lower/upper stacked per cell.
 */
export default function DiacriticCompactTable({grid, onCharClick}: Props) {
	if (grid.rows.length === 0) return null;

	return (
		<table className='compact-table'>
			<tbody>
				{grid.rows.map((row) => (
					<tr key={row.diacriticKey || '—'}>
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
