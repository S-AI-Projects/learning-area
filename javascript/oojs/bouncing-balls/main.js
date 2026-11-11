// setup canvas

const canvas = document.querySelector("canvas");

if (!canvas) {
  throw new Error("The bouncing balls example requires a canvas element.");
}

const ctx = canvas.getContext("2d");

if (!ctx) {
  const fallback = document.createElement("p");
  fallback.id = "canvas-fallback";
  fallback.setAttribute("role", "status");
  fallback.textContent =
    "Your browser does not support the Canvas 2D API. " +
    "The bouncing balls example cannot run in this browser.";

  canvas.replaceWith(fallback);
} else {
  const width = (canvas.width = window.innerWidth);
  const height = (canvas.height = window.innerHeight);

  // function to generate random number

  function random(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  // function to generate random color

  function randomRGB() {
    return `rgb(${random(0, 255)},${random(0, 255)},${random(0, 255)})`;
  }

  // Keep the original helpers available for the example.
  void width;
  void height;
  void random;
  void randomRGB;
}
