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

export default function Footer({
	selectedCount,
	conflictCount,
	onGenerate,
	onPreview,
	onAddAnyCharacter,
}: {
	readonly selectedCount: number;
	readonly conflictCount: number;
	readonly onGenerate: () => void;
	readonly onPreview: () => void;
	readonly onAddAnyCharacter: () => void;
}) {
	return (
		<footer className='page-footer'>
			<div className='page-footer-content'>
				<div className='footer-selected-count'>
					{selectedCount} {selectedCount === 1 ? 'character' : 'characters'} selected
					{conflictCount > 0 && (
						<span className='footer-conflict-count'>
							{' • '}{conflictCount} {conflictCount === 1 ? 'conflict' : 'conflicts'}
						</span>
					)}
				</div>
				<div className='footer-actions'>
					<button
						aria-label='Add sequence'
						className='footer-icon-btn secondary'
						title='Add sequence'
						type='button'
						onClick={onAddAnyCharacter}
					>
						<FeatherIcon name='plus'/>
					</button>
					<button
						aria-label='Preview'
						className='footer-icon-btn secondary'
						title='Preview'
						type='button'
						onClick={onPreview}
					>
						<FeatherIcon name='eye'/>
					</button>
					<button
						aria-label='Save'
						className='footer-icon-btn'
						title='Save'
						type='button'
						onClick={onGenerate}
					>
						<FeatherIcon name='save'/>
					</button>
				</div>
			</div>
		</footer>
	);
}
