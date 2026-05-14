import {useState, useRef, useMemo, Fragment} from 'react';
import {CharWithSeq, NameEntry} from './types';
import SequenceToolbar from './SequenceToolbar';
import CharactersList from './CharactersList';
import SequenceInput, {SequenceInputHandle} from './SequenceInput';
import {
	C, MB, MBI, MBF, MBS, MDS, MF, MI, MM, MS, MSS, MSSB, MSSBI, MSSI, GREEK_LETTERS, ADDITIONAL_MATH_ALPHANUMERIC_SYMBOLS, ADDITIONAL_GREEK_LETTERS,
} from './constants/strings';

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

type CharactersMathStylesTableProps = {
	readonly entries: Array<CharWithSeq>,
	readonly allCharacters: Array<CharWithSeq>,
	readonly selectedCharacters: NameEntry[],
	readonly customSequences: {key: string; seq: string}[],
	readonly onSequenceChange: (_cpKey: string, _sequence: string) => void,
	readonly onRemoveSequence?: (_cpKey: string) => void,
	readonly onConflictDetection?: (_cpKey: string, _seq: string) => void,
};

type StyleColumn = {
	style: string,
	label: string,
};

type BaseLetterRow = {
	baseLetter: string,
	variants: Map<string, {lower?: CharWithSeq; upper?: CharWithSeq}>,
};

const STYLE_ORDER: StyleColumn[] = [
	{style: MB, label: 'Bold'},
	{style: MI, label: 'Italic'},
	{style: MBI, label: 'Bold Italic'},
	{style: MS, label: 'Script'},
	{style: MBS, label: 'Bold Script'},
	{style: MF, label: 'Fraktur'},
	{style: MBF, label: 'Bold Fraktur'},
	{style: MDS, label: 'Double-Struck'},
	{style: MSS, label: 'Sans-Serif'},
	{style: MSSB, label: 'Sans-Serif Bold'},
	{style: MSSI, label: 'Sans-Serif Italic'},
	{style: MSSBI, label: 'Sans-Serif Bold Italic'},
	{style: MM, label: 'Monospace'},
];

const getLetterType = (letter: string) => {
	if (letter.length === 1 && letter >= '0' && letter <= '9') return 'digit';
	if (letter.length === 1 && letter >= 'A' && letter <= 'Z') return 'latin';
	if (GREEK_LETTERS.includes(letter)) return 'greek';
	if (ADDITIONAL_GREEK_LETTERS.includes(letter)) return 'additional_greek';
	if (ADDITIONAL_MATH_ALPHANUMERIC_SYMBOLS.includes(letter)) return 'additional';
	return 'other';
};

