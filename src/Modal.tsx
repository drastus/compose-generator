import type {ReactNode} from 'react';
import {createPortal} from 'react-dom';

type ModalProps = {
	readonly isOpen: boolean,
	readonly children: ReactNode,
	readonly title: string,
	readonly onClose: () => void,
};

export default function Modal({
	isOpen, children, title, onClose,
}: ModalProps) {
	if (!isOpen) return null;

	return createPortal(
		<div className='modal-overlay' onClick={onClose}>
			<div className='modal-content' onClick={(e) => e.stopPropagation()}>
				<div className='modal-header'>
					<h3 style={{margin: 0}}>{title}</h3>
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
			</div>
		</div>,
		document.body,
	);
}
