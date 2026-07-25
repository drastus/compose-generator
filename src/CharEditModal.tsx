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
	readonly additionalValues: string[],
	readonly allCharacters: CharWithSeq[],
	readonly cpToChar: Map<number, CharWithSeq>,
	readonly onApply: (_seq: string, _additionalSeqs: string[]) => void,
	readonly onRemove: () => void,
	readonly onCancel: () => void,
};

export default function CharEditModal({char, value, additionalValues, allCharacters, cpToChar, onApply, onRemove, onCancel}: CharEditModalProps) {
	const inputRef = useRef<SequenceInputHandle>(null);
	const additionalRefs = useRef<Array<SequenceInputHandle | null>>([]);
	// Store a getter rather than the handle itself to avoid stale refs after re-renders
	const getActiveHandle = useRef<() => SequenceInputHandle | null>(() => inputRef.current);

	const [pendingValue, setPendingValue] = useState(value);
	const [pendingAdditionalSeqs, setPendingAdditionalSeqs] = useState(additionalValues);
	const [pendingRemove, setPendingRemove] = useState(false);

	const hasChanges = pendingRemove
		|| pendingValue !== value
		|| pendingAdditionalSeqs.length !== additionalValues.length
		|| pendingAdditionalSeqs.some((s, i) => s !== additionalValues[i]);

	const previewConflicts = useMemo(() => {
		if (pendingRemove) return undefined;
		const hasAnySeq = pendingValue || pendingAdditionalSeqs.some(Boolean);
		if (!hasAnySeq) return undefined;
		const previewChars = allCharacters.map((c) => (c.cp === char.cp
			? {
				...c,
				seq: pendingValue || undefined,
				additionalSeqs: pendingAdditionalSeqs.filter(Boolean),
			}
			: c));
		return detectConflicts(previewChars).get(char.cp);
	}, [allCharacters, char.cp, pendingValue, pendingAdditionalSeqs, pendingRemove]);

	const conflictDetails: ConflictDetail[] = (previewConflicts ?? [])
		.map((cp) => {
			const other = cpToChar.get(cp);
			if (!other) return null;
			return {cp, char: codePointChar(cp), seq: other.seq ?? '', name: other.name};
		})
		.filter((item): item is ConflictDetail => item !== null);

	const handleApply = () => {
		if (pendingRemove) {
			const remaining = pendingAdditionalSeqs.filter(Boolean);
			if (remaining.length > 0) {
				onApply(remaining[0], remaining.slice(1));
			} else {
				onRemove();
			}
		} else {
			onApply(pendingValue, pendingAdditionalSeqs.filter(Boolean));
		}
	};

	const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
		if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'BUTTON') {
			e.preventDefault();
			handleApply();
		}
	};

	const hasConflict = Boolean(previewConflicts?.length);

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
					hasConflict={hasConflict}
					ariaLabel='Compose sequence'
					className={pendingRemove ? 'char-edit-sequence-input--removing' : undefined}
					onFocus={() => {
						getActiveHandle.current = () => inputRef.current;
					}}
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
			{pendingAdditionalSeqs.map((seq, i) => (
				// eslint-disable-next-line react/no-array-index-key
				<div key={i} className='char-edit-sequence-row'>
					<SequenceInput
						ref={(r) => {
							additionalRefs.current[i] = r;
						}}
						value={seq}
						hasConflict={hasConflict}
						ariaLabel={`Additional sequence ${i + 1}`}
						onFocus={() => {
							const idx = i;
							getActiveHandle.current = () => additionalRefs.current[idx] ?? null;
						}}
						onChange={(next) => {
							setPendingAdditionalSeqs((prev) => {
								const updated = [...prev];
								updated[i] = next;
								return updated;
							});
						}}
					/>
					<button
						type='button'
						aria-label='Remove additional sequence'
						title='Remove additional sequence'
						className='char-edit-remove-btn'
						onClick={() => {
							setPendingAdditionalSeqs((prev) => prev.filter((_, j) => j !== i));
						}}
					>
						×
					</button>
				</div>
			))}
			<button
				type='button'
				className='char-edit-add-seq-btn'
				onClick={() => {
					setPendingAdditionalSeqs((prev) => [...prev, '']);
				}}
			>
				+ Add sequence
			</button>
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
				<SequenceToolbar onInsert={(ch) => {
					(getActiveHandle.current() ?? inputRef.current)?.insertChar(ch);
				}}/>
			</div>
			<div className='modal-footer-buttons char-edit-modal-footer'>
				<button type='button' className='secondary' onClick={onCancel}>Cancel</button>
				<button type='button' disabled={!hasChanges} onClick={handleApply}>Apply</button>
			</div>
		</div>
	);
}
