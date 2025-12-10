import {Fragment, ReactNode, useState, useCallback, useMemo} from 'react';
import {createPortal} from 'react-dom';
import {characters, LCL, LSL, GCL, GSL, CCL, CSL, NameEntry} from './names';
import Table from './Table';
import {buildName} from './utils/buildName';
import './index.css';

function Modal({isOpen, onClose, children}: {readonly isOpen: boolean; readonly onClose: () => void; readonly children: ReactNode}) {
	if (!isOpen) return null;

	return createPortal(
		<div className='modal-overlay' onClick={onClose}>
			<div className='modal-content' onClick={(e) => e.stopPropagation()}>
				<div className='modal-header'>
					<h3 style={{margin: 0}}>Generated Compose sequences</h3>
					<button
						type='button'
						className='modal-close-button'
						onClick={onClose}
					>
						×
					</button>
				</div>
				<pre className='modal-body'>
					{children}
				</pre>
			</div>
		</div>,
		document.body,
	);
}

function Footer({selectedCount, onGenerate, onPreview}: {readonly selectedCount: number; readonly onGenerate: () => void; readonly onPreview: () => void}) {
	return (
		<footer className='page-footer'>
			<div className='footer-selected-count'>
				{selectedCount} {selectedCount === 1 ? 'character' : 'characters'} selected
			</div>
			<div className='footer-actions'>
				<button
					type='button'
					className='generate-button secondary'
					onClick={onPreview}
				>
					Preview
				</button>
				<button
					type='button'
					className='generate-button'
					onClick={onGenerate}
				>
					Generate
				</button>
			</div>
		</footer>
	);
}

interface DiacriticMark {
	name: string,
	mark: string,
	key: string,
}

const defaultDiacriticMarks: DiacriticMark[] = [
	{name: 'grave', mark: '`', key: '`'},
	{name: 'acute', mark: '´', key: '\''},
	{name: 'circumflex', mark: '^', key: '>'},
	{name: 'tilde', mark: '~', key: '~'},
	{name: 'diaeresis', mark: '¨', key: ':'},
	{name: 'ring above', mark: '˚', key: '0'},
	{name: 'cedilla', mark: '¸', key: '5'},
	{name: 'stroke', mark: '̷', key: '/'},
	{name: 'ogonek', mark: '˛', key: ';'},
	{name: 'breve', mark: '˘', key: '('},
	{name: 'dot above', mark: '˙', key: '.'},
	{name: 'macron', mark: '¯', key: '-'},
	{name: 'caron', mark: 'ˇ', key: '<'},
	{name: 'dot below', mark: '̣', key: '!'},
	{name: 'hook above', mark: '̉', key: '?'},
	{name: 'hook', mark: '̡', key: '6'},
	{name: 'horn', mark: '̛', key: '9'},
	{name: 'inverted breve', mark: '̑', key: ')'},
	{name: 'double grave', mark: '̏', key: '``'},
	{name: 'double acute', mark: '˝', key: '"'},
	{name: 'comma below', mark: '̦', key: ','},
];

const keySymNames: Record<string, string> = {
	' ': 'space',
	'!': 'exclam',
	'"': 'quotedbl',
	'#': 'numbersign',
	$: 'dollar',
	'%': 'percent',
	'&': 'ampersand',
	'\'': 'apostrophe',
	'(': 'parenleft',
	')': 'parenright',
	'*': 'asterisk',
	'+': 'plus',
	',': 'comma',
	'-': 'minus',
	'.': 'period',
	'/': 'slash',
	':': 'colon',
	';': 'semicolon',
	'<': 'less',
	'=': 'equal',
	'>': 'greater',
	'?': 'question',
	'@': 'at',
	'[': 'bracketleft',
	'\\': 'backslash',
	']': 'bracketright',
	'^': 'asciicircum',
	_: 'underscore',
	'`': 'grave',
	'{': 'braceleft',
	'|': 'bar',
	'}': 'braceright',
	'~': 'asciitilde',
};

