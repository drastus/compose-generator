import {CharWithSeq} from './types';

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

interface CharactersTableProps {
	readonly entries: Array<CharWithSeq>,
	readonly allCharacters: Array<CharWithSeq>,
	readonly customSequences: {key: string; seq: string}[],
	readonly onSequenceChange: (_cpKey: string, _sequence: string) => void,
	readonly onRemoveSequence?: (_cpKey: string) => void,
}

export default function CharactersTable({entries, allCharacters, customSequences, onSequenceChange, onRemoveSequence}: CharactersTableProps) {
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

	return (
		<table>
			<thead>
				<tr>
					<th>Code point</th>
					<th>Char</th>
					<th>Sequence</th>
					<th style={{width: '50%'}}>Name</th>
					<th>Remove</th>
				</tr>
			</thead>
			<tbody>
				{entries.map((e) => {
					const key = String(e.cp);
					const customSeq = customSequences.find((cs) => cs.key === key)?.seq ?? e.seq ?? '';
					const hasSequence = Boolean(customSeq);
					const hasConflict = e.conflicts && e.conflicts.length > 0;
					const tooltipText = getConflictTooltip(e.conflicts);

					return (
						<tr key={e.cp}>
							<td className='mono'>{formatCodePoint(e.cp)}</td>
							<td className='char'>{codePointChar(e.cp)}</td>
							<td>
								{hasConflict
									? (
										<div className='conflict-tooltip'>
											<input
												type='text'
												value={customSeq}
												className='key-input conflict-input'
												onChange={(ev) => onSequenceChange(key, ev.target.value)}
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
											type='text'
											value={customSeq}
											className='key-input'
											onChange={(ev) => onSequenceChange(key, ev.target.value)}
										/>
									)}
							</td>
							<td>{e.name}</td>
							<td>
								{hasSequence && onRemoveSequence && (
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
}
