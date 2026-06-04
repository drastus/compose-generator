import {useEffect, useRef, useState, MouseEvent, ReactNode} from 'react';
import feather from 'feather-icons';

function FeatherIcon({name}: {readonly name: string}) {
	const icon = feather.icons[name];
	return (
		<svg
			// eslint-disable-next-line react/no-danger
			dangerouslySetInnerHTML={{__html: icon.contents}}
			fill='none'
			height='18'
			stroke='currentColor'
			strokeLinecap='round'
			strokeLinejoin='round'
			strokeWidth='2'
			viewBox='0 0 24 24'
			width='18'
			xmlns='http://www.w3.org/2000/svg'
		/>
	);
}

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
				<span className='char-count'>
					{charactersNumber} character{charactersNumber === 1 ? '' : 's'}
				</span>
				{conflictCount !== undefined && conflictCount > 0 && (
					<span className='footer-conflict-count'>
						{' • '}{conflictCount} {conflictCount === 1 ? 'conflict' : 'conflicts'}
					</span>
				)}
				<button
					type='button'
					className='footer-icon-btn secondary'
					style={{
						marginLeft: 'auto',
						opacity: isExpanded ? 1 : 0,
						pointerEvents: isExpanded ? 'auto' : 'none',
						transition: 'opacity 0.5s ease-in-out',
					}}
					onClick={(event: MouseEvent) => {
						event.stopPropagation();
						onAddSequence();
					}}
				title='Add sequence'
				>
					<FeatherIcon name='plus'/>
				</button>
			</div>
			<div
				ref={contentRef}
				style={{
					maxHeight: isFullyExpanded ? 'none' : isExpanded ? `${contentHeight}px` : '0',
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
