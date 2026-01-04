import type {NameEntry} from './types';
import {buildName} from './utils/buildName';

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
	readonly entries: NameEntry[],
	readonly customSequences: {key: string; seq: string}[],
	readonly onSequenceChange: (_cpKey: string, _sequence: string) => void,
	readonly onRemoveSequence?: (_cpKey: string) => void,
}

export default function CharactersTable({entries, customSequences, onSequenceChange, onRemoveSequence}: CharactersTableProps) {
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
					return (
						<tr key={e.cp}>
							<td className='mono'>{formatCodePoint(e.cp)}</td>
							<td className='char'>{codePointChar(e.cp)}</td>
							<td>
								<input
									type='text'
									value={customSeq}
									className='key-input'
									onChange={(ev) => onSequenceChange(key, ev.target.value)}
								/>
							</td>
							<td>{buildName(e)}</td>
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
