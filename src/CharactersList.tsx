import {useState, useRef, forwardRef, useImperativeHandle} from 'react';
import {CharWithSeq} from './types';
import SequenceToolbar from './SequenceToolbar';
import SequenceInput, {SequenceInputHandle} from './SequenceInput';

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
		const inputRefs = useRef<Map<string, SequenceInputHandle>>(new Map());
		const focusedInputRef = useRef<string | null>(null);

		useImperativeHandle(ref, () => ({
			insertIntoFocused: (char: string) => {
				const key = focusedInputRef.current;
				if (key) inputRefs.current.get(key)?.insertChar(char);
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

		const handleBlur = (key: string, currentSeq: string) => {
			focusedInputRef.current = null;
			setFocusedInput(null);
			onFocusChange?.(false);
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
										{/* conflict-tooltip wrapper must always be rendered to prevent remounting SequenceInput on hasConflict changes */}
										<span className='conflict-tooltip'>
											<SequenceInput
												ref={(el) => {
													if (el) inputRefs.current.set(key, el);
												}}
												value={displayValue}
												hasConflict={hasConflict}
												onChange={(next) => {
													onSequenceChange(key, next);
													setTouchedInputs((prev) => new Set(prev).add(key));
												}}
												onFocus={() => handleFocus(key)}
												onBlur={(current) => handleBlur(key, current)}
											/>
											{hasConflict && tooltipText && (
												<span className='conflict-tooltip-text'>
													Conflicts with:
													{tooltipText.map((item) => (
														<div key={item.cp}>{item.text}</div>
													))}
												</span>
											)}
										</span>
										{!onFocusChange && focusedInput === key && (
											<SequenceToolbar onInsert={(char) => inputRefs.current.get(key)?.insertChar(char)}/>
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
