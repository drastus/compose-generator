import {Fragment, useMemo} from 'react';
import CharactersTable from './CharactersTable';
import {NameEntry} from './types';

type AddingModalProps = {
	readonly availableCharacters: Record<string, NameEntry[]>;
	readonly selectedCharacters: Record<string, NameEntry[]>;
	readonly modalGroups: string[];
	readonly customSequences: {key: string; seq: string}[];
	readonly handleSequenceChange: (_cp: string, _sequence: string) => void;
	readonly handleApplySequences: () => void;
	readonly closeModal: () => void;
};

function AddingModal({
	availableCharacters,
	selectedCharacters,
	modalGroups,
	customSequences,
	handleSequenceChange,
	handleApplySequences,
	closeModal,
}: AddingModalProps) {
	const modalEntries = useMemo(
		() => {
			const result: NameEntry[] = [];
			modalGroups.forEach((groupKey) => {
				const all = availableCharacters[groupKey] ?? [];
				const selectedSet = new Set((selectedCharacters[groupKey] ?? []).map((e) => e.cp));
				all.forEach((entry) => {
					if (!selectedSet.has(entry.cp)) {
						result.push(entry);
					}
				});
			});
			return result;
		},
		[modalGroups, availableCharacters, selectedCharacters],
	);

	const hasPendingSequences = useMemo(
		() => {
			if (!modalEntries.length) return false;
			const modalSet = new Set(modalEntries.map((e) => e.cp));
			return customSequences.some((cs) => {
				if (!cs.seq) return false;
				const cp = Number(cs.key);
				return modalSet.has(cp);
			});
		},
		[modalEntries, customSequences],
	);

	return (
		<Fragment>
			<div className='modal-add-sequence-table'>
				<CharactersTable
					entries={modalEntries}
					customSequences={customSequences}
					onSequenceChange={handleSequenceChange}
				/>
			</div>
			<div className='modal-add-sequence-footer'>
				<button
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
		</Fragment>
	);
}

export default AddingModal;
