import {Fragment} from 'react';
import {CharItem} from './utils/buildCategoryTree';
import SeqDisplay from './SeqDisplay';

function formatCodePoint(cp: number): string {
	return 'U+' + cp.toString(16).toUpperCase().padStart(4, '0');
}

function codePointChar(cp: number): string {
	try {
		return String.fromCodePoint(cp);
	} catch {
		return '';
	}
}

type CharGlyphProps = {
	readonly item: CharItem,
	readonly isHighlighted?: boolean,
	readonly isShowingSeqs?: boolean,
	readonly onClick: (_cp: number) => void,
};

export default function CharGlyph({item, isHighlighted = false, isShowingSeqs = false, onClick}: CharGlyphProps) {
	const conflictCount = item.conflicts?.length ?? 0;
	const className = [
		'char-glyph',
		isHighlighted ? 'char-glyph--highlight' : '',
		conflictCount > 0 ? 'char-glyph--conflict' : '',
	].filter(Boolean).join(' ');

	return (
		<span className='char-tooltip'>
			<button
				type='button'
				className={className}
				onClick={() => onClick(item.cp)}
			>
				{codePointChar(item.cp)}
			</button>
			{isShowingSeqs && item.seqs[0] && (
				<span className='seq-badge'><SeqDisplay seq={item.seqs[0]}/></span>
			)}
			<span className='char-tooltip-text'>
				<div className='mono'>{formatCodePoint(item.cp)}</div>
				<div>{item.name}</div>
				<div>
					{item.seqs.length > 0
						? (
							<Fragment>
								{'Sequence: '}
								{item.seqs.map((seq, i) => (
									// eslint-disable-next-line react/no-array-index-key
									<Fragment key={i}>{i > 0 && ', '}<SeqDisplay seq={seq}/></Fragment>
								))}
							</Fragment>
						)
						: 'No sequence'}
				</div>
				{conflictCount > 0 && (
					<div>{conflictCount} {conflictCount === 1 ? 'conflict' : 'conflicts'}</div>
				)}
			</span>
		</span>
	);
}
