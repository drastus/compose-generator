import {
	modifier, combining, latin, greek, cyrillic, punctuation, emoji, currency, math_operators, math_arrows, math_sub_sup, math_fractions,
} from './names'
import Table from './Table'

export default function App() {
	return (
		<main className="container">
			<h1>Compose Generator</h1>
			<section>
				<h2>Scripts</h2>
				<section>
					<h3>Modifier letters</h3>
					<Table entries={modifier}/>
				</section>
				<section>
					<h3>Combining diacritical marks</h3>
					<Table entries={combining}/>
				</section>
				<section>
					<h3>Latin alphabet</h3>
					<Table entries={latin}/>
				</section>
				<section>
					<h3>Greek alphabet</h3>
					<Table entries={greek}/>
				</section>
				<section>
					<h3>Cyrillic alphabet</h3>
					<Table entries={cyrillic}/>
				</section>
			</section>
			<section>
				<h2>Symbols</h2>
				<section>
					<h3>Punctuation</h3>
					<Table entries={punctuation}/>
				</section>
				<section>
					<h3>Mathematical symbols</h3>
					<section>
						<h4>Operators</h4>
						<Table entries={math_operators}/>
					</section>
					<section>
						<h4>Arrows</h4>
						<Table entries={math_arrows}/>
					</section>
					<section>
						<h4>Subscripts and superscripts</h4>
						<Table entries={math_sub_sup}/>
					</section>
					<section>
						<h4>Fractions</h4>
						<Table entries={math_fractions}/>
					</section>
				</section>
				<section>
					<h3>Currency</h3>
					<Table entries={currency}/>
				</section>
				<section>
					<h3>Emoji</h3>
					<Table entries={emoji}/>
				</section>
			</section>
		</main>
	)
}
