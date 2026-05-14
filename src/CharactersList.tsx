import {useState, useRef, forwardRef, useImperativeHandle} from 'react';
import {CharWithSeq} from './types';
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

export type CharactersListHandle = {
	insertIntoFocused: (_char: string) => void;
};

type CharactersListProps = {
	readonly entries: Array<CharWithSeq>,
	readonly allCharacters: Array<CharWithSeq>,
	readonly customSequences: {key: string; seq: string}[],
	readonly onSequenceChange: (_cpKey: string, _sequence: string) => void,
	readonly onRemoveSequence?: (_cpKey: string) => void,
	readonly onConflictDetection?: (_cpKey: string, _seq: string) => void,
	readonly onFocusChange?: (_hasFocus: boolean) => void,
};

const CharactersList = forwardRef<CharactersListHandle, CharactersListProps>(
	({entries, allCharacters, customSequences, onSequenceChange, onRemoveSequence = undefined, onConflictDetection = undefined, onFocusChange = undefined}, ref) => {
		const [focusedInput, setFocusedInput] = useState<string | null>(null);
		const [touchedInputs, setTouchedInputs] = useState<Set<string>>(new Set());
		const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map());
		const focusedInputRef = useRef<string | null>(null);

		const handleInsertChar = (cpKey: string, char: string) => {
			const input = inputRefs.current.get(cpKey);
			if (!input) return;

			const start = input.selectionStart ?? 0;
			const end = input.selectionEnd ?? 0;
			const customSeq = customSequences.find((cs) => cs.key === cpKey)?.seq ?? '';
			const newValue = customSeq.slice(0, start) + char + customSeq.slice(end);
			onSequenceChange(cpKey, newValue);
			setTouchedInputs((prev) => new Set(prev).add(cpKey));

			setTimeout(() => {
				const newPos = start + char.length;
				input.setSelectionRange(newPos, newPos);
				input.focus();
			}, 0);
		};

		useImperativeHandle(ref, () => ({
			insertIntoFocused: (char: string) => {
				const key = focusedInputRef.current;
				if (key) handleInsertChar(key, char);
			},
		}));

		const getConflictTooltip = (conflicts: number[] | undefined) => {
			if (!conflicts || conflicts.length === 0) return null;

			const conflictDetails = conflicts.map((cp) => {
				const entry = allCharacters.find((e) => e.cp === cp);
				if (!entry) return null;
				const key = String(entry.cp);
				const seq = customSequences.find((cs) => cs.key === key)?.seq ?? entry.seq ?? '';
				return {
					cp,
					text: `${formatCodePoint(cp)} (${seq}): ${entry.name}`,
				};
			}).filter((item): item is {cp: number; text: string} => item !== null);

			return conflictDetails;
		};

		const handleFocus = (key: string) => {
			focusedInputRef.current = key;
			setFocusedInput(key);
			onFocusChange?.(true);
		};

		const handleBlur = (key: string) => {
			focusedInputRef.current = null;
			setFocusedInput(null);
			onFocusChange?.(false);
			const currentSeq = inputRefs.current.get(key)?.value ?? '';
			if (currentSeq) onConflictDetection?.(key, currentSeq);
		};

		return (
			<table>
				<thead>
					<tr>
						<th>Code point</th>
						<th>Char</th>
						<th>Sequence</th>
						<th style={{width: '50%'}}>Name</th>
						<th/>
					</tr>
				</thead>
				<tbody>
					{entries.map((e) => {
						const key = String(e.cp);
						const isTouched = touchedInputs.has(key);
						const customSeq = customSequences.find((cs) => cs.key === key)?.seq;
						const displayValue = isTouched ? (customSeq ?? '') : (customSeq ?? e.seq ?? '');
						const hasConflict = e.conflicts && e.conflicts.length > 0;
						const tooltipText = getConflictTooltip(e.conflicts);

						return (
							<tr key={e.cp}>
								<td className='mono'>{formatCodePoint(e.cp)}</td>
								<td className='char'>{codePointChar(e.cp)}</td>
								<td>
									<div className='sequence-input-wrapper'>
										{hasConflict
											? (
												<div className='conflict-tooltip'>
													<input
														ref={(el) => {
															if (el) inputRefs.current.set(key, el);
														}}
														type='text'
														value={displayValue}
														className='key-input conflict-input'
														onChange={(ev) => {
															onSequenceChange(key, ev.target.value);
															setTouchedInputs((prev) => new Set(prev).add(key));
														}}
														onFocus={() => handleFocus(key)}
														onBlur={() => handleBlur(key)}
													/>
													<span className='conflict-tooltip-text'>
														Conflicts with:
														{tooltipText?.map((item) => (
															<div key={item.cp}>{item.text}</div>
														))}
													</span>
												</div>
											)
											: (
												<input
													ref={(el) => {
														if (el) inputRefs.current.set(key, el);
													}}
													type='text'
													value={displayValue}
													className='key-input'
													onChange={(ev) => {
														onSequenceChange(key, ev.target.value);
														setTouchedInputs((prev) => new Set(prev).add(key));
													}}
													onFocus={() => handleFocus(key)}
													onBlur={() => handleBlur(key)}
												/>
											)}
										{!onFocusChange && focusedInput === key && (
											<SequenceToolbar onInsert={(char) => handleInsertChar(key, char)}/>
										)}
									</div>
								</td>
								<td>{e.name}</td>
								<td>
									{onRemoveSequence && (
										<button
											type='button'
											onClick={() => onRemoveSequence(key)}
										>
											×
										</button>
									)}
								</td>
							</tr>
						);
					})}
				</tbody>
			</table>
		);
	},
);

export default CharactersList;
