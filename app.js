import Reveal from 'reveal.js';
import Markdown from 'reveal.js/plugin/markdown/markdown.esm.js';
import HighLight from 'reveal.js/plugin/highlight/highlight.js'
import Notes from 'reveal.js/plugin/notes/notes.js'
import "reveal.js/dist/reveal.css"
import "reveal.js/plugin/highlight/monokai.css"


let deck = new Reveal({
   plugins: [ Markdown, HighLight, Notes],
   slideNumber: true
})
deck.initialize();
