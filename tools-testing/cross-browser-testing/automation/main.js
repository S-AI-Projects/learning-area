let array = ['Chris', 'Bob', 'Mark', 'Paul'];
const textRenderingExample = document.querySelector('#text-rendering-example');

// Arrow function syntax
array.forEach((e, i, a) => {
  const elem = document.createElement('p');
  elem.textContent = (i + 1) + '. ' + e;
  document.body.insertBefore(elem, textRenderingExample);
});

const textForm = document.querySelector('#text-rendering-form');
const textInput = document.querySelector('#user-text');
const textOutput = document.querySelector('#text-output');

textForm.addEventListener('submit', (event) => {
  event.preventDefault();
  textOutput.textContent = textInput.value;
});
