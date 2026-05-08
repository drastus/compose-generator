import {CharWithSeq} from './types';
import CharactersContainer from './CharactersContainer';
import CharactersTable from './CharactersTable';

type TableSharedProps = {
	readonly allCharacters: CharWithSeq[];
	readonly customSequences: {key: string; seq: string}[];
	readonly onSequenceChange: (_cpKey: string, _seq: string) => void;
	readonly onRemoveSequence: (_cpKey: string) => void;
};

type Props = TableSharedProps & {
	readonly title: string;
	readonly entries: CharWithSeq[];
	readonly onAddSequence: () => void;
};

export default function SimpleScriptSection({title, entries, onAddSequence, ...tableProps}: Props) {
	if (entries.length === 0) return null;
	return (
		<section>
			<div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem'}}>
				<h3>{title}</h3>
			</div>
			<CharactersContainer charactersNumber={entries.length} onAddSequence={onAddSequence}>
				<CharactersTable
					entries={entries}
					{...tableProps}
				/>
			</CharactersContainer>
		</section>
	);
}
