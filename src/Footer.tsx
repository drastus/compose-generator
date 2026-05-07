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
					type='button'
					className='generate-button secondary'
					onClick={onAddAnyCharacter}
				>
					Add sequence
				</button>
				<button
					type='button'
					className='generate-button secondary'
					onClick={onPreview}
				>
					Preview
				</button>
				<button
					type='button'
					className='generate-button'
					onClick={onGenerate}
				>
					Generate
				</button>
			</div>
		</footer>
	);
}
