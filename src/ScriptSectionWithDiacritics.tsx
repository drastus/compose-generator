import {ReactNode} from 'react';
import {CharWithSeq, NameEntry} from './types';
import CharactersContainer from './CharactersContainer';
import CharactersList from './CharactersList';
import CharactersDiacriticsTable from './CharactersDiacriticsTable';

type TableSharedProps = {
	readonly allCharacters: CharWithSeq[];
	readonly customSequences: {key: string; seq: string}[];
	readonly onSequenceChange: (_cpKey: string, _seq: string) => void;
	readonly onRemoveSequence: (_cpKey: string) => void;
};

type Props = TableSharedProps & {
	readonly id: string;
	readonly title: string;
	readonly entries: CharWithSeq[];
	readonly selectedCharacters: NameEntry[];
	readonly isDiacriticsView: boolean;
	readonly onDiacriticsViewChange: (_val: boolean) => void;
	readonly onAddSequence: () => void;
	readonly children?: ReactNode;
};

export default function ScriptSectionWithDiacritics({
	id,
	title,
	entries,
	selectedCharacters,
	isDiacriticsView,
	onDiacriticsViewChange,
	onAddSequence,
	children,
	...tableProps
}: Props) {
	if (entries.length === 0) return null;
	const toggleId = `${id}-view-toggle`;
	const conflictCount = entries.filter((e) => e.conflicts && e.conflicts.length > 0).length;
	return (
		<section>
			<CharactersContainer header={title} charactersNumber={entries.length} conflictCount={conflictCount} onAddSequence={onAddSequence}>
				{children}
				<div className='view-toggle'>
					<label htmlFor={toggleId}>
						<input
							id={toggleId}
							type='checkbox'
							role='switch'
							checked={isDiacriticsView}
							onChange={(e) => onDiacriticsViewChange(e.target.checked)}
						/>
						{' '}
						Diacritics table view
					</label>
				</div>
				{isDiacriticsView
					? (
						<CharactersDiacriticsTable
							entries={entries}
							selectedCharacters={selectedCharacters}
							{...tableProps}
						/>
					)
					: (
						<CharactersList
							entries={entries}
							{...tableProps}
						/>
					)}
			</CharactersContainer>
		</section>
	);
}