export default function CharactersMathStylesTable({
	entries,
	allCharacters,
	selectedCharacters,
	customSequences,
	onSequenceChange,
	onRemoveSequence,
	onConflictDetection,
}: CharactersMathStylesTableProps) {
	const [focusedInput, setFocusedInput] = useState<string | null>(null);
	const [touchedInputs, setTouchedInputs] = useState<Set<string>>(new Set());
	const inputRefs = useRef<Map<string, SequenceInputHandle>>(new Map());

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

	const {baseLetters, styles, unmatchedChars} = useMemo(() => {
		const baseLetterMap = new Map<string, BaseLetterRow>();
		const presentStyles = new Set<string>();
		const unmatched: CharWithSeq[] = [];

		for (const char of entries) {
			const rawChar = selectedCharacters.find((c) => c.cp === char.cp);
			if (!rawChar?.template) {
				unmatched.push(char);
				continue;
			}

			const {template} = rawChar;
			const style = template[0];
			const caseMarker = template[1];
			const baseLetter = template[2];

			const isLatinLetter = typeof baseLetter === 'string' && baseLetter.length === 1 && baseLetter >= 'A' && baseLetter <= 'Z';
			const isGreekLetter = typeof baseLetter === 'string' && GREEK_LETTERS.includes(baseLetter);
			const isAdditionalGreek = typeof baseLetter === 'string' && ADDITIONAL_GREEK_LETTERS.includes(baseLetter);
			const isAditionalAlphanumeric = typeof baseLetter === 'string' && ADDITIONAL_MATH_ALPHANUMERIC_SYMBOLS.includes(baseLetter);
			const isDigit = typeof baseLetter === 'string' && baseLetter.length === 1 && baseLetter >= '0' && baseLetter <= '9';

			if (!isLatinLetter && !isGreekLetter && !isAdditionalGreek && !isAditionalAlphanumeric && !isDigit) {
				unmatched.push(char);
				continue;
			}

			presentStyles.add(style);
			const isUpper = caseMarker === C;

			if (!baseLetterMap.has(baseLetter)) {
				baseLetterMap.set(baseLetter, {baseLetter, variants: new Map()});
			}

			const row = baseLetterMap.get(baseLetter)!;
			if (!row.variants.has(style)) {
				row.variants.set(style, {});
			}

			const variant = row.variants.get(style)!;
			if (isUpper) {
				variant.upper = char;
			} else {
				variant.lower = char;
			}
		}

		const activeStyles = STYLE_ORDER.filter((s) => presentStyles.has(s.style));

		const compareLetters = (a: string, b: string) => {
			const aType = getLetterType(a);
			const bType = getLetterType(b);

			const typeOrder = {latin: 0, greek: 1, additional_greek: 2, additional: 3, digit: 4, other: 5};
			const typeDiff = typeOrder[aType] - typeOrder[bType];
			if (typeDiff !== 0) return typeDiff;

			// Same type: sort within type
			if (aType === 'digit' || aType === 'latin') return a.localeCompare(b);
			if (aType === 'greek') {
				const aIndex = GREEK_LETTERS.indexOf(a);
				const bIndex = GREEK_LETTERS.indexOf(b);
				return aIndex - bIndex;
			}

			return a.localeCompare(b);
		};

		const sortedBaseLetters = Array.from(baseLetterMap.values()).sort((a, b) => compareLetters(a.baseLetter, b.baseLetter));

		return {baseLetters: sortedBaseLetters, styles: activeStyles, unmatchedChars: unmatched};
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
					{/* conflict-tooltip wrapper must always be rendered to prevent remounting SequenceInput on hasConflict changes */}
					<span className='conflict-tooltip'>
						<SequenceInput
							ref={(el) => {
								if (el) inputRefs.current.set(key, el);
							}}
							value={displayValue}
							hasConflict={hasConflict}
							className='diacritics-input'
							onChange={(next) => {
								onSequenceChange(key, next);
								setTouchedInputs((prev) => new Set(prev).add(key));
							}}
							onFocus={() => setFocusedInput(key)}
							onBlur={(current) => {
								setFocusedInput(null);
								if (current) onConflictDetection?.(key, current);
							}}
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
					{focusedInput === key && (
						<SequenceToolbar onInsert={(ch) => inputRefs.current.get(key)?.insertChar(ch)}/>
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
							{styles.map((s) => (
								<th key={s.style} colSpan={2} className='diacritics-header'>
									{s.label}
								</th>
							))}
						</tr>
						<tr>
							{styles.map((s) => (
								<Fragment key={`${s.style}-case`}>
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
								{styles.map((s) => {
									const variant = row.variants.get(s.style);
									const letterType = getLetterType(row.baseLetter);
									const hasMergedColumns = letterType === 'digit' || letterType === 'additional';
									if (hasMergedColumns) {
										return (
											<td key={`${row.baseLetter}-${s.style}`} colSpan={2} className='diacritics-cell-td'>
												{renderCell(variant?.lower ?? variant?.upper)}
											</td>
										);
									}
									return (
										<Fragment key={`${row.baseLetter}-${s.style}`}>
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
					<CharactersList
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
