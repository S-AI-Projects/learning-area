# R18-T018 baseline

Before editing, the inline game script failed during page initialization because
it called the misspelled `addeventListener` method. Its low/high result selector
also omitted the class prefix, and `Math.floor(Math.random()) + 1` always chose
1. The browser check now confirms the game starts without errors, prints a
hostile-looking guess as literal text, creates no image element, and still
supports a deterministic win and reset.
