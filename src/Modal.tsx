import type {ReactNode} from 'react';
import {createPortal} from 'react-dom';
import {useEffect} from 'react';

const H3 = (EMBEDDED ? 'h4' : 'h3') as 'h3' | 'h4';

type ModalProps = {
	readonly isOpen: boolean,
	readonly children: ReactNode,
	readonly title: string,
	readonly onClose: () => void,
	readonly contentClassName?: string,
	readonly footer?: ReactNode,
};

export default function Modal({
	isOpen, children, title, onClose, contentClassName, footer,
}: ModalProps) {
	useEffect(() => {
		if (!isOpen) return;

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				onClose();
			}
		};

		document.addEventListener('keydown', handleKeyDown);
		return () => document.removeEventListener('keydown', handleKeyDown);
	}, [isOpen, onClose]);

	if (!isOpen) return null;

	return createPortal(
		<div className='modal-overlay' onClick={onClose}>
			<div className={`modal-content${contentClassName ? ` ${contentClassName}` : ''}`} onClick={(e) => e.stopPropagation()}>
				<div className='modal-header'>
					<H3 style={{margin: 0}}>{title}</H3>
					<button
						type='button'
						className='modal-close-button'
						onClick={onClose}
					>
						×
					</button>
				</div>
				<div className='modal-body'>
					{children}
				</div>
				{footer && <div className='modal-footer'>{footer}</div>}
			</div>
		</div>,
		document.getElementById('root') ?? document.body,
	);
}
