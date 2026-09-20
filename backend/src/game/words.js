/**
 * words.js
 * The starting word list, by theme, in the three languages the game speaks.
 * It is loaded into the database on first boot; from then on the database is
 * what the game reads, so words can be added without a deploy.
 *
 * A room draws only in its own language, and a guess is compared against that
 * one alone. "general" is not a theme of its own at pick time: it draws from
 * every theme, so the words tagged general here are simply the ones that fit
 * nowhere else.
 *
 * Each word may appear only once in the whole list — the database keeps every
 * language column unique.
 */

const WORDS = {
	general: [
		{ pt: 'sol', en: 'sun', es: 'sol' },
		{ pt: 'lua', en: 'moon', es: 'luna' },
		{ pt: 'estrela', en: 'star', es: 'estrella' },
		{ pt: 'árvore', en: 'tree', es: 'árbol' },
		{ pt: 'rio', en: 'river', es: 'río' },
		{ pt: 'montanha', en: 'mountain', es: 'montaña' },
		{ pt: 'nuvem', en: 'cloud', es: 'nube' },
		{ pt: 'fogo', en: 'fire', es: 'fuego' },
		{ pt: 'flor', en: 'flower', es: 'flor' },
		{ pt: 'ponte', en: 'bridge', es: 'puente' },
		{ pt: 'estrada', en: 'road', es: 'carretera' },
		{ pt: 'barco', en: 'boat', es: 'barco' },
		{ pt: 'praia', en: 'beach', es: 'playa' },
		{ pt: 'floresta', en: 'forest', es: 'bosque' },
		{ pt: 'ilha', en: 'island', es: 'isla' },
		{ pt: 'chuva', en: 'rain', es: 'lluvia' },
		{ pt: 'neve', en: 'snow', es: 'nieve' },
		{ pt: 'vulcão', en: 'volcano', es: 'volcán' },
		{ pt: 'deserto', en: 'desert', es: 'desierto' },
		{ pt: 'arco-íris', en: 'rainbow', es: 'arcoíris' },
		{ pt: 'castelo', en: 'castle', es: 'castillo' },
		{ pt: 'foguetão', en: 'rocket', es: 'cohete' },
	],

	objects: [
		{ pt: 'cadeira', en: 'chair', es: 'silla' },
		{ pt: 'mesa', en: 'table', es: 'mesa' },
		{ pt: 'porta', en: 'door', es: 'puerta' },
		{ pt: 'janela', en: 'window', es: 'ventana' },
		{ pt: 'relógio', en: 'clock', es: 'reloj' },
		{ pt: 'chave', en: 'key', es: 'llave' },
		{ pt: 'martelo', en: 'hammer', es: 'martillo' },
		{ pt: 'guarda-chuva', en: 'umbrella', es: 'paraguas' },
		{ pt: 'óculos', en: 'glasses', es: 'gafas' },
		{ pt: 'escada', en: 'ladder', es: 'escalera' },
		{ pt: 'balão', en: 'balloon', es: 'globo' },
		{ pt: 'livro', en: 'book', es: 'libro' },
		{ pt: 'telefone', en: 'phone', es: 'teléfono' },
		{ pt: 'computador', en: 'computer', es: 'ordenador' },
		{ pt: 'tesoura', en: 'scissors', es: 'tijeras' },
		{ pt: 'lápis', en: 'pencil', es: 'lápiz' },
		{ pt: 'garrafa', en: 'bottle', es: 'botella' },
		{ pt: 'cama', en: 'bed', es: 'cama' },
		{ pt: 'espelho', en: 'mirror', es: 'espejo' },
		{ pt: 'bicicleta', en: 'bicycle', es: 'bicicleta' },
		{ pt: 'chapéu', en: 'hat', es: 'sombrero' },
		{ pt: 'vassoura', en: 'broom', es: 'escoba' },
	],

	animals: [
		{ pt: 'gato', en: 'cat', es: 'gato' },
		{ pt: 'cão', en: 'dog', es: 'perro' },
		{ pt: 'cavalo', en: 'horse', es: 'caballo' },
		{ pt: 'elefante', en: 'elephant', es: 'elefante' },
		{ pt: 'leão', en: 'lion', es: 'león' },
		{ pt: 'cobra', en: 'snake', es: 'serpiente' },
		{ pt: 'peixe', en: 'fish', es: 'pez' },
		{ pt: 'pássaro', en: 'bird', es: 'pájaro' },
		{ pt: 'coelho', en: 'rabbit', es: 'conejo' },
		{ pt: 'urso', en: 'bear', es: 'oso' },
		{ pt: 'macaco', en: 'monkey', es: 'mono' },
		{ pt: 'aranha', en: 'spider', es: 'araña' },
		{ pt: 'borboleta', en: 'butterfly', es: 'mariposa' },
		{ pt: 'sapo', en: 'frog', es: 'rana' },
		{ pt: 'baleia', en: 'whale', es: 'ballena' },
		{ pt: 'pato', en: 'duck', es: 'pato' },
		{ pt: 'vaca', en: 'cow', es: 'vaca' },
		{ pt: 'ovelha', en: 'sheep', es: 'oveja' },
		{ pt: 'rato', en: 'mouse', es: 'ratón' },
		{ pt: 'tartaruga', en: 'turtle', es: 'tortuga' },
		{ pt: 'pinguim', en: 'penguin', es: 'pingüino' },
		{ pt: 'girafa', en: 'giraffe', es: 'jirafa' },
		{ pt: 'abelha', en: 'bee', es: 'abeja' },
		{ pt: 'tubarão', en: 'shark', es: 'tiburón' },
		{ pt: 'caracol', en: 'snail', es: 'caracol' },
	],

	food: [
		{ pt: 'pão', en: 'bread', es: 'pan' },
		{ pt: 'queijo', en: 'cheese', es: 'queso' },
		{ pt: 'maçã', en: 'apple', es: 'manzana' },
		{ pt: 'banana', en: 'banana', es: 'plátano' },
		{ pt: 'pizza', en: 'pizza', es: 'pizza' },
		{ pt: 'bolo', en: 'cake', es: 'pastel' },
		{ pt: 'ovo', en: 'egg', es: 'huevo' },
		{ pt: 'leite', en: 'milk', es: 'leche' },
		{ pt: 'café', en: 'coffee', es: 'café' },
		{ pt: 'sopa', en: 'soup', es: 'sopa' },
		{ pt: 'arroz', en: 'rice', es: 'arroz' },
		{ pt: 'salada', en: 'salad', es: 'ensalada' },
		{ pt: 'chocolate', en: 'chocolate', es: 'chocolate' },
		{ pt: 'gelado', en: 'ice cream', es: 'helado' },
		{ pt: 'laranja', en: 'orange', es: 'naranja' },
		{ pt: 'uva', en: 'grape', es: 'uva' },
		{ pt: 'cenoura', en: 'carrot', es: 'zanahoria' },
		{ pt: 'batata', en: 'potato', es: 'patata' },
		{ pt: 'sandes', en: 'sandwich', es: 'bocadillo' },
		{ pt: 'mel', en: 'honey', es: 'miel' },
		{ pt: 'morango', en: 'strawberry', es: 'fresa' },
		{ pt: 'melancia', en: 'watermelon', es: 'sandía' },
		{ pt: 'hamburguer', en: 'burger', es: 'hamburguesa' },
		{ pt: 'bolacha', en: 'biscuit', es: 'galleta' },
		{ pt: 'limão', en: 'lemon', es: 'limón' },
	],

	movies: [
		{ pt: 'titanic', en: 'titanic', es: 'titanic' },
		{ pt: 'avatar', en: 'avatar', es: 'avatar' },
		{ pt: 'matrix', en: 'matrix', es: 'matrix' },
		{ pt: 'shrek', en: 'shrek', es: 'shrek' },
		{ pt: 'batman', en: 'batman', es: 'batman' },
		{ pt: 'superman', en: 'superman', es: 'superman' },
		{ pt: 'tarzan', en: 'tarzan', es: 'tarzán' },
		{ pt: 'hércules', en: 'hercules', es: 'hércules' },
		{ pt: 'mulan', en: 'mulan', es: 'mulán' },
		{ pt: 'bambi', en: 'bambi', es: 'bambi' },
		{ pt: 'drácula', en: 'dracula', es: 'drácula' },
		{ pt: 'gladiador', en: 'gladiator', es: 'gladiador' },
		{ pt: 'alien', en: 'alien', es: 'alien' },
		{ pt: 'coco', en: 'coco', es: 'coco' },
		{ pt: 'ratatui', en: 'ratatouille', es: 'ratatouille' },
		{ pt: 'pinóquio', en: 'pinocchio', es: 'pinocho' },
		{ pt: 'aladino', en: 'aladdin', es: 'aladdín' },
		{ pt: 'dumbo', en: 'dumbo', es: 'dumbo' },
		{ pt: 'rocky', en: 'rocky', es: 'rocky' },
		{ pt: 'frozen', en: 'frozen', es: 'frozen' },
		{ pt: 'nemo', en: 'nemo', es: 'nemo' },
		{ pt: 'zorro', en: 'zorro', es: 'zorro' },
		{ pt: 'godzilla', en: 'godzilla', es: 'godzilla' },
		{ pt: 'psico', en: 'psycho', es: 'psicosis' },
		{ pt: 'star wars', en: 'star wars', es: 'star wars' },
		{ pt: 'harry potter', en: 'harry potter', es: 'harry potter' },
		{ pt: 'king kong', en: 'king kong', es: 'king kong' },
		{ pt: 'parque jurássico', en: 'jurassic park', es: 'parque jurásico' },
		{ pt: 'homem-aranha', en: 'spiderman', es: 'hombre araña' },
	],
};

