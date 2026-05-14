import {useEffect, useRef, useState, MouseEvent, ReactNode} from 'react';

type CharactersContainerProps = {
	readonly header?: string,
	readonly charactersNumber: number,
	readonly conflictCount?: number,
	readonly onAddSequence: () => void,
	readonly children: ReactNode,
};

export default function CharactersContainer({header, charactersNumber, conflictCount, onAddSequence, children}: CharactersContainerProps) {
	const [isExpanded, setIsExpanded] = useState(false);
	const [isFullyExpanded, setIsFullyExpanded] = useState(false);
	const [contentHeight, setContentHeight] = useState(0);
	const contentRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (contentRef.current) {
			setContentHeight(contentRef.current.scrollHeight);
		}
	}, [charactersNumber]);

	const toggleExpand = () => {
		if (isExpanded) {
			setIsFullyExpanded(false);
			setIsExpanded(false);
		} else {
			setIsExpanded(true);
		}
	};

	const handleTransitionEnd = () => {
		if (isExpanded) {
			setIsFullyExpanded(true);
		}
	};

	return (
		<div className='table-container'>
			<div
				className='table-header'
				style={{overflow: isFullyExpanded ? 'unset' : 'hidden'}}
				onClick={toggleExpand}
			>
				<span style={{transition: 'transform 0.5s', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0)'}}>
					▶
				</span>
				{header && <h3 className='container-header'>{header}</h3>}
				<span>
					{charactersNumber} character{charactersNumber === 1 ? '' : 's'}
					{conflictCount !== undefined && conflictCount > 0 && (
						<span className='footer-conflict-count'>
							{' • '}{conflictCount} {conflictCount === 1 ? 'conflict' : 'conflicts'}
						</span>
					)}
				</span>
				<button
					type='button'
					style={{
						marginLeft: 'auto',
						display: 'block',
						opacity: isExpanded ? 1 : 0,
						pointerEvents: isExpanded ? 'auto' : 'none',
						transition: 'opacity 0.5s ease-in-out',
					}}
					onClick={(event: MouseEvent) => {
						event.stopPropagation();
						onAddSequence();
					}}
				>
					Add sequence
				</button>
			</div>
			<div
				ref={contentRef}
				style={{
					maxHeight: isExpanded ? `${contentHeight}px` : '0',
					overflow: isFullyExpanded ? 'unset' : 'hidden',
					transition: 'max-height 0.5s ease-in-out',
				}}
				onTransitionEnd={handleTransitionEnd}
			>
				{children}
			</div>
		</div>
	);
}
