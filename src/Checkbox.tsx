function Checkbox({
	id,
	isChecked,
	label,
	description,
	onChange,
}: {
	readonly id: string,
	readonly isChecked: boolean,
	readonly label: string,
	readonly description: string,
	readonly onChange: () => void,
}) {
	return (
		<div style={{marginBottom: '0.5rem'}}>
			<input
				id={id}
				type='checkbox'
				checked={isChecked}
				onChange={onChange}
			/>
			<label htmlFor={id} style={{paddingLeft: '0.5rem', cursor: 'pointer'}}>
				{label}
			</label>
			<div className='description'>{description}</div>
		</div>
	);
}

export default Checkbox;
