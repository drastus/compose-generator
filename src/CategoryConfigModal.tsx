import {Dispatch, Fragment, SetStateAction, useEffect} from 'react';
import {CORE_CATEGORIES} from './constants/lists';
import {defaultPrefixes, scriptsGroups, symbolsGroups} from './constants/mappings';
import {CategoryModalTarget, SuperCategory} from './utils/buildCategoryTree';
import {DiacriticMark} from './types';
import Checkbox from './Checkbox';
import PrefixDisclosure from './PrefixDisclosure';

type Prefixes = typeof defaultPrefixes;
type SetSelectionState = Record<string, Record<string, boolean | undefined>>;

const groupInfo = new Map([...scriptsGroups, ...symbolsGroups].map((g) => [g.key, g]));

const prefixKeyForGroup = (setGroup: string): 'comb' | 'greek' | 'cyrillic' | 'dia' | 'modifierLetter' | undefined => {
	if (setGroup === 'combining') return 'comb';
	if (setGroup === 'dia') return 'dia';
	if (setGroup === 'modifier') return 'modifierLetter';
	if (setGroup === 'greek' || setGroup === 'cyrillic') return setGroup;
	return undefined;
};

type CategoryConfigModalProps = {
	readonly target: CategoryModalTarget,
	readonly tree: SuperCategory[],
	readonly setSelection: SetSelectionState,
	readonly onSetSelectionToggle: (_group: string, _setKey: string) => void,
	readonly isGroupChecked: (_keys: string[]) => boolean,
	readonly onGroupToggle: (_keys: string[]) => void,
	readonly prefixes: Prefixes,
	readonly setPrefixes: Dispatch<SetStateAction<Prefixes>>,
	readonly diacriticMarks: DiacriticMark[],
	readonly onDiacriticKeyChange: (_index: number, _key: string) => void,
	readonly onMathAlphanumericsSelectAll: (_toEnable: boolean) => void,
	readonly onAddCharacters: (_section: {label: string, key: string}) => void,
	readonly onApply: () => void,
	readonly onCancel: () => void,
};

function DiacriticMarksEditor({diacriticMarks, onDiacriticKeyChange, isYpogegrammeniHidden}: {
	readonly diacriticMarks: DiacriticMark[],
	readonly onDiacriticKeyChange: (_index: number, _key: string) => void,
	readonly isYpogegrammeniHidden: boolean,
}) {
	const filtered = diacriticMarks
		.map((mark, index) => ({mark, index}))
		.filter(({mark}) => mark.name !== 'ypogegrammeni' || !isYpogegrammeniHidden);
	const mid = Math.ceil(filtered.length / 2);
	const columns = [filtered.slice(0, mid), filtered.slice(mid)];

	return (
		<details className='section-disclosure'>
			<summary>Diacritic keys</summary>
			<div className='scripts-layout'>
				{columns.map((col, colIdx) => (

					<div key={colIdx === 0 ? 'col-a' : 'col-b'} className='diacritic-marks-col'>
						{col.map(({mark, index}) => (
							<div key={mark.name} className='diacritic-mark-item'>
								<span className='diacritic-mark-name'>{mark.name}</span>
								<span className='diacritic-mark-char'>{mark.mark}</span>
								<input
									type='text'
									value={mark.key}
									maxLength={2}
									className='key-input'
									onChange={(e) => onDiacriticKeyChange(index, e.target.value)}
								/>
							</div>
						))}
					</div>
				))}
			</div>
		</details>
	);
}

const MATH_STYLE_CHECKBOXES: Array<{setKey: string, label: string}> = [
	{setKey: 'mb', label: 'Bold'},
	{setKey: 'mi', label: 'Italic'},
	{setKey: 'mbi', label: 'Bold italic'},
	{setKey: 'mss', label: 'Sans-serif'},
	{setKey: 'mssb', label: 'Sans-serif bold'},
	{setKey: 'mssi', label: 'Sans-serif italic'},
	{setKey: 'mssbi', label: 'Sans-serif bold italic'},
	{setKey: 'ms', label: 'Script'},
	{setKey: 'mbs', label: 'Script bold'},
	{setKey: 'mf', label: 'Fraktur'},
	{setKey: 'mbf', label: 'Fraktur bold'},
	{setKey: 'mm', label: 'Monospace'},
	{setKey: 'mds', label: 'Double-struck'},
	{setKey: 'mh', label: 'Hebrew letters'},
];

const MATH_PREFIX_FIELDS: Array<{key: keyof Prefixes['math'], label: string}> = [
	{key: 'bold', label: 'Bold'},
	{key: 'italic', label: 'Italic'},
	{key: 'sansSerif', label: 'Sans-serif'},
	{key: 'script', label: 'Script'},
	{key: 'fraktur', label: 'Fraktur'},
	{key: 'monospace', label: 'Monospace'},
	{key: 'doubleStruck', label: 'Double-struck'},
	{key: 'hebrewLetter', label: 'Hebrew letters'},
];

