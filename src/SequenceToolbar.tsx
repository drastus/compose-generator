import {useState} from 'react';
import {specialChars} from './constants/mappings';

type SequenceToolbarProps = {
	readonly onInsert: (_char: string) => void;
};

export default function SequenceToolbar({onInsert}: SequenceToolbarProps) {
	const [hoveredChar, setHoveredChar] = useState<string | null>(null);

	return (
		<div className='sequence-toolbar-container'>
			<div className='sequence-toolbar'>
				{specialChars.map((char) => (
					<button
						key={char.label}
						type='button'
						className='sequence-toolbar-button'
						onMouseDown={(e) => {
							e.preventDefault();
							onInsert(char.label);
						}}
						onMouseEnter={() => setHoveredChar(char.name)}
						onMouseLeave={() => setHoveredChar(null)}
					>
						{char.label}
					</button>
				))}
			</div>
			<div className='sequence-toolbar-tooltip'>
				{hoveredChar ?? 'Non-renderable characters'}
			</div>
		</div>
	);
}
