import {CharWithSeq} from './types';
import CharactersContainer from './CharactersContainer';
import CharactersList from './CharactersList';

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
	const conflictCount = entries.filter((e) => e.conflicts && e.conflicts.length > 0).length;
	return (
		<section>
			<CharactersContainer header={title} charactersNumber={entries.length} conflictCount={conflictCount} onAddSequence={onAddSequence}>
				<CharactersList
					entries={entries}
					{...tableProps}
				/>
			</CharactersContainer>
		</section>
	);
}
