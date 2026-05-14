import {useState, useRef, forwardRef, useImperativeHandle, Fragment, useMemo} from 'react';
import {specialChars} from './constants/mappings';

export type SequenceInputHandle = {
	insertChar: (_char: string) => void;
	focus: () => void;
};

type SequenceInputProps = {
	readonly value: string;
	readonly hasConflict?: boolean;
	readonly className?: string;
	readonly ariaLabel?: string;
	readonly onChange: (_next: string) => void;
	readonly onFocus?: () => void;
	readonly onBlur?: (_currentValue: string) => void;
};

const SequenceInput = forwardRef<SequenceInputHandle, SequenceInputProps>(
	({value, hasConflict, className, ariaLabel, onChange, onFocus, onBlur}, ref) => {
		const [caret, setCaret] = useState(value.length);
		const [hasFocus, setHasFocus] = useState(false);
		const rootRef = useRef<HTMLDivElement>(null);

		useImperativeHandle(ref, () => ({
			insertChar: (char: string) => {
				const next = value.slice(0, caret) + char + value.slice(caret);
				setCaret(caret + char.length);
				onChange(next);
			},
			focus: () => rootRef.current?.focus(),
		}));

		const chipItems = useMemo(() => {
			const counts: Record<string, number> = {};
			return [...value].map((ch, i) => {
				const n = counts[ch] ?? 0;
				counts[ch] = n + 1;
				return {ch, idx: i, chipKey: `${ch}-${n}`, isSpecial: specialChars.some((sc) => sc.label === ch)};
			});
		}, [value]);

		const handleKeyDown = (e: {key: string; ctrlKey: boolean; metaKey: boolean; preventDefault: () => void}) => {
			if (e.key === 'Tab') return;

			if (e.key === 'ArrowLeft') {
				e.preventDefault();
				setCaret((c) => Math.max(0, c - 1));
				return;
			}

			if (e.key === 'ArrowRight') {
				e.preventDefault();
				setCaret((c) => Math.min(value.length, c + 1));
				return;
			}

			if (e.key === 'Home') {
				e.preventDefault();
				setCaret(0);
				return;
			}

			if (e.key === 'End') {
				e.preventDefault();
				setCaret(value.length);
				return;
			}

			if (e.key === 'Backspace') {
				e.preventDefault();
				if (caret > 0) {
					const chars = [...value];
					chars.splice(caret - 1, 1);
					setCaret(caret - 1);
					onChange(chars.join(''));
				}

				return;
			}

			if (e.key === 'Delete') {
				e.preventDefault();
				if (caret < value.length) {
					const chars = [...value];
					chars.splice(caret, 1);
					onChange(chars.join(''));
				}

				return;
			}

			if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
				e.preventDefault();
				const next = value.slice(0, caret) + e.key + value.slice(caret);
				setCaret(caret + 1);
				onChange(next);
			}
		};

		const handlePaste = (e: {preventDefault: () => void; clipboardData: {getData: (_type: string) => string}}) => {
			e.preventDefault();
			const text = e.clipboardData.getData('text');
			const chars = [...text].filter((c) => c !== '\n' && c !== '\r' && c !== '\t');
			const cleaned = chars.join('');
			const next = value.slice(0, caret) + cleaned + value.slice(caret);
			setCaret(caret + chars.length);
			onChange(next);
		};

		const handleMouseDown = (e: {target: EventTarget | null; clientX: number}) => {
			const target = e.target as HTMLElement;
			const chip = target.closest('[data-chip-idx]') as HTMLElement | null;
			if (chip) {
				const idx = Number(chip.dataset.chipIdx);
				const rect = chip.getBoundingClientRect();
				const clickedRightHalf = e.clientX - rect.left > rect.width / 2;
				setCaret(clickedRightHalf ? idx + 1 : idx);
			} else {
				setCaret(value.length);
			}
		};

		const handleFocus = () => {
			setHasFocus(true);
			onFocus?.();
		};

		const handleBlur = () => {
			setHasFocus(false);
			onBlur?.(value);
		};

		return (
			<div
				ref={rootRef}
				className={[
					'sequence-input',
					hasFocus && 'sequence-input--focused',
					hasConflict && 'sequence-input--conflict',
					className,
				].filter(Boolean).join(' ')}
				tabIndex={0}
				role='textbox'
				aria-label={ariaLabel ?? 'Compose sequence'}
				aria-multiline='false'
				aria-invalid={hasConflict ? true : undefined}
				onKeyDown={handleKeyDown}
				onPaste={handlePaste}
				onMouseDown={handleMouseDown}
				onFocus={handleFocus}
				onBlur={handleBlur}
			>
				{hasFocus && caret === 0 && <span className='sequence-input__caret' aria-hidden='true'/>}
				{chipItems.map(({ch, idx, chipKey, isSpecial}) => (
					<Fragment key={chipKey}>
						<span
							data-chip-idx={idx}
							className={`sequence-input__chip${isSpecial ? ' sequence-input__chip--special' : ''}`}
						>
							{ch}
						</span>
						{hasFocus && caret === idx + 1 && <span className='sequence-input__caret' aria-hidden='true'/>}
					</Fragment>
				))}
			</div>
		);
	},
);

export default SequenceInput;
