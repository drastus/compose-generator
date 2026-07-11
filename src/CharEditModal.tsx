import {KeyboardEvent, useMemo, useRef, useState} from 'react';
import {CharWithSeq} from './types';
import {detectConflicts} from './utils/detectConflicts';
import SequenceInput, {SequenceInputHandle} from './SequenceInput';
import SequenceToolbar from './SequenceToolbar';

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

type ConflictDetail = {
	cp: number,
	char: string,
	seq: string,
	name: string,
};

type CharEditModalProps = {
	readonly char: CharWithSeq,
	readonly value: string,
	readonly allCharacters: CharWithSeq[],
	readonly cpToChar: Map<number, CharWithSeq>,
	readonly onApply: (_seq: string) => void,
	readonly onRemove: () => void,
	readonly onCancel: () => void,
};

export default function CharEditModal({char, value, allCharacters, cpToChar, onApply, onRemove, onCancel}: CharEditModalProps) {
	const inputRef = useRef<SequenceInputHandle>(null);
	const [pendingValue, setPendingValue] = useState(value);
	const [pendingRemove, setPendingRemove] = useState(false);
	const hasChanges = pendingRemove || pendingValue !== value;

	const previewConflicts = useMemo(() => {
		if (pendingRemove || !pendingValue) return undefined;
		const previewChars = allCharacters.map((c) => (c.cp === char.cp ? {...c, seq: pendingValue} : c));
		return detectConflicts(previewChars).get(char.cp);
	}, [allCharacters, char.cp, pendingValue, pendingRemove]);

	const conflictDetails: ConflictDetail[] = (previewConflicts ?? [])
		.map((cp) => {
			const other = cpToChar.get(cp);
			if (!other) return null;
			return {cp, char: codePointChar(cp), seq: other.seq ?? '', name: other.name};
		})
		.filter((item): item is ConflictDetail => item !== null);

	const handleApply = () => {
		if (pendingRemove) {
			onRemove();
		} else {
			onApply(pendingValue);
		}
	};

	const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
		if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'BUTTON') {
			e.preventDefault();
			handleApply();
		}
	};

	return (
		<div className='char-edit-modal' onKeyDown={handleKeyDown}>
			<div className='char-edit-modal-header'>
				<div className='char-edit-modal-glyph'>{codePointChar(char.cp)}</div>
				<div>
					<div className='mono'>{formatCodePoint(char.cp)}</div>
					<div>{char.name}</div>
				</div>
			</div>
			<div className='char-edit-modal-label'>Sequence</div>
			<div className='char-edit-sequence-row'>
				<SequenceInput
					ref={inputRef}
					value={pendingValue}
					hasConflict={Boolean(previewConflicts?.length)}
					ariaLabel='Compose sequence'
					className={pendingRemove ? 'char-edit-sequence-input--removing' : undefined}
					onChange={(next) => {
						setPendingValue(next);
						setPendingRemove(false);
					}}
				/>
				<button
					type='button'
					aria-label='Remove sequence'
					title='Remove sequence'
					className={`char-edit-remove-btn${pendingRemove ? ' char-edit-remove-btn--active' : ''}`}
					onClick={() => setPendingRemove((prev) => !prev)}
				>
					×
				</button>
			</div>
			{conflictDetails.length > 0 && (
				<div className='char-edit-modal-conflicts'>
					Conflicts with:
					{conflictDetails.map((item) => (
						<div key={item.cp}>
							{formatCodePoint(item.cp)} {item.char} ({item.seq}): {item.name}
						</div>
					))}
				</div>
			)}
			<div className='char-edit-modal-toolbar'>
				<SequenceToolbar onInsert={(ch) => inputRef.current?.insertChar(ch)}/>
			</div>
			<div className='modal-footer-buttons char-edit-modal-footer'>
				<button type='button' className='secondary' onClick={onCancel}>Cancel</button>
				<button type='button' disabled={!hasChanges} onClick={handleApply}>Apply</button>
			</div>
		</div>
	);
}
