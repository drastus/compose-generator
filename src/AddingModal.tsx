import {Fragment, useMemo, useRef, useState} from 'react';
import CharactersList, {CharactersListHandle} from './CharactersList';
import SequenceToolbar from './SequenceToolbar';
import {CharWithSeq} from './types';

type AddingModalProps = {
	readonly entries: CharWithSeq[];
	readonly allCharacters: CharWithSeq[];
	readonly customSequences: {key: string; seq: string}[];
	readonly handleSequenceChange: (_cp: string, _sequence: string) => void;
	readonly handleApplySequences: () => void;
	readonly closeModal: () => void;
	readonly onConflictDetection?: (_cpKey: string, _seq: string) => void;
};

function AddingModal({
	entries,
	allCharacters,
	customSequences,
	handleSequenceChange,
	handleApplySequences,
	closeModal,
	onConflictDetection,
}: AddingModalProps) {
	const hasPendingSequences = useMemo(
		() => {
			if (!entries.length) return false;
			const entrySet = new Set(entries.map((e) => e.cp));
			return customSequences.some((cs) => {
				if (!cs.seq) return false;
				const cp = Number(cs.key);
				return entrySet.has(cp);
			});
		},
		[entries, customSequences],
	);

	const tableRef = useRef<CharactersListHandle>(null);
	const [inputFocused, setInputFocused] = useState(false);

	return (
		<Fragment>
			<div className='modal-add-sequence-table'>
				<CharactersList
					ref={tableRef}
					entries={entries}
					allCharacters={allCharacters}
					customSequences={customSequences}
					onSequenceChange={handleSequenceChange}
					onConflictDetection={onConflictDetection}
					onFocusChange={setInputFocused}
				/>
			</div>
			<div className='modal-add-sequence-footer'>
				<div className={`modal-add-sequence-toolbar${inputFocused ? '' : ' modal-add-sequence-toolbar--hidden'}`}>
					<SequenceToolbar onInsert={(char) => tableRef.current?.insertIntoFocused(char)}/>
				</div>
				<div className='modal-footer-buttons'>
					<button
						className='secondary'
						type='button'
						onClick={() => closeModal()}
					>
						Cancel
					</button>
					<button
						type='button'
						disabled={!hasPendingSequences}
						onClick={handleApplySequences}
					>
						Apply
					</button>
				</div>
			</div>
		</Fragment>
	);
}

export default AddingModal;
