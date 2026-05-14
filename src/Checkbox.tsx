import {useEffect, useRef} from 'react';

function Checkbox({
	id,
	isChecked,
	isIndeterminate,
	label,
	description,
	onChange,
	style = {},
}: {
	readonly id: string,
	readonly isChecked: boolean,
	readonly isIndeterminate?: boolean,
	readonly label: string,
	readonly description?: string,
	readonly onChange: () => void,
	readonly style?: CSSProperties,
}) {
	const inputRef = useRef<HTMLInputElement | null>(null);

	useEffect(() => {
		if (inputRef.current) {
			inputRef.current.indeterminate = Boolean(isIndeterminate && !isChecked);
		}
	}, [isIndeterminate, isChecked]);

	return (
		<div style={{marginBottom: '0.5rem', ...style}}>
			<input
				ref={inputRef}
				id={id}
				type='checkbox'
				checked={isChecked}
				onChange={onChange}
			/>
			<label htmlFor={id} style={{cursor: 'pointer'}}>
				{label}
			</label>
			{description && <div className='description'>{description}</div>}
		</div>
	);
}

export default Checkbox;
