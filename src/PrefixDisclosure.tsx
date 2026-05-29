import {Dispatch, Fragment, SetStateAction} from 'react';
import {latinPrefixLetters} from './constants/lists';
import {defaultPrefixes} from './constants/mappings';
import Checkbox from './Checkbox';

type Prefixes = typeof defaultPrefixes;

const casedPrefixOptions = latinPrefixLetters.map((letter) => {
	const upper = letter.toUpperCase();
	return {value: letter, label: `${letter}/${upper}`};
});

const uncasedPrefixOptions = latinPrefixLetters.flatMap((letter) => {
	const upper = letter.toUpperCase();
	return [
		{value: letter, label: letter},
		{value: upper, label: upper},
	];
});

type CasedKey = 'greek' | 'cyrillic';
type SimpleKey = 'dia' | 'comb';

type Props = {
	readonly scriptKey: CasedKey | SimpleKey;
	readonly prefixes: Prefixes;
	readonly setPrefixes: Dispatch<SetStateAction<Prefixes>>;
};

export default function PrefixDisclosure({scriptKey, prefixes, setPrefixes}: Props) {
	const isCased = scriptKey === 'greek' || scriptKey === 'cyrillic';

	return (
		<details className='inline-prefix'>
			<summary>Prefix</summary>
			<div className='inline-prefix-content'>
				{isCased
					? (
						<Fragment>
							<select
								value={prefixes[scriptKey].char}
								onChange={(e) => setPrefixes((prev) => ({
									...prev,
									[scriptKey]: {...prev[scriptKey], char: e.target.value},
								}))}
							>
								{(prefixes[scriptKey].cased ? casedPrefixOptions : uncasedPrefixOptions).map((option) => (
									<option key={`${scriptKey}-${option.value}`} value={option.value}>
										{option.label}
									</option>
								))}
							</select>
							<Checkbox
								id={`${scriptKey}-prefix-cased`}
								isChecked={(prefixes[scriptKey] as {char: string; cased: boolean}).cased}
								label='Cased'
								onChange={() => setPrefixes((prev) => {
									const cur = prev[scriptKey as CasedKey];
									return {
										...prev,
										[scriptKey]: {
											...cur,
											cased: !cur.cased,
											char: cur.cased ? cur.char : cur.char.toLowerCase(),
										},
									};
								})}
							/>
						</Fragment>
					)
					: (
						<input
							type='text'
							className='key-input'
							maxLength={2}
							value={prefixes[scriptKey as SimpleKey].char}
							onChange={(e) => setPrefixes((prev) => ({
								...prev,
								[scriptKey]: {char: e.target.value},
							}))}
						/>
					)}
			</div>
		</details>
	);
}
