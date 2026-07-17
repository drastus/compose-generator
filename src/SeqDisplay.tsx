import {Fragment} from 'react';
import {specialChars} from './constants/mappings';

const HIGHLIGHTED = new Set([' ', ...specialChars.map((c) => c.label)]);

type Props = {
	readonly seq: string,
};

/** Renders a compose sequence string, giving spaces and non-renderable special characters a tinted background. */
export default function SeqDisplay({seq}: Props) {
	return (
		<Fragment>
			{Array.from(seq).map((char, i) => (
				HIGHLIGHTED.has(char)
					// eslint-disable-next-line react/no-array-index-key
					? <span key={i} className='seq-special-char'>{char}</span>
					: char
			))}
		</Fragment>
	);
}
