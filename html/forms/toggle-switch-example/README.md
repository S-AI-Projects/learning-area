# Toggle switch example

## Entry point and setup

Open `html/forms/toggle-switch-example/index.html` in a browser. To serve it
from the repository root, run:

```sh
python3 -m http.server 8000
```

Then visit `http://127.0.0.1:8000/html/forms/toggle-switch-example/`.

## Expected interaction

The checkbox `#power` starts unchecked with **Off** visible and a light gray
track. Checking it (by clicking or by focusing it and pressing Space) exposes
**On** and changes the track to `rgb(255, 170, 0)`. The checkbox remains the
native keyboard-operable control; the label's text updates through CSS.
