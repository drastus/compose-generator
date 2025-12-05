import {useEffect, useRef, useState} from 'react';
import type {NameEntry} from './names';
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

export default function Table({entries}: {readonly entries: NameEntry[]}) {
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
					overflow: 'hidden',
					transition: 'max-height 0.5s ease-in-out',
				}}
			>
				<table>
					<thead>
						<tr>
							<th>Code point</th>
							<th>Char</th>
							<th>Name</th>
						</tr>
					</thead>
					<tbody>
						{entries.map((e) => (
							<tr key={e.cp}>
								<td className='mono'>{formatCodePoint(e.cp)}</td>
								<td className='char'>{codePointChar(e.cp)}</td>
								<td>{buildName(e)}</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}
