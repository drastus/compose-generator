import {CharItem} from './utils/buildCategoryTree';

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
	readonly onClick: (_cp: number) => void,
	readonly isHighlighted?: boolean,
};

export default function CharGlyph({item, onClick, isHighlighted = false}: CharGlyphProps) {
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
			<span className='char-tooltip-text'>
				<div className='mono'>{formatCodePoint(item.cp)}</div>
				<div>{item.name}</div>
				<div>{item.seqs.length > 0 ? `Sequence: ${item.seqs.join(', ')}` : 'No sequence'}</div>
				{conflictCount > 0 && (
					<div>{conflictCount} {conflictCount === 1 ? 'conflict' : 'conflicts'}</div>
				)}
			</span>
		</span>
	);
}
