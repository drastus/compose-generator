export default function Footer({selectedCount, onGenerate, onPreview}: {readonly selectedCount: number; readonly onGenerate: () => void; readonly onPreview: () => void}) {
	return (
		<footer className='page-footer'>
			<div className='footer-selected-count'>
				{selectedCount} {selectedCount === 1 ? 'character' : 'characters'} selected
			</div>
			<div className='footer-actions'>
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
