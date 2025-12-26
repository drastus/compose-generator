import {useEffect, useRef, useState} from 'react';
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

interface TableProps {
	readonly entries: NameEntry[],
	readonly customSequences: {key: string; seq: string}[],
	readonly onSequenceChange: (_cpKey: string, _sequence: string) => void,
}

export default function Table({entries, customSequences, onSequenceChange}: TableProps) {
	const [isExpanded, setIsExpanded] = useState(false);
	const [contentHeight, setContentHeight] = useState(0);
	const contentRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (contentRef.current) {
			setContentHeight(contentRef.current.scrollHeight);
		}
	}, [entries]);

	const toggleExpand = () => {
		setIsExpanded(!isExpanded);
	};

	return (
		<div className='table-container'>
			<div
				className='table-header'
				style={{overflow: isExpanded ? 'unset' : 'hidden'}}
				onClick={toggleExpand}
			>
				<span style={{transition: 'transform 0.5s', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0)'}}>
					▶
				</span>
				<span>{entries.length} character{entries.length === 1 ? '' : 's'}</span>
			</div>
			<div
				ref={contentRef}
				style={{
					maxHeight: isExpanded ? `${contentHeight}px` : '0',
					overflow: isExpanded ? 'unset' : 'hidden',
					transition: 'max-height 0.5s ease-in-out',
				}}
			>
				<table>
					<thead>
						<tr>
							<th>Code point</th>
							<th>Char</th>
							<th>Sequence</th>
							<th style={{width: '50%'}}>Name</th>
						</tr>
					</thead>
					<tbody>
						{entries.map((e) => {
							const key = String(e.cp);
							const customSeq = customSequences.find((cs) => cs.key === key)?.seq ?? e.seq ?? '';
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
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>
		</div>
	);
}