/** The set checkboxes for a group — shown at both supercategory and category scope. */
function GroupCheckboxes({setGroup, setSelection, onSetSelectionToggle, onMathAlphanumericsSelectAll}: {
	readonly setGroup: string,
	readonly setSelection: SetSelectionState,
	readonly onSetSelectionToggle: (_group: string, _setKey: string) => void,
	readonly onMathAlphanumericsSelectAll: (_toEnable: boolean) => void,
}) {
	if (setGroup === 'latin') {
		return (
			<div className='filters'>
				<Checkbox
					id='latin-base' label='Basic Latin'
					description='Base Latin letters commonly used in modern European languages.'
					isChecked={setSelection.latin.base === true}
					isIndeterminate={setSelection.latin.base === undefined}
					onChange={() => onSetSelectionToggle('latin', 'base')}
				/>
				<Checkbox
					id='latin-ext' label='Extended Latin'
					description='Additional Latin letters for extended orthographies.'
					isChecked={setSelection.latin.ext === true}
					isIndeterminate={setSelection.latin.ext === undefined}
					onChange={() => onSetSelectionToggle('latin', 'ext')}
				/>
				<Checkbox
					id='latin-historic' label='Historic Latin'
					description='Historic or less commonly used Latin letters.'
					isChecked={setSelection.latin.historic === true}
					isIndeterminate={setSelection.latin.historic === undefined}
					onChange={() => onSetSelectionToggle('latin', 'historic')}
				/>
			</div>
		);
	}

	if (setGroup === 'greek' || setGroup === 'cyrillic') {
		return (
			<div className='filters'>
				{setGroup === 'greek'
					? (
						<Fragment>
							<Checkbox
								id='greek-basic' label='Basic Greek' description='Basic Greek letters.'
								isChecked={setSelection.greek.basic === true}
								isIndeterminate={setSelection.greek.basic === undefined}
								onChange={() => onSetSelectionToggle('greek', 'basic')}
							/>
							<Checkbox
								id='greek-base' label='Modern Greek extensions'
								description='Additional letters used in modern Greek orthography.'
								isChecked={setSelection.greek.base === true}
								isIndeterminate={setSelection.greek.base === undefined}
								onChange={() => onSetSelectionToggle('greek', 'base')}
							/>
							<Checkbox
								id='greek-historic' label='Historic / polytonic Greek'
								description='Polytonic and historic Greek letter forms.'
								isChecked={setSelection.greek.historic === true}
								isIndeterminate={setSelection.greek.historic === undefined}
								onChange={() => onSetSelectionToggle('greek', 'historic')}
							/>
						</Fragment>
					)
					: (
						<Fragment>
							<Checkbox
								id='cyrillic-base' label='Basic Cyrillic' description='Base Cyrillic letters.'
								isChecked={setSelection.cyrillic.base === true}
								isIndeterminate={setSelection.cyrillic.base === undefined}
								onChange={() => onSetSelectionToggle('cyrillic', 'base')}
							/>
							<Checkbox
								id='cyrillic-ext' label='Extended Cyrillic' description='Extended Cyrillic letters.'
								isChecked={setSelection.cyrillic.ext === true}
								isIndeterminate={setSelection.cyrillic.ext === undefined}
								onChange={() => onSetSelectionToggle('cyrillic', 'ext')}
							/>
						</Fragment>
					)}
			</div>
		);
	}

	if (setGroup === 'math_alphanumerics') {
		const allSelected = MATH_STYLE_CHECKBOXES.every((s) => setSelection.math_alphanumerics[s.setKey] === true);
		return (
			<div className='filters'>
				<button type='button' className='select-all-btn' onClick={() => onMathAlphanumericsSelectAll(!allSelected)}>
					{allSelected ? 'Unselect all' : 'Select all'}
				</button>
				{MATH_STYLE_CHECKBOXES.map((s) => (
					<Checkbox
						key={s.setKey}
						id={`math-alphanumeric-symbols-${s.setKey}`}
						label={s.label}
						isChecked={setSelection.math_alphanumerics[s.setKey] === true}
						isIndeterminate={setSelection.math_alphanumerics[s.setKey] === undefined}
						onChange={() => onSetSelectionToggle('math_alphanumerics', s.setKey)}
					/>
				))}
			</div>
		);
	}

	return null;
}