export default function App() {
	const [showModal, setShowModal] = useState(false);
	const [modalContent, setModalContent] = useState('');
	const [diacriticMarks, setDiacriticMarks] = useState<DiacriticMark[]>(defaultDiacriticMarks);

	const handleDiacriticKeyChange = useCallback((index: number, newKey: string) => {
		setDiacriticMarks((prev) => {
			const updated = [...prev];
			updated[index] = {...updated[index], key: newKey};
			return updated;
		});
	}, []);
	const defaultCharacters = Object.fromEntries(Object.entries(characters).map(([key, entries]) => [
		key,
		entries.filter((entry) => {
			if (key === 'latin') {
				return entry.set === 'base' || entry.set === 'ext';
			}
			if (key === 'greek') {
				return entry.set === 'basic';
			}
			return entry.set === 'base';
		}),
	]));

	const [selectedCharacters, setSelectedCharacters] = useState<typeof defaultCharacters>({...defaultCharacters, cyrillic: []});

	const scriptsGroups: {label: string; keys: (keyof typeof defaultCharacters)[]; description: string}[] = [
		{label: 'Modifier letters', keys: ['modifier'], description: 'Spacing modifier letters used for phonetic/diacritic purposes.'},
		{label: 'Combining diacritical marks', keys: ['combining'], description: 'Non-spacing combining marks to modify preceding characters.'},
		{label: 'Latin alphabet', keys: ['latin'], description: 'Basic and extended Latin letters commonly used in European languages.'},
		{label: 'Greek alphabet', keys: ['greek'], description: 'Greek letters including basic forms.'},
		{label: 'Cyrillic alphabet', keys: ['cyrillic'], description: 'Cyrillic letters used by Slavic and other languages.'},
	];
	const symbolsGroups: {label: string; keys: (keyof typeof defaultCharacters)[]; description: string}[] = [
		{label: 'Punctuation', keys: ['punctuation_separators', 'punctuation'], description: 'Common punctuation including separators (space-like) and general marks.'},
		{label: 'Mathematical symbols', keys: ['math_operators', 'math_number'], description: 'Operators and number-related math symbols.'},
		{label: 'Currency', keys: ['currency'], description: 'Currency signs such as $, €, ¥.'},
		{label: 'Miscellaneous', keys: ['misc'], description: 'Various symbols that do not fit other categories.'},
		{label: 'Format', keys: ['format'], description: 'Invisible formatting and control characters.'},
	];

	const isGroupChecked = (keys: (keyof typeof defaultCharacters)[]) => keys.every((k) => selectedCharacters[k]?.length > 0);
	const hasAnyInGroup = (keys: (keyof typeof defaultCharacters)[]) => keys.some((k) => selectedCharacters[k]?.length > 0);

	const toggleGroup = (keys: (keyof typeof defaultCharacters)[]) => {
		setSelectedCharacters((prev) => {
			const next = {...prev};
			const currentlyChecked = keys.every((k) => prev[k]?.length > 0);
			keys.forEach((k) => {
				next[k] = currentlyChecked ? [] : defaultCharacters[k];
			});
			return next;
		});
	};

	const sequences = useMemo(() => {
		const seqSequences = Object.values(selectedCharacters).flat()
			.filter((char) => char.seq)
			.map((char) => ({...char, name: buildName(char)}));
		const templateSequences = Object.values(selectedCharacters).flat()
			.filter((char) => char.template
				&& char.template.length === 3
				&& [LCL, LSL, GCL, GSL, CCL, CSL].includes(char.template[0])
				&& char.template[1].length === 1)
			.map((char) => {
				const mark = diacriticMarks.find((mark) => mark.name === char.template![2].toLowerCase());
				if (!mark) {
					return char;
				}
				return {
					...char,
					seq: mark.key + (char.template![0] === LSL ? char.template![1].toLowerCase() : char.template![1]),
					name: buildName(char),
				};
			});
		return [...seqSequences, ...templateSequences];
	}, [diacriticMarks, selectedCharacters]);
	console.log('sequences', sequences.filter((s) => !s.seq));

	const formatSequence = (sequence: NameEntry) => {
		const getKeyName = (key: string) => keySymNames[key] || key;

		const keys = sequence.seq!
			.split('')
			.map((k: string) => `<${getKeyName(k)}>`)
			.join(' ');

		const char = String.fromCodePoint(sequence.cp);
		const codePoint = sequence.cp.toString(16).toUpperCase().padStart(4, '0');

		return `<Multi_key> ${keys}	: "${char}"	U${codePoint} # ${sequence.name}`;
	};

	const getGeneratedContent = () => sequences.map(formatSequence).join('\n');

	const handleGenerate = () => {
		const content = getGeneratedContent();
		const blob = new Blob([content], {type: 'text/plain'});
		const url = URL.createObjectURL(blob);

		const a = document.createElement('a');
		a.href = url;
		a.download = 'Compose';
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	};

	const handlePreview = () => {
		setModalContent(getGeneratedContent());
		setShowModal(true);
	};

	const selectedCount = Object.values(selectedCharacters).flat().length;

	return (
		<Fragment>
			<main className='container' style={{paddingBottom: '80px'}}>
				<h1>Compose Generator</h1>
				<section>
					<h2>Scripts</h2>
					<div className='filters' style={{marginBottom: '1rem'}}>
						{scriptsGroups.map((g) => {
							const id = `script-${g.label.toLowerCase().replace(/\s+/g, '-')}`;
							return (
								<div key={g.label} style={{marginBottom: '0.5rem'}}>
									<input
										id={id}
										type='checkbox'
										checked={isGroupChecked(g.keys)}
										onChange={() => toggleGroup(g.keys)}
									/>
									<label htmlFor={id} style={{cursor: 'pointer'}}>
										{g.label}
									</label>
									<div className='description'>{g.description}</div>
								</div>
							);
						})}
					</div>

					<section>
						<h3>Diacritic Marks</h3>
						<table className='diacritic-table'>
							<thead>
								<tr>
									<th>Name</th>
									<th>Mark</th>
									<th>Key</th>
								</tr>
							</thead>
							<tbody>
								{diacriticMarks.map((mark, index) => (
									<tr key={mark.name}>
										<td>{mark.name}</td>
										<td>{mark.mark}</td>
										<td>
											<input
												type='text'
												value={mark.key}
												maxLength={2}
												className='key-input'
												onChange={(e) => handleDiacriticKeyChange(index, e.target.value)}
											/>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</section>
					<section>
						{selectedCharacters.combining.length > 0 && (
							<Fragment>
								<h3>Combining diacritical marks</h3>
								<Table entries={selectedCharacters.combining}/>
							</Fragment>
						)}
					</section>
					<section>
						{selectedCharacters.latin.length > 0 && (
							<Fragment>
								<h3>Latin alphabet</h3>
								<Table entries={selectedCharacters.latin}/>
							</Fragment>
						)}
					</section>
					<section>
						{selectedCharacters.greek.length > 0 && (
							<Fragment>
								<h3>Greek alphabet</h3>
								<Table entries={selectedCharacters.greek}/>
							</Fragment>
						)}
					</section>
					<section>
						{selectedCharacters.cyrillic.length > 0 && (
							<Fragment>
								<h3>Cyrillic alphabet</h3>
								<Table entries={selectedCharacters.cyrillic}/>
							</Fragment>
						)}
					</section>
				</section>
				<section>
					<h2>Symbols</h2>
					<div className='filters' style={{marginBottom: '1rem'}}>
						{symbolsGroups.map((g) => {
							const id = `symbol-${g.label.toLowerCase().replace(/\s+/g, '-')}`;
							return (
								<div key={g.label} style={{marginBottom: '0.5rem'}}>
									<input
										id={id}
										type='checkbox'
										defaultChecked={isGroupChecked(g.keys)}
										onChange={() => toggleGroup(g.keys)}
									/>
									<label htmlFor={id} style={{cursor: 'pointer'}}>
										{g.label}
									</label>
									<div className='description'>{g.description}</div>
								</div>
							);
						})}
					</div>
					<section>
						{hasAnyInGroup(['punctuation_separators', 'punctuation']) && (
							<Fragment>
								<h3>Punctuation</h3>
								<section>
									<h4>Separators</h4>
									<Table entries={selectedCharacters.punctuation_separators}/>
								</section>
								<section>
									<h4>General</h4>
									<Table entries={selectedCharacters.punctuation}/>
								</section>
							</Fragment>
						)}
					</section>
					<section>
						{hasAnyInGroup(['math_operators', 'math_number']) && (
							<Fragment>
								<h3>Mathematical symbols</h3>
								<section>
									<h4>Operators</h4>
									<Table entries={selectedCharacters.math_operators}/>
								</section>
								<section>
									<h4>Numbers</h4>
									<Table entries={selectedCharacters.math_number}/>
								</section>
							</Fragment>
						)}
					</section>
					<section>
						{selectedCharacters.currency.length > 0 && (
							<Fragment>
								<h3>Currency</h3>
								<Table entries={selectedCharacters.currency}/>
							</Fragment>
						)}
					</section>
					<section>
						{selectedCharacters.misc.length > 0 && (
							<Fragment>
								<h3>Miscellaneous</h3>
								<Table entries={selectedCharacters.misc}/>
							</Fragment>
						)}
					</section>
					<section>
						{selectedCharacters.format.length > 0 && (
							<Fragment>
								<h3>Format</h3>
								<Table entries={selectedCharacters.format}/>
							</Fragment>
						)}
					</section>
				</section>
			</main>
			<Footer selectedCount={selectedCount} onGenerate={handleGenerate} onPreview={handlePreview}/>
			<Modal isOpen={showModal} onClose={() => setShowModal(false)}>
				{modalContent}
			</Modal>
		</Fragment>
	);
}
