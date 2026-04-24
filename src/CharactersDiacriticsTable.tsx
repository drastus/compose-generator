import {useState, useRef, useMemo, Fragment} from 'react';
import {CharWithSeq, NameEntry} from './types';
import SequenceToolbar from './SequenceToolbar';
import CharactersTable from './CharactersTable';
import {LL, GL, CL, C} from './constants';

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

type CharactersDiacriticsTableProps = {
	readonly entries: Array<CharWithSeq>,
	readonly allCharacters: Array<CharWithSeq>,
	readonly selectedCharacters: NameEntry[],
	readonly customSequences: {key: string; seq: string}[],
	readonly onSequenceChange: (_cpKey: string, _sequence: string) => void,
	readonly onRemoveSequence?: (_cpKey: string) => void,
};

type DiacriticColumn = {
	name: string,
	key: string,
};

type BaseLetterRow = {
	baseLetter: string,
	variants: Map<string, {lower?: CharWithSeq; upper?: CharWithSeq}>,
};

export default function CharactersDiacriticsTable({
	entries,
	allCharacters,
	selectedCharacters,
	customSequences,
	onSequenceChange,
	onRemoveSequence,
}: CharactersDiacriticsTableProps) {
	const [focusedInput, setFocusedInput] = useState<string | null>(null);
	const [touchedInputs, setTouchedInputs] = useState<Set<string>>(new Set());
	const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map());

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

	// Build the 2D structure
	const {baseLetters, diacritics, unmatchedChars} = useMemo(() => {
		// Extract base letter from character template
		const extractBaseLetter = (entry: CharWithSeq): string | null => {
			const rawChar = selectedCharacters.find((c) => c.cp === entry.cp);
			if (!rawChar) return null;

			const {template} = rawChar;
			if (!template || !Array.isArray(template)) return null;

			// For Latin letters: [LL, C/S, 'LETTER', ...diacritics]
			if (template[0] === LL && template.length >= 3) {
				const letter = template[2];
				if (typeof letter === 'string' && letter.length === 1) {
					return letter.toUpperCase();
				}
			}

			if (template[0] === GL || template[0] === CL) {
				if (template.length >= 3) {
					return template[2];
				}
				if (rawChar.end && typeof rawChar.end === 'string') {
					return rawChar.end;
				}
				return null;
			}

			return null;
		};

		const isCommonAlphabetLetter = (letter: string): boolean => (
			[LL, GL, CL].includes(letter)
		);

		// Extract diacritics from character template
		const extractDiacritics = (entry: CharWithSeq): {diacritics: string[]; diacriticKey: string} => {
			const rawChar = selectedCharacters.find((c) => c.cp === entry.cp);
			if (!rawChar) return {diacritics: [], diacriticKey: ''};

			const {template} = rawChar;
			if (!template || !Array.isArray(template)) return {diacritics: [], diacriticKey: ''};

			if (isCommonAlphabetLetter(template[0]) && template.length >= 3) {
				const diacritics = template.slice(3);
				const diacriticKey = diacritics.length === 0 ? '' : diacritics.join('+');
				return {diacritics, diacriticKey};
			}

			return {diacritics: [], diacriticKey: ''};
		};

		// Determine if character is uppercase
		const isUpperCase = (entry: CharWithSeq): boolean => {
			const rawChar = selectedCharacters.find((c) => c.cp === entry.cp);
			if (!rawChar) return false;

			const {template} = rawChar;
			if (!template || !Array.isArray(template)) return false;

			if (isCommonAlphabetLetter(template[0]) && template.length >= 2) {
				return template[1] === C;
			}

			return false;
		};

		const baseLetterMap = new Map<string, BaseLetterRow>();
		const diacriticSet = new Set<string>();
		const unmatched: CharWithSeq[] = [];

		for (const char of entries) {
			const baseLetter = extractBaseLetter(char);

			if (!baseLetter) {
				unmatched.push(char);
				continue;
			}

			const {diacritics, diacriticKey} = extractDiacritics(char);

			// Only show characters with exactly 0 or 1 diacritic in main table
			if (diacritics.length > 1) {
				unmatched.push(char);
				continue;
			}

			const isUpper = isUpperCase(char);

			if (!baseLetterMap.has(baseLetter)) {
				baseLetterMap.set(baseLetter, {
					baseLetter,
					variants: new Map(),
				});
			}

			const row = baseLetterMap.get(baseLetter)!;

			if (!row.variants.has(diacriticKey)) {
				row.variants.set(diacriticKey, {});
			}

			const variant = row.variants.get(diacriticKey)!;
			if (isUpper) {
				variant.upper = char;
			} else {
				variant.lower = char;
			}

			diacriticSet.add(diacriticKey);
		}

		// Sort diacritics: empty string first, then alphabetically
		const sortedDiacritics = Array.from(diacriticSet).sort((a, b) => {
			if (a === '') return -1;
			if (b === '') return 1;
			return a.localeCompare(b);
		});

		const diacriticColumns: DiacriticColumn[] = sortedDiacritics.map((d) => ({
			name: d === '' ? 'Base' : d,
			key: d,
		}));

		// Sort base letters alphabetically
		const sortedBaseLetters = Array.from(baseLetterMap.values()).sort((a, b) => a.baseLetter.localeCompare(b.baseLetter));

		return {
			baseLetters: sortedBaseLetters,
			diacritics: diacriticColumns,
			unmatchedChars: unmatched,
		};
	}, [entries, selectedCharacters]);

	const renderCell = (char: CharWithSeq | undefined) => {
		if (!char) return null;

		const key = String(char.cp);
		const isTouched = touchedInputs.has(key);
		const customSeq = customSequences.find((cs) => cs.key === key)?.seq;
		const displayValue = isTouched ? (customSeq ?? '') : (customSeq ?? char.seq ?? '');
		const hasConflict = char.conflicts && char.conflicts.length > 0;
		const tooltipText = getConflictTooltip(char.conflicts);

		return (
			<div className='diacritics-cell'>
				<div
					className='diacritics-char'
					title={`${formatCodePoint(char.cp)}: ${char.name}`}
				>
					{codePointChar(char.cp)}
				</div>
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
									className='key-input conflict-input diacritics-input'
									onChange={(ev) => {
										onSequenceChange(key, ev.target.value);
										setTouchedInputs((prev) => new Set(prev).add(key));
									}}
									onFocus={() => setFocusedInput(key)}
									onBlur={() => setFocusedInput(null)}
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
								className='key-input diacritics-input'
								onChange={(ev) => {
									onSequenceChange(key, ev.target.value);
									setTouchedInputs((prev) => new Set(prev).add(key));
								}}
								onFocus={() => setFocusedInput(key)}
								onBlur={() => setFocusedInput(null)}
							/>
						)}
					{focusedInput === key && (
						<SequenceToolbar onInsert={(char) => handleInsertChar(key, char)}/>
					)}
				</div>
			</div>
		);
	};

	return (
		<div>
			<div className='diacritics-table-wrapper'>
				<table className='diacritics-table'>
					<thead>
						<tr>
							<th rowSpan={2}>Letter</th>
							{diacritics.map((dia) => (
								<th key={dia.key} colSpan={2} className='diacritics-header'>
									{dia.name}
								</th>
							))}
						</tr>
						<tr>
							{diacritics.map((dia) => (
								<Fragment key={`${dia.key}-case`}>
									<th className='diacritics-case-header'>lower</th>
									<th className='diacritics-case-header'>upper</th>
								</Fragment>
							))}
						</tr>
					</thead>
					<tbody>
						{baseLetters.map((row) => (
							<tr key={row.baseLetter}>
								<td className='diacritics-base-letter'>
									{row.baseLetter}
								</td>
								{diacritics.map((dia) => {
									const variant = row.variants.get(dia.key);
									return (
										<Fragment key={`${row.baseLetter}-${dia.key}`}>
											<td className='diacritics-cell-td'>
												{renderCell(variant?.lower)}
											</td>
											<td className='diacritics-cell-td'>
												{renderCell(variant?.upper)}
											</td>
										</Fragment>
									);
								})}
							</tr>
						))}
					</tbody>
				</table>
			</div>
			{unmatchedChars.length > 0 && (
				<div style={{marginTop: '2rem'}}>
					<h4>Other characters</h4>
					<CharactersTable
						entries={unmatchedChars}
						allCharacters={allCharacters}
						customSequences={customSequences}
						onSequenceChange={onSequenceChange}
						onRemoveSequence={onRemoveSequence}
					/>
				</div>
			)}
		</div>
	);
}
