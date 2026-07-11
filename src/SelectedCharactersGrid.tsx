import {Fragment, ReactElement} from 'react';
import {CategoryModalTarget, SuperCategory} from './utils/buildCategoryTree';
import CategoryCharList from './CategoryCharList';

const H2 = (EMBEDDED ? 'h3' : 'h2') as 'h2' | 'h3';

type Props = {
	readonly tree: SuperCategory[],
	readonly onCharClick: (_cp: number) => void,
	readonly onLabelClick: (_target: CategoryModalTarget) => void,
};

/**
 * Renders the whole "Selected characters" grid as a single CSS grid so column 3 (the char
 * lists) stays aligned across every supercategory block. Row/column placement is computed
 * explicitly in JS from the already-visibility-filtered tree, so hidden categories (e.g.
 * Combining, Cyrillic) never desync the supercategory row-span.
 */
export default function SelectedCharactersGrid({tree, onCharClick, onLabelClick}: Props) {
	let rowIndex = 0;
	const cells: ReactElement[] = [];

	for (const sup of tree) {
		const visibleCategories = sup.categories.filter((c) => !c.hidden);
		if (visibleCategories.length === 0) continue;

		if (sup.label) {
			const startRow = rowIndex + 1;
			cells.push(
				<div
					key={`${sup.key}-super`}
					className='selected-grid-super-label'
					style={{gridRow: `${startRow} / span ${visibleCategories.length}`, gridColumn: 1}}
				>
					<div
						className='selected-grid-label-sticky'
						onClick={() => onLabelClick({scope: 'super', key: sup.key!, label: sup.label!})}
					>
						{sup.label}
					</div>
				</div>,
			);
		}

		for (const cat of visibleCategories) {
			const row = rowIndex + 1;
			cells.push(
				<div
					key={`${cat.key}-label`}
					className={sup.label ? 'selected-grid-category-label' : 'selected-grid-category-label selected-grid-category-label--standalone'}
					style={{gridRow: row, gridColumn: sup.label ? 2 : '1 / span 2'}}
				>
					<div
						className='selected-grid-label-sticky'
						onClick={() => onLabelClick({scope: 'category', key: cat.key, label: cat.label})}
					>
						{cat.label}
					</div>
				</div>,
			);
			cells.push(
				<div key={`${cat.key}-chars`} className='selected-grid-chars' style={{gridRow: row, gridColumn: 3}}>
					<CategoryCharList category={cat} onCharClick={onCharClick}/>
				</div>,
			);
			rowIndex += 1;
		}
	}

	return (
		<Fragment>
			<H2>Selected characters</H2>
			<div className='selected-grid'>
				{cells}
			</div>
		</Fragment>
	);
}
