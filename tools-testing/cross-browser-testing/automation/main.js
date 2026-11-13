let array = ['Chris', 'Bob', 'Mark', 'Paul'];
const results = document.querySelector('.results');
const diagram = document.querySelector('.flow-diagram img');
const diagramFallback = document.querySelector('#diagram-fallback');

diagram.addEventListener('error', () => {
  diagramFallback.hidden = false;
});

diagram.addEventListener('load', () => {
  diagramFallback.hidden = true;
});

if (diagram.complete) {
  diagramFallback.hidden = diagram.naturalWidth > 0;
}

// Arrow function syntax
array.forEach((e, i, a) => {
   const elem = document.createElement('p');
   elem.textContent = (i + 1) + '. ' + e;
   results.appendChild(elem);
});
