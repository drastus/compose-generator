import {useEffect, useRef, useState, MouseEvent, ReactNode} from 'react';

interface CharactersContainerProps {
	readonly charactersNumber: number,
	readonly onAddSequence: () => void,
	readonly children: ReactNode,
}

export default function CharactersContainer({charactersNumber, onAddSequence, children}: CharactersContainerProps) {
	const [isExpanded, setIsExpanded] = useState(false);
	const [contentHeight, setContentHeight] = useState(0);
	const contentRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (contentRef.current) {
			setContentHeight(contentRef.current.scrollHeight);
		}
	}, [charactersNumber]);

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
				<span>{charactersNumber} character{charactersNumber === 1 ? '' : 's'}</span>
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
					overflow: isExpanded ? 'unset' : 'hidden',
					transition: 'max-height 0.5s ease-in-out',
				}}
			>
				{children}
			</div>
		</div>
	);
}
