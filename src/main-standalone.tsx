import '@picocss/pico/css/pico.indigo.css';
import './index.css';
import React from 'react';
import {createRoot} from 'react-dom/client';
import App from './App';

const root = document.getElementById('root')!;
createRoot(root).render(
	<React.StrictMode>
		<App/>
	</React.StrictMode>,
);