/** Prefix controls and other non-checkbox settings — shown only at category scope. */
function GroupDetails({setGroup, prefixes, setPrefixes}: {
	readonly setGroup: string,
	readonly prefixes: Prefixes,
	readonly setPrefixes: Dispatch<SetStateAction<Prefixes>>,
}) {
	const prefixKey = prefixKeyForGroup(setGroup);

	if (setGroup === 'math_alphanumerics') {
		return (
			<div className='inline-prefix'>
				<div className='inline-prefix-label'>Prefixes</div>
				<div className='math-prefixes-grid'>
					{MATH_PREFIX_FIELDS.map(({key, label}) => (
						<Fragment key={key}>
							<label htmlFor={`math-prefix-${key}`}>{label}</label>
							<input
								id={`math-prefix-${key}`}
								type='text'
								className='key-input'
								maxLength={4}
								value={prefixes.math[key]}
								onChange={(e) => setPrefixes((prev) => ({...prev, math: {...prev.math, [key]: e.target.value}}))}
							/>
						</Fragment>
					))}
				</div>
			</div>
		);
	}

	if (setGroup === 'currency') {
		return (
			<div className='inline-prefix'>
				<div className='inline-prefix-label'>Prefix</div>
				<div className='inline-prefix-content'>
					<input
						type='text'
						className='key-input'
						maxLength={2}
						value={prefixes.currency.char}
						onChange={(e) => setPrefixes((prev) => ({...prev, currency: {char: e.target.value}}))}
					/>
				</div>
			</div>
		);
	}

	if (prefixKey) {
		return <PrefixDisclosure scriptKey={prefixKey} prefixes={prefixes} setPrefixes={setPrefixes}/>;
	}

	return null;
}

/**
 * Modal opened by clicking a supercategory, category, or subcategory label. At supercategory
 * scope, shows only the master on/off checkbox for each contained category — set-breakdown
 * checkboxes, prefix controls, and "Add characters" all require drilling into a specific
 * category. The "Scripts" supercategory is the one exception: it also shows the diacritic-key
 * editor (mapping marks like acute/grave to compose keys), since that config isn't tied to a
 * single category.
 */
export default function CategoryConfigModal({
	target, tree, setSelection, onSetSelectionToggle, isGroupChecked, onGroupToggle,
	prefixes, setPrefixes, diacriticMarks, onDiacriticKeyChange, onMathAlphanumericsSelectAll, onAddCharacters,
	onApply, onCancel,
}: CategoryConfigModalProps) {
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Enter' && !(e.target instanceof HTMLSelectElement) && !(e.target instanceof HTMLButtonElement)) {
				onApply();
			}
		};
		document.addEventListener('keydown', handleKeyDown);
		return () => document.removeEventListener('keydown', handleKeyDown);
	}, [onApply]);
	const isCategoryScope = target.scope === 'category';
	const isScriptsSuperScope = !isCategoryScope && target.key === 'scripts';
	const sections = isCategoryScope
		? tree.flatMap((s) => s.categories).filter((c) => c.key === target.key)
		: (tree.find((s) => s.key === target.key)?.categories ?? []);

	const uniqueGroups = Array.from(new Set(sections.map((s) => s.setGroup)));
	const showDiacriticMarksEditor = isScriptsSuperScope || (isCategoryScope && sections.some((s) => s.key === 'dia'));

	return (
		<div className='category-config-modal'>
			{showDiacriticMarksEditor && (
				<DiacriticMarksEditor
					diacriticMarks={diacriticMarks}
					isYpogegrammeniHidden={setSelection.greek?.historic === false}
					onDiacriticKeyChange={onDiacriticKeyChange}
				/>
			)}
			{uniqueGroups.map((setGroup) => {
				const info = groupInfo.get(setGroup);
				const label = info?.label ?? sections.filter((s) => s.setGroup === setGroup).map((s) => s.label).join(' & ');
				const showToggle = isCategoryScope ? (CORE_CATEGORIES.includes(setGroup) || setGroup === 'cyrillic') : true;
				return (
					<div
						key={setGroup}
						className={`category-config-section${isCategoryScope ? '' : ' category-config-section--flat'}`}
					>
						{showToggle && (
							<Checkbox
								id={`group-toggle-${setGroup}`}
								label={label}
								description={info?.description}
								isChecked={isGroupChecked([setGroup])}
								onChange={() => onGroupToggle([setGroup])}
							/>
						)}
						{isCategoryScope && (
							<Fragment>
								<GroupCheckboxes
									setGroup={setGroup}
									setSelection={setSelection}
									onSetSelectionToggle={onSetSelectionToggle}
									onMathAlphanumericsSelectAll={onMathAlphanumericsSelectAll}
								/>
								<GroupDetails setGroup={setGroup} prefixes={prefixes} setPrefixes={setPrefixes}/>
								<button
									type='button'
									className='category-config-add-btn'
									onClick={() => onAddCharacters({label, key: setGroup})}
								>
									Add characters…
								</button>
							</Fragment>
						)}
					</div>
				);
			})}
		</div>
	);
}