/**
 * Strips accents and case so that "GATO" and "gâto" both match "gato".
 * Typing a word right should not depend on finding the right key.
 */
function normalise(text)
{
	if (typeof text !== 'string')
		return '';

	return text
		.trim()
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, ''); // the accent marks NFD splits off
}

/**
 * A guess counts only when it is the whole message: "gato" is right,
 * "it must be a gato" is not. It keeps guessing separate from chatting in a
 * single input.
 */
function matchesWord(guess, word)
{
	const cleaned = normalise(guess);
	return cleaned.length > 0 && cleaned === normalise(word);
}

/**
 * Draws one word, skipping the ones already used this game. Once they run out
 * the list starts over rather than leaving a round without a word.
 *
 * Takes the candidates as an argument so it stays free of the database:
 * words.repository.js fetches, this decides.
 */
function pickFrom(candidates, used = [])
{
	if (!Array.isArray(candidates) || candidates.length === 0)
		return null;

	const unused = candidates.filter((word) => !used.includes(word));
	const pool = unused.length > 0 ? unused : candidates;

	return pool[Math.floor(Math.random() * pool.length)];
}

/** Shown to guessers: "_ _ _ _" with the spaces kept visible. */
function maskWord(word)
{
	return word
		.split('')
		.map((character) => (character === ' ' ? ' ' : '_'))
		.join(' ');
}

module.exports = { WORDS, normalise, matchesWord, pickFrom, maskWord };
