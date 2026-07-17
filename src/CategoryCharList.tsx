import {Fragment} from 'react';
import {Category, MULTI_DIACRITIC_LABEL} from './utils/buildCategoryTree';
import CharGlyph from './CharGlyph';
import DiacriticCompactTable from './DiacriticCompactTable';
import GreekPolytonicTable from './GreekPolytonicTable';
import MathStylesCompactTable from './MathStylesCompactTable';

type Props = {
	readonly category: Category,
	readonly isShowingSeqs: boolean,
	readonly onCharClick: (_cp: number) => void,
};

function CharLine({chars, isHighlighted, isShowingSeqs, onCharClick}: {
	readonly chars: Category['chars'],
	readonly isHighlighted?: boolean,
	readonly isShowingSeqs: boolean,
	readonly onCharClick: (_cp: number) => void,
}) {
	if (chars.length === 0) return null;
	return (
		<span className='char-line'>
			{chars.map((c) => <CharGlyph key={c.cp} item={c} isHighlighted={isHighlighted} isShowingSeqs={isShowingSeqs} onClick={onCharClick}/>)}
		</span>
	);
}

export default function CategoryCharList({category, isShowingSeqs, onCharClick}: Props) {
	if (category.kind === 'plain') {
		return <CharLine chars={category.chars} isHighlighted={category.highlight} isShowingSeqs={isShowingSeqs} onCharClick={onCharClick}/>;
	}

	if (category.kind === 'sublists' || category.kind === 'latin' || category.kind === 'diacriticTable' || category.kind === 'mathTable') {
		return (
			<Fragment>
				{category.kind === 'latin' && category.diacriticGrid && (
					<DiacriticCompactTable grid={category.diacriticGrid} isShowingSeqs={isShowingSeqs} mode='latin' onCharClick={onCharClick}/>
				)}
				{category.kind === 'latin' && category.multiDiacriticGrid && (
					<div className='char-sublist char-sublist--stacked'>
						<span className='char-sublist-label'>{MULTI_DIACRITIC_LABEL}</span>
						<DiacriticCompactTable grid={category.multiDiacriticGrid} isShowingSeqs={isShowingSeqs} mode='multiDiacritic' onCharClick={onCharClick}/>
					</div>
				)}
				{category.kind === 'diacriticTable' && category.diacriticGrid && (
					<DiacriticCompactTable grid={category.diacriticGrid} isShowingSeqs={isShowingSeqs} mode='greek' onCharClick={onCharClick}/>
				)}
				{category.kind === 'diacriticTable' && category.polytonicGrid && (
					<div className='char-sublist'>
						<span className='char-sublist-label'>{MULTI_DIACRITIC_LABEL}</span>
						<GreekPolytonicTable grid={category.polytonicGrid} isShowingSeqs={isShowingSeqs} onCharClick={onCharClick}/>
					</div>
				)}
				{category.kind === 'mathTable' && category.mathGrid && (
					<MathStylesCompactTable grid={category.mathGrid} isShowingSeqs={isShowingSeqs} onCharClick={onCharClick}/>
				)}
				{category.sublists?.map((sub, i) => (
					// eslint-disable-next-line react/no-array-index-key
					<div key={i} className='char-sublist'>
						{sub.label && (
							<span className='char-sublist-label'>
								{sub.label}
							</span>
						)}
						<CharLine chars={sub.chars} isHighlighted={sub.style === 'highlight'} isShowingSeqs={isShowingSeqs} onCharClick={onCharClick}/>
					</div>
				))}
			</Fragment>
		);
	}

	return null;
}
